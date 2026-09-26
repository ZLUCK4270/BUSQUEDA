from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from typing import Optional, AsyncGenerator
import uuid

# SQLite asíncrono para facilitar el desarrollo. Migrar a postgresql+asyncpg en prod.
DATABASE_URL = "sqlite+aiosqlite:///./catalogo_sql.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

class PrendaMetadata(Base):
    """Modelo ORM que almacena metadatos relacionales de las prendas.
    
    Está diseñado para coexistir con Qdrant. La columna `qdrant_vector_id` 
    funciona como llave foránea virtual hacia la base de datos vectorial.
    """
    __tablename__ = "prendas_metadata"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    qdrant_vector_id: Mapped[str] = mapped_column(index=True, unique=True, nullable=False)
    filename: Mapped[str] = mapped_column(nullable=False)
    categoria: Mapped[Optional[str]] = mapped_column(nullable=True)
    color_detectado: Mapped[Optional[str]] = mapped_column(nullable=True)
    tallas: Mapped[Optional[str]] = mapped_column(nullable=True)

async def init_db() -> None:
    """Crea el esquema en el motor de base de datos si no existe."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Generador asíncrono para inyección de dependencias en FastAPI (Depends)."""
    async with AsyncSessionLocal() as session:
        yield session
