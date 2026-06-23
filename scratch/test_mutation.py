import os
import django
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casa_rosa.settings.local')
django.setup()

# Import GraphQLView to dynamically load strawberry.django
from strawberry.django.views import GraphQLView

from schema import schema
from productos.models import Producto

p = Producto.objects.first()
if not p:
    print("No products found.")
    exit(1)

print(f"Testing with product ID: {p.id}, name: {p.nombre}")

query = """
mutation TestActualizar($id: Int!, $nombre: String, $fotoPath: String) {
  actualizarProducto(id: $id, nombre: $nombre, fotoPath: $fotoPath) {
    id
    nombre
    fotoUrl
  }
}
"""

variables = {
    "id": int(p.id),
    "nombre": f"{p.nombre} (Test)",
    "fotoPath": None
}

result = schema.execute_sync(query, variable_values=variables)
print("Result with fotoPath = None:")
print(f"Errors: {result.errors}")
print(f"Data: {result.data}")

# Test with a dummy path
variables_with_foto = {
    "id": int(p.id),
    "nombre": p.nombre,
    "fotoPath": "productos/test_dummy_image.png"
}
result_with_foto = schema.execute_sync(query, variable_values=variables_with_foto)
print("\nResult with fotoPath = 'productos/test_dummy_image.png':")
print(f"Errors: {result_with_foto.errors}")
print(f"Data: {result_with_foto.data}")
