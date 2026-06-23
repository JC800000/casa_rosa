from django.contrib import admin
from .models import Categoria, Producto, Combo


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'orden', 'activo']
    list_filter = ['activo']
    list_editable = ['orden', 'activo']
    ordering = ['orden']



@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'categoria', 'precio', 'disponible', 'activo']
    list_filter = ['categoria', 'disponible', 'activo']
    list_editable = ['disponible']


@admin.register(Combo)
class ComboAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'precio', 'activo']
    filter_horizontal = ['productos']
