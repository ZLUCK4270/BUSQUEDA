import logging
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, HnswConfigDiff, PointStruct
from core.config import settings

logger = logging.getLogger(__name__)

class QdrantManager:
    def __init__(self):
        """
        Inicializa el cliente de Qdrant apuntando a Docker o a almacenamiento local según .env.
        """
        if settings.QDRANT_URL:
            self.client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        else:
            self.client = QdrantClient(path=str(settings.QDRANT_DATA_PATH))
            
        self.collection_name = "camisetas_fashion_v3"
        self._ensure_collection()
        
    def _ensure_collection(self):
        """
        Crea la colección si no existe, con on_disk=True para HNSW.
        Esto mapea los grafos HNSW directamente al disco (mmap), permitiendo
        búsquedas instantáneas en miles de vectores con bajo consumo de RAM.
        """
        # Obtenemos las colecciones actuales
        collections_response = self.client.get_collections()
        collections = collections_response.collections
        
        exists = any(c.name == self.collection_name for c in collections)
        
        if not exists:
            logger.info(f"Creando colección '{self.collection_name}' en Qdrant...")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=512,  # CLIP-ViT-Base-Patch32 embedding size
                    distance=Distance.COSINE
                ),
                hnsw_config=HnswConfigDiff(
                    on_disk=True  # Crítico para escalabilidad de memoria
                )
            )
            # Crear índice en el payload para filtrar rápidamente por color
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="color",
                field_schema="keyword"
            )
            logger.info("Colección creada con on_disk=True e índice de color exitosamente.")
        else:
            logger.info(f"La colección '{self.collection_name}' ya existe.")
            
    def upsert_vectors(self, points: list[PointStruct]):
        """
        Inserta o actualiza vectores en lote.
        """
        if not points:
            return
            
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
