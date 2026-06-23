import strawberry
from strawberry import auto
from typing import List, Optional
from django.db.models import Q
from django.utils import timezone
from .models import Categoria, Producto, Combo


@strawberry.django.type(Categoria)
class CategoriaType:
    id: auto
    nombre: auto
    orden: auto
    activo: auto



@strawberry.django.type(Producto)
class ProductoType:
    id: auto
    nombre: auto
    descripcion: auto
    precio: auto
    disponible: auto
    activo: auto
    categoria: CategoriaType
    codigo_barras: auto

    @strawberry.field
    def foto_url(self) -> Optional[str]:
        return self.foto.url if self.foto else None


@strawberry.django.type(Combo)
class ComboType:
    id: auto
    nombre: auto
    precio: auto
    activo: auto
    fecha_inicio: auto
    fecha_fin: auto
    productos: List[ProductoType]

    @strawberry.field
    def foto_url(self) -> Optional[str]:
        return self.foto.url if self.foto else None


@strawberry.type
class ProductoQuery:
    @strawberry.field
    def categorias(self) -> List[CategoriaType]:
        return Categoria.objects.filter(activo=True).order_by('orden', 'nombre')


    @strawberry.field
    def menu(self) -> List[ProductoType]:
        return Producto.objects.filter(disponible=True, activo=True)

    @strawberry.field
    def productos(self) -> List[ProductoType]:
        return Producto.objects.filter(activo=True)

    @strawberry.field
    def combos_activos(self) -> List[ComboType]:
        hoy = timezone.localdate()
        return Combo.objects.filter(
            activo=True
        ).filter(
            Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=hoy)
        ).filter(
            Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=hoy)
        )

    @strawberry.field
    def combos(self) -> List[ComboType]:
        return Combo.objects.all().order_by('-id')


@strawberry.type
class ProductoMutation:
    @strawberry.mutation
    def crear_categoria(self, nombre: str, orden: int = 0) -> CategoriaType:
        return Categoria.objects.create(nombre=nombre, orden=orden)

    @strawberry.mutation
    def actualizar_categoria(self, id: int, nombre: str, orden: int = 0) -> CategoriaType:
        c = Categoria.objects.get(pk=id)
        c.nombre = nombre
        c.orden = orden
        c.save()
        return c

    @strawberry.mutation
    def eliminar_categoria(self, id: int) -> bool:
        try:
            c = Categoria.objects.get(pk=id)
            if c.productos.filter(activo=True).exists():
                raise Exception("No se puede eliminar esta categoría porque contiene productos activos. Primero debes mover o eliminar sus productos.")
            c.activo = False
            c.save()
            return True
        except Categoria.DoesNotExist:
            raise Exception("Categoría no encontrada.")



    @strawberry.mutation
    def crear_producto(
        self,
        nombre: str,
        precio: float,
        categoria_id: int,
        descripcion: str = '',
        disponible: bool = True,
        foto_path: Optional[str] = None,
        codigo_barras: Optional[str] = None,
    ) -> ProductoType:
        return Producto.objects.create(
            nombre=nombre,
            precio=precio,
            categoria_id=categoria_id,
            descripcion=descripcion,
            disponible=disponible,
            foto=foto_path,
            codigo_barras=codigo_barras,
        )

    @strawberry.mutation
    def actualizar_producto(
        self,
        id: int,
        nombre: Optional[str] = None,
        precio: Optional[float] = None,
        descripcion: Optional[str] = None,
        disponible: Optional[bool] = None,
        categoria_id: Optional[int] = None,
        foto_path: Optional[str] = None,
        codigo_barras: Optional[str] = None,
    ) -> ProductoType:
        p = Producto.objects.get(pk=id)
        if nombre is not None:
            p.nombre = nombre
        if precio is not None:
            p.precio = precio
        if descripcion is not None:
            p.descripcion = descripcion
        if disponible is not None:
            p.disponible = disponible
        if categoria_id is not None:
            p.categoria_id = categoria_id
        if foto_path is not None:
            if foto_path == "":
                p.foto = None
            else:
                p.foto = foto_path
        if codigo_barras is not None:
            p.codigo_barras = codigo_barras if codigo_barras != "" else None
        p.save()
        return p

    @strawberry.mutation
    def toggle_disponible(self, producto_id: int) -> ProductoType:
        p = Producto.objects.get(pk=producto_id)
        p.disponible = not p.disponible
        p.save()
        return p

    @strawberry.mutation
    def eliminar_producto(self, id: int) -> bool:
        Producto.objects.filter(pk=id).update(activo=False)
        return True

    @strawberry.mutation
    def crear_combo(
        self,
        nombre: str,
        precio: float,
        productos_ids: List[int],
        activo: bool = True,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        foto_path: Optional[str] = None,
    ) -> ComboType:
        from datetime import date
        combo = Combo.objects.create(
            nombre=nombre,
            precio=precio,
            activo=activo,
            fecha_inicio=date.fromisoformat(fecha_inicio) if fecha_inicio else None,
            fecha_fin=date.fromisoformat(fecha_fin) if fecha_fin else None,
            foto=foto_path or '',
        )
        combo.productos.set(Producto.objects.filter(pk__in=productos_ids))
        return combo

    @strawberry.mutation
    def actualizar_combo(
        self,
        id: int,
        nombre: Optional[str] = None,
        precio: Optional[float] = None,
        productos_ids: Optional[List[int]] = None,
        activo: Optional[bool] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        foto_path: Optional[str] = None,
    ) -> ComboType:
        from datetime import date
        combo = Combo.objects.get(pk=id)
        if nombre is not None:
            combo.nombre = nombre
        if precio is not None:
            combo.precio = precio
        if activo is not None:
            combo.activo = activo
        if fecha_inicio is not None:
            combo.fecha_inicio = date.fromisoformat(fecha_inicio) if fecha_inicio else None
        if fecha_fin is not None:
            combo.fecha_fin = date.fromisoformat(fecha_fin) if fecha_fin else None
        if foto_path is not None:
            combo.foto = foto_path if foto_path else ''
        combo.save()
        if productos_ids is not None:
            combo.productos.set(Producto.objects.filter(pk__in=productos_ids))
        return combo

    @strawberry.mutation
    def eliminar_combo(self, id: int) -> bool:
        Combo.objects.filter(pk=id).update(activo=False)
        return True
