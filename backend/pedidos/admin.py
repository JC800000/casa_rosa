from django.contrib import admin
from .models import Pedido, DetallePedido


class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 0
    readonly_fields = ['precio_unitario']


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ['id', 'origen', 'mesa', 'estado', 'creado_en']
    list_filter = ['origen', 'estado']
    inlines = [DetallePedidoInline]
