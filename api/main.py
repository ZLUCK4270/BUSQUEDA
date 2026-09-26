from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.search_engine import cargar_indice, search_similar, info_indice
from io import BytesIO
from PIL import Image

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Carga Qdrant, YOLO y los Modelos CLIP al arrancar
    cargar_indice()
    yield
    # Limpieza si es necesaria

app = FastAPI(lifespan=lifespan)

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import FastAPI, UploadFile, File, Form

@app.post("/search/image")
async def buscar_prenda(
    file: UploadFile = File(...),
    modo: str = Form("auto"),
    modelo: str = Form("fusion")
):
    # Leemos la imagen recibida
    content = await file.read()
    imagen = Image.open(BytesIO(content)).convert("RGB")
    
    # Llamamos a nuestra nueva función de búsqueda híbrida con Qdrant
    resultados = search_similar(imagen, color_filtro=None, top_k=5)
    
    # Añadimos los metadatos requeridos por el frontend
    resultados["modo"] = modo
    resultados["modelo"] = modelo
    
    return resultados

@app.get("/health")
def health_check():
    return {"status": "ok", "index_info": info_indice()}
