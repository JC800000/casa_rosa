from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import os


@csrf_exempt
def upload_foto_view(request):
    if request.method != 'POST' or not request.FILES.get('foto'):
        return JsonResponse({'error': 'Método no permitido o sin archivo'}, status=400)

    foto = request.FILES['foto']
    ext = os.path.splitext(foto.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return JsonResponse({'error': 'Formato inválido. Solo JPG, PNG, WEBP.'}, status=400)

    filename = f"{uuid.uuid4()}{ext}"
    relative_path = os.path.join('productos', filename)
    path = default_storage.save(relative_path, ContentFile(foto.read()))
    url = default_storage.url(path)

    return JsonResponse({'success': True, 'fotoPath': path, 'fotoUrl': url})
