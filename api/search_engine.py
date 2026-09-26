import os
import uuid
import numpy as np
from PIL import Image
import torch

# -------------------------------------------------------------------------
# IMPORTANTE: Aquí importamos el Vision Pipeline de tu Buscador.
# Debes asegurarte de copiar la carpeta 'core' de tu Buscador a RAG-V2,
# o ajustar las rutas para que encuentre YOLO, Rembg y Fashion-CLIP.
# -------------------------------------------------------------------------
from core.vision_pipeline import VisionPipeline
from core.base_datos import QdrantManager
from core.search_service import perform_hybrid_search

# Instancias Globales
pipeline = None
qdrant_db = None

def cargar_indice():
    """
    Inicializa la conexión con Qdrant y carga los modelos de IA en memoria.
    Reemplaza la antigua lógica que cargaba FAISS y los .npy.
    """
    global pipeline, qdrant_db
    print("Inicializando Motor de IA (YOLO + Rembg + Fashion-CLIP)...")
    pipeline = VisionPipeline()
    
    print("Conectando a Qdrant...")
    qdrant_db = QdrantManager()
    
    # Auto-migrar datos si Qdrant está vacío
    if qdrant_db.client.count(qdrant_db.collection_name).count == 0:
        print("Qdrant está vacío. Migrando datos desde .npy (esto tomará unos segundos)...")
        import pandas as pd
        from qdrant_client.http.models import PointStruct
        
        try:
            emb_path = os.path.join("data", "embeddings.npy")
            df_path = os.path.join("data", "products.csv")
            
            if os.path.exists(emb_path) and os.path.exists(df_path):
                embeddings = np.load(emb_path)
                df = pd.read_csv(df_path)
                
                points = []
                # Evitamos vectores nulos (fallidos en generación original)
                valido = np.linalg.norm(embeddings, axis=1) > 0
                
                for idx, row in df.iterrows():
                    if idx < len(embeddings) and valido[idx]:
                        # Qdrant requiere UUID o integer. Generamos uno aleatorio y guardamos el original en el payload
                        point_id = str(uuid.uuid4())
                        original_id = str(row["id"]) if "id" in row else point_id
                        # Limpiamos NaN en el filename por si acaso
                        filename = str(row["imagen"]) if pd.notna(row.get("imagen")) else f"{original_id}.jpg"
                        
                        point = PointStruct(
                            id=point_id,
                            vector=embeddings[idx].tolist(),
                            payload={"filename": filename, "color": "Desconocido", "original_id": original_id}
                        )
                        points.append(point)
                        
                        # Subir en lotes para no saturar la memoria
                        if len(points) >= 500:
                            qdrant_db.upsert_vectors(points)
                            points = []
                            
                if points:
                    qdrant_db.upsert_vectors(points)
                    
                print(f"Migración completada. Se ingestaron {qdrant_db.client.count(qdrant_db.collection_name).count} vectores.")
            else:
                print("No se encontraron los archivos data/embeddings.npy o data/products.csv para migrar.")
        except Exception as e:
            print(f"Error migrando datos a Qdrant: {e}")
            
    print("Sistemas operativos. Motor de búsqueda listo.")

def search_similar(imagen: Image.Image, color_filtro: str = None, top_k: int = 5):
    """
    Recibe una imagen (PIL), la procesa (YOLO+Rembg+CLIP), y busca en Qdrant.
    Si se proporciona un color_filtro, hace búsqueda híbrida exacta.
    """
    if pipeline is None or qdrant_db is None:
        raise RuntimeError("El índice no ha sido cargado. Llama a cargar_indice() primero.")
    
    # 1. Pipeline de Inteligencia Artificial (Extrae embedding y color)
    resultado = pipeline.process_image(imagen)
    query_vector = resultado["embedding"]
    color_detectado = resultado["color"]
    
    # Si el usuario no forzó un filtro de color, usamos el detectado
    color_a_filtrar = color_filtro if color_filtro else color_detectado
    
    # 2. Búsqueda Híbrida Vectorial en Qdrant
    resultados_db = perform_hybrid_search(qdrant_db, query_vector, color_a_filtrar, limit=top_k)
    
    # 3. Formatear la salida para la API de RAG-V2 (compatible con frontend)
    resultados_formateados = []
    for pos, r in enumerate(resultados_db, start=1):
        filename = r.payload.get("filename", "")
        original_id = r.payload.get("original_id", str(r.id))
        resultados_formateados.append({
            "id": original_id,
            "nombre": filename.split('.')[0] if filename else f"Producto {original_id}",
            "imagen": filename,
            "url": "",
            "proveedor": "Catálogo Local",
            "score": round(float(r.score), 4),
            "score_reranking": round(float(r.score), 4),
            "posicion_final": pos
        })
        
    return {
        "color_detectado": color_detectado,
        "resultados": resultados_formateados
    }

def ingest_to_qdrant(imagen: Image.Image, filename: str):
    """
    (Opcional) Usa esta función para llenar tu base de datos Qdrant
    dinámicamente sin usar scripts estáticos de numpy.
    """
    resultado = pipeline.process_image(imagen)
    query_vector = resultado["embedding"]
    color = resultado["color"]
    
    from qdrant_client.http.models import PointStruct
    
    point_id = str(uuid.uuid4())
    point = PointStruct(
        id=point_id,
        vector=query_vector.tolist(),
        payload={"filename": filename, "color": color}
    )
    qdrant_db.upsert_vectors([point])
    return point_id

def info_indice() -> dict:
    """Retorna información del estado de Qdrant."""
    if qdrant_db is None:
        return {"status": "No inicializado"}
    # Podrías agregar una llamada a qdrant_db.client.count() aquí si lo deseas
    return {"status": "Qdrant Online", "coleccion": qdrant_db.collection_name}
