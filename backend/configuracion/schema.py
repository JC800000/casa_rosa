import strawberry
from typing import Optional, List
from django.utils import timezone
from .models import Configuracion, ItemShowcase


@strawberry.type
class ItemShowcaseType:
    id: int
    nombre: str
    descripcion: str
    precio: float
    foto_url: Optional[str]
    orden: int
    activo: bool
    color_tema: str


def _item_to_type(item: ItemShowcase) -> ItemShowcaseType:
    return ItemShowcaseType(
        id=item.pk,
        nombre=str(item.nombre),
        descripcion=str(item.descripcion),
        precio=float(item.precio),
        foto_url=item.foto.url if item.foto else None,
        orden=item.orden,
        activo=item.activo,
        color_tema=str(item.color_tema),
    )


@strawberry.type
class ConfiguracionType:
    nombre_negocio: str
    telefono_whatsapp: str
    costo_delivery: float
    qr_pago_url: Optional[str]
    foto_historia_url: Optional[str]
    horario_manana_inicio: str
    horario_manana_fin: str
    horario_tarde_inicio: str
    horario_tarde_fin: str
    abierto_ahora: bool
    frontend_url: str
    direccion_fisica: str
    horario_atencion: str
    google_maps_url: str
    google_maps_embed_url: str
    estacionamiento_detalle: str


def _to_type(c: Configuracion) -> ConfiguracionType:
    now = timezone.localtime(timezone.now()).time()
    abierto = (
        (c.horario_manana_inicio <= now <= c.horario_manana_fin) or
        (c.horario_tarde_inicio <= now <= c.horario_tarde_fin)
    )
    return ConfiguracionType(
        nombre_negocio=c.nombre_negocio,
        telefono_whatsapp=c.telefono_whatsapp,
        costo_delivery=float(c.costo_delivery),
        qr_pago_url=c.qr_pago_imagen.url if c.qr_pago_imagen else None,
        foto_historia_url=c.foto_historia.url if c.foto_historia else None,
        horario_manana_inicio=c.horario_manana_inicio.strftime('%H:%M'),
        horario_manana_fin=c.horario_manana_fin.strftime('%H:%M'),
        horario_tarde_inicio=c.horario_tarde_inicio.strftime('%H:%M'),
        horario_tarde_fin=c.horario_tarde_fin.strftime('%H:%M'),
        abierto_ahora=abierto,
        frontend_url=c.frontend_url,
        direccion_fisica=str(c.direccion_fisica),
        horario_atencion=str(c.horario_atencion),
        google_maps_url=str(c.google_maps_url),
        google_maps_embed_url=str(c.google_maps_embed_url),
        estacionamiento_detalle=str(c.estacionamiento_detalle),
    )


@strawberry.type
class ConfiguracionQuery:
    @strawberry.field
    def configuracion(self) -> ConfiguracionType:
        return _to_type(Configuracion.get())

    @strawberry.field
    def items_showcase(self) -> list[ItemShowcaseType]:
        return [_item_to_type(i) for i in ItemShowcase.objects.all()]


@strawberry.type
class ShowcaseMutation:
    @strawberry.mutation
    def crear_item_showcase(
        self,
        nombre: str,
        precio: float,
        foto_path: str,
        descripcion: Optional[str] = '',
        color_tema: Optional[str] = '',
    ) -> ItemShowcaseType:
        ultimo_orden = ItemShowcase.objects.count()
        item = ItemShowcase.objects.create(
            nombre=nombre,
            precio=precio,
            foto=foto_path,
            descripcion=descripcion or '',
            color_tema=color_tema or '',
            orden=ultimo_orden,
        )
        return _item_to_type(item)

    @strawberry.mutation
    def actualizar_item_showcase(
        self,
        id: int,
        nombre: Optional[str] = None,
        precio: Optional[float] = None,
        descripcion: Optional[str] = None,
        activo: Optional[bool] = None,
        foto_path: Optional[str] = None,
        color_tema: Optional[str] = None,
    ) -> ItemShowcaseType:
        item = ItemShowcase.objects.get(pk=id)
        if nombre is not None:
            item.nombre = nombre
        if precio is not None:
            item.precio = precio
        if descripcion is not None:
            item.descripcion = descripcion
        if activo is not None:
            item.activo = activo
        if foto_path is not None:
            item.foto = foto_path
        if color_tema is not None:
            item.color_tema = color_tema
        item.save()
        return _item_to_type(item)

    @strawberry.mutation
    def eliminar_item_showcase(self, id: int) -> bool:
        ItemShowcase.objects.filter(pk=id).delete()
        return True

    @strawberry.mutation
    def mover_item_showcase(self, id: int, direccion: str) -> list[ItemShowcaseType]:
        items = list(ItemShowcase.objects.all())
        idx = next((i for i, x in enumerate(items) if x.pk == id), None)
        if idx is None:
            return [_item_to_type(i) for i in items]
        if direccion == 'arriba' and idx > 0:
            items[idx].orden, items[idx - 1].orden = items[idx - 1].orden, items[idx].orden
            items[idx].save()
            items[idx - 1].save()
        elif direccion == 'abajo' and idx < len(items) - 1:
            items[idx].orden, items[idx + 1].orden = items[idx + 1].orden, items[idx].orden
            items[idx].save()
            items[idx + 1].save()
        return [_item_to_type(i) for i in ItemShowcase.objects.all()]


@strawberry.type
class ConfiguracionMutation(ShowcaseMutation):
    @strawberry.mutation
    def actualizar_configuracion(
        self,
        nombre_negocio: Optional[str] = None,
        telefono_whatsapp: Optional[str] = None,
        costo_delivery: Optional[float] = None,
        qr_path: Optional[str] = None,
        horario_manana_inicio: Optional[str] = None,
        horario_manana_fin: Optional[str] = None,
        horario_tarde_inicio: Optional[str] = None,
        horario_tarde_fin: Optional[str] = None,
        direccion_fisica: Optional[str] = None,
        horario_atencion: Optional[str] = None,
        google_maps_url: Optional[str] = None,
        google_maps_embed_url: Optional[str] = None,
        estacionamiento_detalle: Optional[str] = None,
    ) -> ConfiguracionType:
        c = Configuracion.get()
        if nombre_negocio is not None:
            c.nombre_negocio = nombre_negocio
        if telefono_whatsapp is not None:
            c.telefono_whatsapp = telefono_whatsapp
        if costo_delivery is not None:
            c.costo_delivery = costo_delivery
        if qr_path is not None:
            c.qr_pago_imagen = qr_path or None
        if horario_manana_inicio is not None:
            c.horario_manana_inicio = horario_manana_inicio
        if horario_manana_fin is not None:
            c.horario_manana_fin = horario_manana_fin
        if horario_tarde_inicio is not None:
            c.horario_tarde_inicio = horario_tarde_inicio
        if horario_tarde_fin is not None:
            c.horario_tarde_fin = horario_tarde_fin
        if direccion_fisica is not None:
            c.direccion_fisica = direccion_fisica
        if horario_atencion is not None:
            c.horario_atencion = horario_atencion
        if google_maps_url is not None:
            c.google_maps_url = google_maps_url
        if google_maps_embed_url is not None:
            c.google_maps_embed_url = google_maps_embed_url
        if estacionamiento_detalle is not None:
            c.estacionamiento_detalle = estacionamiento_detalle
        c.save()
        c.refresh_from_db()
        return _to_type(c)
