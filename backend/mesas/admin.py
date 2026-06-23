from django.contrib import admin
from .models import Mesa


@admin.register(Mesa)
class MesaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'estado', 'activa']
    list_filter = ['estado', 'activa']
