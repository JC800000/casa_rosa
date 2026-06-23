import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casa_rosa.settings.local')
django.setup()

from schema import schema

query = """
mutation {
  registrarCobro(pedidoId: 108, medio: "efectivo", cajeraId: 1)
}
"""

result = schema.execute_sync(query)
print("Errors:", result.errors)
print("Data:", result.data)
