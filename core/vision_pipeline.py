import logging
from typing import Optional, Dict, Any
from PIL import Image
import numpy as np
import torch
import rembg
from sklearn.cluster import KMeans
from ultralytics import YOLO
from transformers import CLIPProcessor, CLIPModel
import time
import hashlib

logger = logging.getLogger(__name__)

class VisionPipeline:
    """Pipeline orquestador de modelos de Machine Learning para búsqueda semántica.

    Carga YOLO (preferiblemente en formato ONNX para reducir RAM),
    Fashion-CLIP y gestiona un caché LRU en memoria.
    """
    def __init__(self):
        import pathlib

        # Intentar cargar YOLO en formato ONNX (más liviano en RAM).
        # Si no existe, usar el .pt convencional de PyTorch.
        onnx_path = pathlib.Path("yolov8n.onnx")
        if onnx_path.exists():
            logger.info(f"Cargando YOLOv8 en formato ONNX desde: {onnx_path}")
            self.yolo_model = YOLO(str(onnx_path), task="detect")
        else:
            logger.warning("Modelo ONNX no encontrado. Cargando YOLOv8 PyTorch (mayor consumo de RAM).")
            logger.warning("Ejecuta 'python exportar_onnx.py' para generar el .onnx y optimizar.")
            self.yolo_model = YOLO("yolov8n.pt")
        
        # Cargar CLIP estándar (Alineado con embeddings.npy de RAG-V2)
        model_id = "openai/clip-vit-base-patch32"
        self.clip_model = CLIPModel.from_pretrained(model_id)
        self.clip_processor = CLIPProcessor.from_pretrained(model_id)
        
        # Mover CLIP a GPU si está disponible
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            # Usar FP16 en GPU para acelerar inferencia
            self.clip_model.half()
        self.clip_model.to(self.device)
        
        logger.info(f"VisionPipeline inicializado en dispositivo: {self.device}")
        
        # Caché simple en memoria (LRU manual) para evitar reprocesar la misma imagen
        self._cache = {}

    def isolate_torso(self, image: Image.Image) -> Image.Image:
        """
        Escanea la imagen con YOLOv8, detecta una persona y recorta el 65% superior
        de su bounding box para aislar el torso. Si no detecta con >40% de confianza,
        aplica un center crop.
        """
        # Ejecutar YOLO
        results = self.yolo_model(image, verbose=False)
        
        best_box = None
        max_conf = 0.0
        
        if len(results) > 0:
            boxes = results[0].boxes
            for box in boxes:
                cls = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                
                # Clase 0 es 'person' en COCO
                if cls == 0 and conf > 0.40 and conf > max_conf:
                    max_conf = conf
                    best_box = box.xyxy[0].cpu().numpy()  # [x1, y1, x2, y2]
                    
        if best_box is not None:
            x1, y1, x2, y2 = best_box
            height = y2 - y1
            
            # Recortar estrictamente el 65% superior del bounding box
            new_y2 = y1 + (height * 0.65)
            
            # Asegurar que las coordenadas estén dentro de la imagen
            x1 = max(0, int(x1))
            y1 = max(0, int(y1))
            x2 = min(image.width, int(x2))
            new_y2 = min(image.height, int(new_y2))
            
            aislado = image.crop((x1, y1, x2, new_y2))
            try:
                # Quitar el fondo para máxima precisión
                return rembg.remove(aislado)
            except Exception as e:
                logger.error(f"Error en rembg: {e}")
                return aislado
        else:
            logger.warning("No se detectó persona con >40% de confianza. Aplicando fallback (Center Crop).")
            # Fallback seguro: Center Crop proporcional (por ejemplo, del centro del 60% de la imagen)
            w, h = image.size
            crop_w, crop_h = int(w * 0.6), int(h * 0.6)
            left = (w - crop_w) // 2
            top = (h - crop_h) // 2
            right = left + crop_w
            bottom = top + crop_h
            
            aislado_fallback = image.crop((left, top, right, bottom))
            try:
                return rembg.remove(aislado_fallback)
            except Exception as e:
                return aislado_fallback

    def extract_features(self, image: Image.Image) -> np.ndarray:
        """
        Extrae características semánticas usando CLIP y las normaliza (L2).
        """
        inputs = self.clip_processor(images=image, return_tensors="pt").to(self.device)
        if self.device == "cuda":
            inputs["pixel_values"] = inputs["pixel_values"].half()
            
        with torch.no_grad():
            outputs = self.clip_model.get_image_features(**inputs)
            
        # Dependiendo de la versión de transformers, puede devolver un Tensor o un objeto Output
        if hasattr(outputs, "cpu"):
            tensor_features = outputs
        elif hasattr(outputs, "image_embeds"):
            tensor_features = outputs.image_embeds
        elif hasattr(outputs, "pooler_output"):
            tensor_features = outputs.pooler_output
        else:
            tensor_features = outputs[0]
            
        embedding = tensor_features.cpu().numpy()[0]
        
        # Normalización matemática L2 para compatibilidad con Similitud Coseno
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / np.linalg.norm(embedding)
        
        return embedding

    def _closest_color_name(self, rgb):
        # Mapeo de colores canónicos en RGB (0-255)
        colors = {
            "Negro": (0, 0, 0),
            "Blanco": (255, 255, 255),
            "Gris": (128, 128, 128),
            "Rojo": (255, 0, 0),
            "Azul": (0, 0, 255),
            "Verde": (0, 255, 0),
            "Amarillo": (255, 255, 0),
            "Naranja": (255, 165, 0),
            "Morado": (128, 0, 128),
            "Rosa": (255, 192, 203),
            "Marron": (165, 42, 42)
        }
        
        # Convertimos los colores canónicos a LAB para una métrica perceptual más humana
        import cv2
        import numpy as np
        
        min_dist = float('inf')
        closest_name = "Desconocido"
        
        # El target también a LAB
        target_rgb = np.uint8([[rgb]])
        target_lab = cv2.cvtColor(target_rgb, cv2.COLOR_RGB2LAB)[0][0]
        
        for name, color in colors.items():
            canon_rgb = np.uint8([[color]])
            canon_lab = cv2.cvtColor(canon_rgb, cv2.COLOR_RGB2LAB)[0][0]
            
            # Distancia euclidiana en espacio LAB (aproximación rápida a CIEDE2000)
            dist = np.linalg.norm(target_lab.astype(float) - canon_lab.astype(float))
            if dist < min_dist:
                min_dist = dist
                closest_name = name
        return closest_name

    def extract_dominant_color(self, image: Image.Image) -> str:
        import cv2
        import numpy as np
        
        img = image.convert("RGBA")
        img_np = np.array(img)
        
        # 1. Extraemos píxeles no transparentes
        mask = img_np[:, :, 3] > 200
        rgb_pixels = img_np[mask, :3].astype(np.float32)
        
        if len(rgb_pixels) == 0:
            return "Desconocido"
            
        # 2. Normalización de color simple (Gray-World) 
        # Compensamos si la luz ambiente es muy amarilla o azul
        avg_r = np.mean(rgb_pixels[:, 0])
        avg_g = np.mean(rgb_pixels[:, 1])
        avg_b = np.mean(rgb_pixels[:, 2])
        avg_gray = (avg_r + avg_g + avg_b) / 3.0
        
        # Prevenir división por cero
        scale_r = avg_gray / avg_r if avg_r > 0 else 1.0
        scale_g = avg_gray / avg_g if avg_g > 0 else 1.0
        scale_b = avg_gray / avg_b if avg_b > 0 else 1.0
        
        rgb_pixels[:, 0] = np.clip(rgb_pixels[:, 0] * scale_r, 0, 255)
        rgb_pixels[:, 1] = np.clip(rgb_pixels[:, 1] * scale_g, 0, 255)
        rgb_pixels[:, 2] = np.clip(rgb_pixels[:, 2] * scale_b, 0, 255)
        
        rgb_pixels_uint8 = rgb_pixels.astype(np.uint8)
        
        # 3. Convertir a espacio LAB
        pixels_reshaped = rgb_pixels_uint8.reshape(-1, 1, 3)
        lab_pixels = cv2.cvtColor(pixels_reshaped, cv2.COLOR_RGB2LAB).reshape(-1, 3)
        
        # 4. Filtrado de luminancia (Canal L en OpenCV va de 0 a 255)
        # Descartamos sombras profundas (L < 30) y brillos/reflejos (L > 225)
        l_channel = lab_pixels[:, 0]
        valid_mask = (l_channel > 30) & (l_channel < 225)
        
        filtered_rgb = rgb_pixels_uint8[valid_mask]
        
        # Si tras filtrar quedaron muy pocos píxeles (ej. la camiseta es totalmente negra), evitamos el descarte
        if len(filtered_rgb) < 50:
            filtered_rgb = rgb_pixels_uint8
            
        # 5. KMeans (Aumentamos a 3 clusters para separar detalles/logos del color real)
        kmeans = KMeans(n_clusters=3 if len(filtered_rgb) > 3 else 1, n_init=3, random_state=42)
        kmeans.fit(filtered_rgb)
        
        # Obtener el cluster con mayor área (el color real de la prenda)
        counts = np.bincount(kmeans.labels_)
        dominant_rgb = kmeans.cluster_centers_[np.argmax(counts)]
        
        # 6. Clasificamos el color usando distancia LAB
        return self._closest_color_name(dominant_rgb)

    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """
        Ejecuta el pipeline completo: aísla el torso, extrae embeddings y color dominante.
        """
        # Calcular hash de la imagen para la caché
        img_bytes = image.tobytes()
        img_hash = hashlib.md5(img_bytes).hexdigest()
        
        if img_hash in self._cache:
            logger.info("Hit de caché: Imagen encontrada en caché. Evitando inferencia repetida.")
            return self._cache[img_hash]
            
        t0 = time.perf_counter()
        
        # 1. Resize optimizado (máximo 640px) para evitar latencia extrema en CPU
        max_size = 640
        if image.width > max_size or image.height > max_size:
            # Thumbnail mantiene el aspect ratio
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            logger.info(f"Imagen redimensionada a {image.size} para inferencia rápida.")
            
        t1 = time.perf_counter()
        
        # 2. YOLO y Rembg
        isolated_image = self.isolate_torso(image)
        t2 = time.perf_counter()
        
        # 3. CLIP Embedding
        embedding = self.extract_features(isolated_image)
        t3 = time.perf_counter()
        
        # 4. Color dominante
        color = self.extract_dominant_color(isolated_image)
        t4 = time.perf_counter()
        
        # Logging de profiling
        logger.info(f"Latencia (s): Resize={t1-t0:.2f} | YOLO+Rembg={t2-t1:.2f} | CLIP={t3-t2:.2f} | Color={t4-t3:.2f} | TOTAL={t4-t0:.2f}")
        
        result = {
            "embedding": embedding,
            "color": color
        }
        
        # Guardar en caché (máximo 1000 elementos)
        if len(self._cache) > 1000:
            self._cache.pop(next(iter(self._cache)))
        self._cache[img_hash] = result
        
        return result
