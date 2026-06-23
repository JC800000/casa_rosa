"""
Uso:
    python manage.py reprocesar_fotos           # todos los productos
    python manage.py reprocesar_fotos --id 12   # solo el producto con id 12
"""
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import os


class Command(BaseCommand):
    help = 'Elimina fondo y mejora calidad de fotos de productos existentes'

    def add_arguments(self, parser):
        parser.add_argument('--id', type=int, help='Procesar solo el producto con este ID')

    def handle(self, *args, **options):
        from productos.models import Producto
        from productos.image_processing import procesar_imagen_producto

        qs = Producto.objects.filter(foto__isnull=False).exclude(foto='')
        if options.get('id'):
            qs = qs.filter(pk=options['id'])

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING('No hay productos con foto para procesar.'))
            return

        self.stdout.write(f'Procesando {total} producto(s)...\n')
        ok = 0
        fail = 0

        for prod in qs:
            nombre = prod.nombre
            try:
                old_path = prod.foto.name

                # Leer imagen actual desde storage
                with default_storage.open(old_path, 'rb') as f:
                    imagen_bytes = f.read()

                # Procesar
                self.stdout.write(f'  -> {nombre} ... ', ending='')
                processed = procesar_imagen_producto(imagen_bytes)

                # Guardar PNG resultante
                new_name = f"{uuid.uuid4()}.png"
                new_path = os.path.join('productos', new_name)
                saved_path = default_storage.save(new_path, ContentFile(processed))

                # Actualizar modelo sin pasar por save() (evita optimizar_imagen)
                Producto.objects.filter(pk=prod.pk).update(foto=saved_path)

                # Borrar imagen anterior si era diferente
                if old_path != saved_path and default_storage.exists(old_path):
                    default_storage.delete(old_path)

                self.stdout.write(self.style.SUCCESS('OK'))
                ok += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'ERROR: {e}'))
                fail += 1

        self.stdout.write(f'\nListo: {ok} procesados, {fail} errores.')
