import strawberry
from strawberry import auto
from strawberry.types import Info
from typing import List, Optional
from django.conf import settings
from django.utils import timezone
from .models import Mesa, Reserva, Area
from configuracion.models import Configuracion
from usuarios.schema import _require_permiso


@strawberry.django.type(Area)
class AreaType:
    id: auto
    nombre: auto
    activo: auto

    @strawberry.field
    def mesas(self) -> List['MesaType']:
        return list(self.mesas.filter(activa=True))


@strawberry.django.type(Mesa)
class MesaType:
    id: auto
    nombre: auto
    estado: auto
    activa: auto
    seats: auto
    x_pos: auto
    y_pos: auto
    area: Optional[AreaType]

    @strawberry.field
    def qr_url(self) -> Optional[str]:
        return self.qr_imagen.url if self.qr_imagen else None

    @strawberry.field
    def pide_cuenta(self) -> bool:
        from pedidos.models import Pedido
        return Pedido.objects.filter(
            mesa_id=self.id,
            estado=Pedido.EstadoMesa.COBRAR
        ).exists()


@strawberry.django.type(Reserva)
class ReservaType:
    id: auto
    nombre_cliente: auto
    telefono_cliente: auto
    fecha: auto
    hora: auto
    personas: auto
    estado: auto
    notas: auto
    creada_en: auto
    mesa: Optional[MesaType]

    @strawberry.field
    def cliente_nombre_usuario(self) -> Optional[str]:
        return self.cliente.username if self.cliente else None

    @strawberry.field
    def fecha_str(self) -> str:
        return self.fecha.isoformat()

    @strawberry.field
    def hora_str(self) -> str:
        return self.hora.strftime('%H:%M')


@strawberry.type
class MesaQuery:
    @strawberry.field
    def mesas(self) -> List[MesaType]:
        return Mesa.objects.filter(activa=True)

    @strawberry.field
    def areas(self) -> List[AreaType]:
        return list(Area.objects.filter(activo=True))

    @strawberry.field
    def mesa(self, id: str) -> Optional[MesaType]:
        from .models import _nombre_a_slug
        return next((m for m in Mesa.objects.filter(activa=True) if _nombre_a_slug(m.nombre) == id), None)

    @strawberry.field
    def reservas(self, info: Info, fecha: Optional[str] = None) -> List[ReservaType]:
        _require_permiso(info, 'gestionar_mesas')
        qs = Reserva.objects.all()
        if fecha:
            from datetime import date
            qs = qs.filter(fecha=date.fromisoformat(fecha))
        return list(qs.order_by('-fecha', '-hora'))

    @strawberry.field
    def mis_reservas(self, info: Info) -> List[ReservaType]:
        user = info.context.request.user
        if not user.is_authenticated:
            return []
        return list(Reserva.objects.filter(cliente=user).order_by('-fecha', '-hora'))


@strawberry.input
class MesaPosInput:
    id: int
    x_pos: int
    y_pos: int
    area_id: Optional[int] = None


@strawberry.type
class MesaMutation:
    @strawberry.mutation
    def crear_area(self, nombre: str) -> AreaType:
        return Area.objects.create(nombre=nombre)

    @strawberry.mutation
    def actualizar_area(self, id: int, nombre: str) -> AreaType:
        area = Area.objects.get(pk=id)
        area.nombre = nombre
        area.save()
        return area

    @strawberry.mutation
    def eliminar_area(self, id: int) -> bool:
        area = Area.objects.filter(pk=id).first()
        if area:
            area.activo = False
            area.save()
            area.mesas.update(area=None)
        return True

    @strawberry.mutation
    def guardar_posiciones_mesas(self, posiciones: List[MesaPosInput]) -> List[MesaType]:
        updated_mesas = []
        for p in posiciones:
            mesa = Mesa.objects.filter(pk=p.id).first()
            if mesa:
                mesa.x_pos = p.x_pos
                mesa.y_pos = p.y_pos
                if p.area_id is not None:
                    mesa.area_id = p.area_id if p.area_id > 0 else None
                mesa.save()
                updated_mesas.append(mesa)
        return updated_mesas

    @strawberry.mutation
    def crear_mesa(self, nombre: str, area_id: Optional[int] = None, seats: int = 4) -> MesaType:
        config = Configuracion.get()
        mesa = Mesa.objects.create(
            nombre=nombre,
            area_id=area_id if area_id and area_id > 0 else None,
            seats=seats,
            x_pos=50,
            y_pos=50
        )
        frontend_url = getattr(settings, 'FRONTEND_URL', config.frontend_url)
        mesa.generar_qr(frontend_url)
        mesa.save()
        return mesa

    @strawberry.mutation
    def actualizar_mesa(self, id: int, nombre: str, area_id: Optional[int] = None, seats: Optional[int] = None) -> MesaType:
        mesa = Mesa.objects.get(pk=id)
        mesa.nombre = nombre
        if area_id is not None:
            mesa.area_id = area_id if area_id > 0 else None
        if seats is not None:
            mesa.seats = seats
        config = Configuracion.get()
        frontend_url = getattr(settings, 'FRONTEND_URL', config.frontend_url)
        mesa.generar_qr(frontend_url)
        mesa.save()
        return mesa

    @strawberry.mutation
    def eliminar_mesa(self, id: int) -> bool:
        from pedidos.models import Pedido
        mesa = Mesa.objects.filter(pk=id).first()
        if mesa:
            mesa.activa = False
            mesa.estado = Mesa.Estado.LIBRE
            mesa.save()
            Pedido.objects.filter(
                mesa=mesa,
                estado__in=[
                    Pedido.EstadoMesa.ABIERTO,
                    Pedido.EstadoMesa.EN_PREPARACION,
                    Pedido.EstadoMesa.LISTO,
                    Pedido.EstadoMesa.ENTREGADO,
                    Pedido.EstadoMesa.COBRAR
                ]
            ).update(estado=Pedido.EstadoMesa.CERRADO)
        return True

    @strawberry.mutation
    def crear_reserva(
        self,
        info: Info,
        nombre_cliente: str,
        telefono_cliente: str,
        fecha: str,
        hora: str,
        personas: int,
        notas: str = ''
    ) -> ReservaType:
        from datetime import date, time
        user = info.context.request.user
        
        reserva = Reserva.objects.create(
            cliente=user if user.is_authenticated else None,
            nombre_cliente=nombre_cliente.strip(),
            telefono_cliente=telefono_cliente.strip(),
            fecha=date.fromisoformat(fecha),
            hora=time.fromisoformat(hora),
            personas=personas,
            notas=notas.strip(),
            estado=Reserva.Estado.PENDIENTE
        )
        return reserva

    @strawberry.mutation
    def actualizar_estado_reserva(self, info: Info, id: int, estado: str) -> ReservaType:
        user = info.context.request.user
        reserva = Reserva.objects.get(pk=id)
        
        is_owner = user.is_authenticated and reserva.cliente == user
        if not is_owner:
            _require_permiso(info, 'gestionar_mesas')
            
        reserva.estado = estado
        reserva.save()

        if estado in (Reserva.Estado.CANCELADA, Reserva.Estado.RECHAZADA) and reserva.mesa:
            hoy = timezone.localdate()
            if reserva.fecha == hoy:
                otras_reservas_hoy = Reserva.objects.filter(
                    mesa=reserva.mesa,
                    fecha=hoy,
                    estado=Reserva.Estado.CONFIRMADA
                ).exclude(pk=reserva.id).exists()
                if not otras_reservas_hoy:
                    reserva.mesa.estado = Mesa.Estado.LIBRE
                    reserva.mesa.save()

        return reserva

    @strawberry.mutation
    def confirmar_reserva(self, info: Info, id: int, mesa_id: int) -> ReservaType:
        _require_permiso(info, 'gestionar_mesas')
        reserva = Reserva.objects.get(pk=id)
        mesa = Mesa.objects.get(pk=mesa_id)
        
        reserva.mesa = mesa
        reserva.estado = Reserva.Estado.CONFIRMADA
        reserva.save()
        
        hoy = timezone.localdate()
        if reserva.fecha == hoy:
            mesa.estado = Mesa.Estado.RESERVADA
            mesa.save()
            
        return reserva
