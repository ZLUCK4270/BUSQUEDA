from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# Obtener la ruta base del proyecto (C:\HACK_3 o similar)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Rutas absolutas resueltas usando pathlib
    CATALOG_PATH: Path = BASE_DIR.parent / "IMAGENES DEL CATALOGO"
    QDRANT_DATA_PATH: Path = BASE_DIR / "qdrant_data"
    
    # Qdrant (usará memoria/disco si no hay URL)
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Web UI
    UI_HOST: str = "127.0.0.1"
    UI_PORT: int = 7860
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
