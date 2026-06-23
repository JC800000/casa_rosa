import strawberry
print("STRAWBERRY HAS DJANGO:", hasattr(strawberry, "django"))
from productos.schema import ProductoQuery, ProductoMutation
from mesas.schema import MesaQuery, MesaMutation
from pedidos.schema import PedidoQuery, PedidoMutation
from caja.schema import CajaQuery, CajaMutation
from usuarios.schema import UsuarioQuery, UsuarioMutation
from configuracion.schema import ConfiguracionQuery, ConfiguracionMutation


@strawberry.type
class Query(ProductoQuery, MesaQuery, PedidoQuery, CajaQuery, UsuarioQuery, ConfiguracionQuery):
    pass


@strawberry.type
class Mutation(ProductoMutation, MesaMutation, PedidoMutation, CajaMutation, UsuarioMutation, ConfiguracionMutation):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
