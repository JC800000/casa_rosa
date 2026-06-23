import json
from channels.generic.websocket import AsyncWebsocketConsumer


class CajaConsumer(AsyncWebsocketConsumer):
    """WebSocket para la pantalla de cajera/mesera. Recibe avisos de cobrar y pedidos listos."""

    GROUP = 'caja'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def aviso_cobrar(self, event):
        await self.send(text_data=json.dumps({'tipo': 'aviso_cobrar', **event['data']}))

    async def pedido_listo(self, event):
        await self.send(text_data=json.dumps({'tipo': 'pedido_listo', **event['data']}))
