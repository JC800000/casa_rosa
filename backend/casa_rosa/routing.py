from django.urls import path
from pedidos.consumers import PedidoConsumer, ClienteConsumer, PedidoIndividualConsumer
from caja.consumers import CajaConsumer

websocket_urlpatterns = [
    path('ws/cocina/', PedidoConsumer.as_asgi()),
    path('ws/caja/', CajaConsumer.as_asgi()),
    path('ws/mesa/<int:mesa_id>/', ClienteConsumer.as_asgi()),
    path('ws/pedido/<int:pedido_id>/', PedidoIndividualConsumer.as_asgi()),
]
