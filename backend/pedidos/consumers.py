import json
from channels.generic.websocket import AsyncWebsocketConsumer


class PedidoIndividualConsumer(AsyncWebsocketConsumer):
    """WebSocket para que el cliente online siga el estado de su pedido."""

    async def connect(self):
        self.pedido_id = self.scope['url_route']['kwargs']['pedido_id']
        self.group = f'pedido_{self.pedido_id}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def pedido_estado(self, event):
        await self.send(text_data=json.dumps({'tipo': 'estado', **event['data']}))


class ClienteConsumer(AsyncWebsocketConsumer):
    """WebSocket para la pantalla del cliente. Recibe cambios de estado de su pedido en tiempo real."""

    async def connect(self):
        self.mesa_id = self.scope['url_route']['kwargs']['mesa_id']
        self.group = f'mesa_{self.mesa_id}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def pedido_estado(self, event):
        await self.send(text_data=json.dumps({'tipo': 'estado', **event['data']}))

    async def pedido_traslado(self, event):
        await self.send(text_data=json.dumps({'tipo': 'traslado', **event['data']}))


class PedidoConsumer(AsyncWebsocketConsumer):
    """WebSocket para la pantalla de cocina (KDS). Recibe pedidos nuevos y cambios de estado."""

    GROUP = 'cocina'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def pedido_nuevo(self, event):
        await self.send(text_data=json.dumps({'tipo': 'pedido_nuevo', **event['data']}))

    async def pedido_actualizado(self, event):
        await self.send(text_data=json.dumps({'tipo': 'pedido_actualizado', **event['data']}))

    async def pedido_listo(self, event):
        await self.send(text_data=json.dumps({'tipo': 'pedido_listo', **event['data']}))
