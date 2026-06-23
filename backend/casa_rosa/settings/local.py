from .base import *
from decouple import config
import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # No necesita conectarse realmente, solo sirve para detectar la interfaz de red activa
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

LOCAL_IP = get_local_ip()

DEBUG = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '192.168.100.8',
    '192.168.100.61',
    LOCAL_IP,
    '.ngrok-free.app',
    '.ngrok.io',
    '.ngrok-free.dev'
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='casa_rosa'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# In-Memory channel layer para desarrollo local (sin Redis)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite dev server
    'http://127.0.0.1:5173',
    'http://192.168.100.8:5173',
    'http://192.168.100.61:5173',
    f'http://{LOCAL_IP}:5173',
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://192.168.100.8:5173',
    'http://192.168.100.8:8000',
    'http://192.168.100.61:5173',
    'http://192.168.100.61:8000',
    f'http://{LOCAL_IP}:5173',
    f'http://{LOCAL_IP}:8000',
    'https://*.ngrok-free.app',
    'http://*.ngrok-free.app',
    'https://*.ngrok-free.dev',
    'http://*.ngrok-free.dev',
    'https://*.ngrok.io',
    'http://*.ngrok.io',
]

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

FRONTEND_URL = f'http://{LOCAL_IP}:5173'


