# Dockerfile de producción para Casa Rosa ASGI
FROM python:3.11-slim

# Evitar que Python escriba archivos .pyc y asegurar logs inmediatos
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del proyecto
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY . /app/

# Crear directorios para estáticos y media
RUN mkdir -p /app/staticfiles /app/media

# Definir variables de entorno por defecto
ENV PORT=8000
ENV DJANGO_SETTINGS_MODULE=casa_rosa.settings.production

# Comando para arrancar el servidor Daphne en modo ASGI
CMD daphne -b 0.0.0.0 -p $PORT casa_rosa.asgi:application
