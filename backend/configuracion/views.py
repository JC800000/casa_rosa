import os
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import Configuracion


@csrf_exempt
def upload_qr_pago_view(request):
    if request.method != 'POST' or not request.FILES.get('qr'):
        return JsonResponse({'error': 'Método no permitido o sin archivo'}, status=400)

    archivo = request.FILES['qr']
    ext = os.path.splitext(archivo.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return JsonResponse({'error': 'Formato inválido. Solo JPG, PNG, WEBP.'}, status=400)

    filename = f"{uuid.uuid4()}{ext}"
    relative_path = os.path.join('config', filename)
    path = default_storage.save(relative_path, ContentFile(archivo.read()))
    url = default_storage.url(path)

    config = Configuracion.get()
    config.qr_pago_imagen = path
    config.save()

    return JsonResponse({'success': True, 'qrPath': path, 'qrUrl': url})


@csrf_exempt
def upload_foto_historia_view(request):
    if request.method != 'POST' or not request.FILES.get('foto'):
        return JsonResponse({'error': 'Método no permitido o sin archivo'}, status=400)

    archivo = request.FILES['foto']
    ext = os.path.splitext(archivo.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return JsonResponse({'error': 'Formato inválido. Solo JPG, PNG, WEBP.'}, status=400)

    filename = f"{uuid.uuid4()}{ext}"
    relative_path = os.path.join('config', filename)
    path = default_storage.save(relative_path, ContentFile(archivo.read()))
    url = default_storage.url(path)

    config = Configuracion.get()
    config.foto_historia = path
    config.save()

    return JsonResponse({'success': True, 'url': url})


@csrf_exempt
def upload_foto_showcase_view(request):
    if request.method != 'POST' or not request.FILES.get('foto'):
        return JsonResponse({'error': 'Método no permitido o sin archivo'}, status=400)

    archivo = request.FILES['foto']
    ext = os.path.splitext(archivo.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return JsonResponse({'error': 'Formato inválido. Solo JPG, PNG, WEBP.'}, status=400)

    filename = f"{uuid.uuid4()}{ext}"
    relative_path = os.path.join('showcase', filename)
    path = default_storage.save(relative_path, ContentFile(archivo.read()))
    url = default_storage.url(path)

    return JsonResponse({'success': True, 'path': path, 'url': url})
