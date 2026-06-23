from caja.schema import CajaMutation
from pedidos.models import Pedido

try:
    mutation = CajaMutation()
    result = mutation.registrar_cobro(pedido_id=108, medio="efectivo", cajera_id=1)
    print("Result:", result)
    p = Pedido.objects.get(pk=108)
    print("Pedido 108 status now:", p.estado)
    print("Mesa 22 status now:", p.mesa.estado)
except Exception as e:
    import traceback
    traceback.print_exc()
