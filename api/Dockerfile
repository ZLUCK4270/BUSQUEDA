# Backend Dockerfile (FastAPI)
FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para OpenCV y compilación
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar el código fuente
COPY . /app/

# Instalar dependencias 
# (Se instala directamente lo necesario ya que no estoy seguro si hay requirements.txt en la raíz)
RUN pip install --no-cache-dir fastapi uvicorn pydantic numpy faiss-cpu opencv-python pillow python-multipart

# Exponer el puerto
EXPOSE 8000

# Comando para ejecutar la API
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
