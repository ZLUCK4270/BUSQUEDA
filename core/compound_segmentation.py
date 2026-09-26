import cv2
import numpy as np
import threading
from PIL import Image
from ultralytics import YOLO
from rembg import remove, new_session
from fastapi.concurrency import run_in_threadpool

class VisionSingleton:
    """Patrón Singleton Thread-Safe para inicializar modelos de IA.
    
    Asegura que los pesos pesados de YOLOv8 y Rembg se carguen en memoria RAM/VRAM
    una única vez y se acceda a ellos de forma segura en un entorno concurrente (FastAPI).
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(VisionSingleton, cls).__new__(cls)
                cls._instance._init_models()
        return cls._instance

    def _init_models(self):
        print("Cargando modelo YOLOv8-seg (Ultralytics)...")
        # YOLO de segmentación. Descargará los pesos la primera vez si no existen.
        self.yolo_model = YOLO("yolov8n-seg.pt")
        
        print("Cargando modelo Rembg (isnet-general-use)...")
        self.rembg_session = new_session("isnet-general-use")


class CompoundSegmentationPipeline:
    """Pipeline avanzado de segmentación de imágenes por composición de máscaras.
    
    Este pipeline soluciona el problema de los falsos negativos de Rembg al enfrentar
    accesorios camuflados (ej. pelota oscura sobre fondo espacial). Extrae los contornos
    perfectos de la ropa con Rembg y los une vectorialmente con los polígonos de objetos 
    secundarios detectados semánticamente por YOLOv8.
    """
    
    def __init__(self):
        self.models = VisionSingleton()

    async def process_image_async(self, image_bytes: bytes) -> Image.Image:
        """Punto de entrada asíncrono para el procesamiento.
        
        Delega el procesamiento intensivo por CPU/GPU al threadpool nativo de FastAPI
        para no bloquear el Event Loop.

        Args:
            image_bytes (bytes): Flujo binario de la imagen enviada por el cliente.

        Returns:
            Image.Image: La imagen final recortada sobre un lienzo blanco puro.
            
        Raises:
            ValueError: Si los bytes no pueden decodificarse en una imagen válida.
        """
        return await run_in_threadpool(self._process_image_sync, image_bytes)

    def _process_image_sync(self, image_bytes: bytes) -> Image.Image:
        """Lógica síncrona del pipeline de Fusión de Máscaras (Compound Mask)."""
        # 1. Cargar la imagen original en espacio BGR (OpenCV) y transformar a RGB
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img_bgr is None:
            raise ValueError("No se pudo decodificar el array de bytes en una imagen OpenCV válida.")
            
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        h, w, _ = img_rgb.shape

        # 2. Inferencia con YOLOv8 (Extracción de polígonos)
        # Class 0: person, Class 32: sports ball
        try:
            results = self.models.yolo_model.predict(img_rgb, classes=[0, 32], verbose=False)
        except Exception as e:
            raise RuntimeError(f"Fallo crítico durante la inferencia YOLOv8: {str(e)}")

        # 3. Generar la máscara binaria en blanco (Puros ceros)
        yolo_ball_mask = np.zeros((h, w), dtype=np.uint8)

        # 4. Dibujar los polígonos de la pelota sobre la máscara YOLO
        if len(results) > 0 and results[0].masks is not None:
            for i, box in enumerate(results[0].boxes):
                cls_id = int(box.cls[0].item())
                if cls_id == 32:  # 32 = sports ball en COCO dataset
                    # Obtener las coordenadas X,Y de los vértices del polígono
                    poly = results[0].masks.xy[i]
                    if len(poly) > 0:
                        # cv2.fillPoly exige que los puntos sean números enteros (int32)
                        poly_pts = np.int32([poly])
                        cv2.fillPoly(yolo_ball_mask, poly_pts, 255)

        # 5. Generar la máscara de la persona con Rembg
        # Piloteado sobre la imagen original
        pil_img = Image.fromarray(img_rgb)
        
        try:
            # Alpha Matting desactivado para mantener perfiles sólidos
            rembg_out = remove(
                pil_img,
                session=self.models.rembg_session,
                post_process_mask=True,
                alpha_matting=False
            )
        except Exception as e:
            raise RuntimeError(f"Fallo crítico durante la inferencia Rembg: {str(e)}")

        # La salida de Rembg es RGBA. El índice 3 corresponde al canal Alpha (Máscara).
        rembg_mask = np.array(rembg_out.split()[3])

        # Asegurar que rembg_mask y yolo_ball_mask tengan exactamente el mismo shape
        if rembg_mask.shape != yolo_ball_mask.shape:
            rembg_mask = cv2.resize(rembg_mask, (w, h), interpolation=cv2.INTER_NEAREST)

        # 6. COMPOUND MASK: Unir ambas máscaras usando OR lógico (Bitwise)
        # Si un píxel es blanco (255) en YOLO *o* en Rembg, será blanco en la máscara final.
        compound_mask = cv2.bitwise_or(rembg_mask, yolo_ball_mask)

        # 7. Aplicar la máscara combinada sobre la imagen original
        # Convertimos la máscara 1D a 3 Canales (RGB)
        mask_3c = cv2.merge([compound_mask, compound_mask, compound_mask])
        
        # Cortar los píxeles (Todo el fondo se vuelve negro puro)
        foreground = cv2.bitwise_and(img_rgb, mask_3c)

        # 8. Crear el lienzo blanco y ensamblar
        white_bg = np.ones_like(img_rgb, dtype=np.uint8) * 255
        
        # Invertir la máscara (Lo que era blanco se vuelve negro) para cortar un agujero en el lienzo blanco
        inv_mask = cv2.bitwise_not(compound_mask)
        inv_mask_3c = cv2.merge([inv_mask, inv_mask, inv_mask])
        
        background_hole = cv2.bitwise_and(white_bg, inv_mask_3c)
        
        # Sumar el sujeto sobre el fondo blanco perforado
        final_rgb = cv2.add(foreground, background_hole)

        # 9. Retornar el resultado al cliente
        return Image.fromarray(final_rgb)
