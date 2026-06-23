from django.contrib import admin
from .models import CajaDiaria, Pago, Gasto


class GastoInline(admin.TabularInline):
    model = Gasto
    extra = 0


@admin.register(CajaDiaria)
class CajaDiariaAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'hora_apertura', 'hora_cierre', 'fondo_inicial']
    inlines = [GastoInline]


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['pedido', 'medio', 'monto', 'confirmado', 'registrado_en']
    list_filter = ['medio', 'confirmado']


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ['descripcion', 'monto', 'via', 'registrado_en', 'registrado_por']
