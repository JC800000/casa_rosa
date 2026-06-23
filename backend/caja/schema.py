import strawberry
from strawberry import auto
from strawberry.types import Info
from typing import List, Optional
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from .models import CajaDiaria, Pago, Gasto
from pedidos.models import Pedido, DetallePedido


@strawberry.django.type(Gasto)
class GastoType:
    id: auto
    monto: auto
    descripcion: auto
    via: auto
    registrado_en: auto


@strawberry.django.type(CajaDiaria)
class CajaDiariaType:
    id: auto
    fecha: auto
    hora_apertura: auto
    hora_cierre: auto
    fondo_inicial: auto
    real_efectivo: auto
    real_qr: auto
    observacion: auto

    @strawberry.field
    def cajera_apertura_nombre(self) -> Optional[str]:
        return self.cajera.username if self.cajera else None

    @strawberry.field
    def cajera_cierre_nombre(self) -> Optional[str]:
        return self.cajera_cierre.username if self.cajera_cierre else None

    @strawberry.field
    def ventas_efectivo(self) -> float:
        return float(self.ventas_efectivo)

    @strawberry.field
    def ventas_qr(self) -> float:
        return float(self.ventas_qr)

    @strawberry.field
    def total_gastos(self) -> float:
        return float(self.total_gastos)

    @strawberry.field
    def esperado_efectivo(self) -> float:
        return float(self.esperado_efectivo)

    @strawberry.field
    def esperado_qr(self) -> float:
        return float(self.esperado_qr)

    @strawberry.field
    def diferencia_efectivo(self) -> Optional[float]:
        v = self.diferencia_efectivo
        return float(v) if v is not None else None

    @strawberry.field
    def diferencia_qr(self) -> Optional[float]:
        v = self.diferencia_qr
        return float(v) if v is not None else None

    @strawberry.field
    def gastos(self) -> List[GastoType]:
        return self.gastos.all()


@strawberry.type
class VentaDiariaType:
    fecha: str
    total: float
    efectivo: float
    qr: float


@strawberry.type
class TopItemType:
    nombre: str
    cantidad: int
    total: float


@strawberry.type
class ReporteVentasType:
    total_bruto: float
    total_efectivo: float
    total_qr: float
    total_gastos: float
    total_neto: float
    ventas_por_dia: List[VentaDiariaType]
    top_productos: List[TopItemType]
    top_combos: List[TopItemType]
    cajas: List[CajaDiariaType]


@strawberry.type
class PagoType:
    id: int
    pedido_id: int
    pedido_numero_pedido: Optional[int]
    mesa_nombre: Optional[str]
    medio: str
    monto: float
    registrado_en: str


@strawberry.type
class MovimientosCajaType:
    total_ventas: float
    num_ventas: int
    total_efectivo: float
    total_qr: float
    total_gastos: float
    num_gastos: int
    balance: float
    fondo_inicial: float
    pagos: List[PagoType]
    gastos: List[GastoType]


@strawberry.type
class CajaQuery:
    @strawberry.field
    def caja_hoy(self) -> Optional[CajaDiariaType]:
        return CajaDiaria.objects.filter(hora_cierre__isnull=True).order_by('-hora_apertura').first()

    @strawberry.field
    def historial_cajas(self) -> List[CajaDiariaType]:
        return CajaDiaria.objects.all().order_by('-hora_apertura')

    @strawberry.field
    def caja_por_fecha(self, fecha: str) -> Optional[CajaDiariaType]:
        return CajaDiaria.objects.filter(fecha=fecha).order_by('-hora_apertura').first()

    @strawberry.field
    def movimientos_caja(self, fecha_inicio: str, fecha_fin: str) -> MovimientosCajaType:
        from datetime import date
        fi = date.fromisoformat(fecha_inicio)
        ff = date.fromisoformat(fecha_fin)

        cajas_rango = CajaDiaria.objects.filter(fecha__gte=fi, fecha__lte=ff)

        # Pagos individuales
        pagos_qs = Pago.objects.filter(
            caja__in=cajas_rango, confirmado=True
        ).select_related('pedido__mesa').order_by('-registrado_en')

        pagos_list = []
        for p in pagos_qs:
            mesa_nombre = None
            if p.pedido and p.pedido.mesa:
                mesa_nombre = p.pedido.mesa.nombre
            pagos_list.append(PagoType(
                id=p.id,
                pedido_id=p.pedido_id,
                pedido_numero_pedido=p.pedido.numero_pedido if p.pedido else None,
                mesa_nombre=mesa_nombre,
                medio=p.medio,
                monto=float(p.monto),
                registrado_en=p.registrado_en.isoformat(),
            ))

        # Gastos
        gastos_qs = Gasto.objects.filter(caja__in=cajas_rango).order_by('-registrado_en')

        # Totales
        total_efectivo = float(pagos_qs.filter(medio='efectivo').aggregate(t=Sum('monto'))['t'] or 0)
        total_qr = float(pagos_qs.filter(medio='qr').aggregate(t=Sum('monto'))['t'] or 0)
        total_ventas = total_efectivo + total_qr
        total_gastos = float(gastos_qs.aggregate(t=Sum('monto'))['t'] or 0)
        fondo_inicial = float(cajas_rango.aggregate(t=Sum('fondo_inicial'))['t'] or 0)
        balance = fondo_inicial + total_efectivo - total_gastos

        return MovimientosCajaType(
            total_ventas=total_ventas,
            num_ventas=pagos_qs.count(),
            total_efectivo=total_efectivo,
            total_qr=total_qr,
            total_gastos=total_gastos,
            num_gastos=gastos_qs.count(),
            balance=balance,
            fondo_inicial=fondo_inicial,
            pagos=pagos_list,
            gastos=list(gastos_qs),
        )


    @strawberry.field
    def reporte_ventas(self, fecha_inicio: str, fecha_fin: str) -> ReporteVentasType:
        from datetime import date
        fi = date.fromisoformat(fecha_inicio)
        ff = date.fromisoformat(fecha_fin)

        pagos = Pago.objects.filter(
            confirmado=True,
            caja__fecha__gte=fi,
            caja__fecha__lte=ff,
        )
        total_efectivo = float(pagos.filter(medio='efectivo').aggregate(t=Sum('monto'))['t'] or 0)
        total_qr = float(pagos.filter(medio='qr').aggregate(t=Sum('monto'))['t'] or 0)
        total_bruto = total_efectivo + total_qr

        cajas_rango = CajaDiaria.objects.filter(fecha__gte=fi, fecha__lte=ff)
        total_gastos = float(
            Gasto.objects.filter(caja__in=cajas_rango).aggregate(t=Sum('monto'))['t'] or 0
        )
        total_neto = total_bruto - total_gastos

        # Ventas agrupadas por día
        from collections import defaultdict
        dias: dict = defaultdict(lambda: {'efectivo': 0.0, 'qr': 0.0})
        for p in pagos.values('caja__fecha', 'medio', 'monto'):
            k = str(p['caja__fecha'])
            dias[k][p['medio']] = dias[k].get(p['medio'], 0.0) + float(p['monto'])
        ventas_por_dia = [
            VentaDiariaType(
                fecha=k,
                efectivo=v['efectivo'],
                qr=v['qr'],
                total=v['efectivo'] + v['qr'],
            )
            for k, v in sorted(dias.items())
        ]

        subtotal_expr = ExpressionWrapper(
            F('cantidad') * F('precio_unitario'), output_field=DecimalField()
        )

        # Top 5 productos — primero anotar subtotal por fila, luego agrupar
        top_prods_qs = (
            DetallePedido.objects
            .filter(
                producto__isnull=False,
                pedido__pago__caja__fecha__gte=fi,
                pedido__pago__caja__fecha__lte=ff,
                pedido__pago__confirmado=True,
            )
            .annotate(subtotal=subtotal_expr)
            .values('producto__nombre')
            .annotate(cantidad=Sum('cantidad'), total=Sum('subtotal'))
            .order_by('-cantidad')[:5]
        )
        top_productos = [
            TopItemType(nombre=r['producto__nombre'], cantidad=r['cantidad'], total=float(r['total'] or 0))
            for r in top_prods_qs
        ]

        # Top 5 combos
        top_combos_qs = (
            DetallePedido.objects
            .filter(
                combo__isnull=False,
                pedido__pago__caja__fecha__gte=fi,
                pedido__pago__caja__fecha__lte=ff,
                pedido__pago__confirmado=True,
            )
            .annotate(subtotal=subtotal_expr)
            .values('combo__nombre')
            .annotate(cantidad=Sum('cantidad'), total=Sum('subtotal'))
            .order_by('-cantidad')[:5]
        )
        top_combos = [
            TopItemType(nombre=r['combo__nombre'], cantidad=r['cantidad'], total=float(r['total'] or 0))
            for r in top_combos_qs
        ]

        return ReporteVentasType(
            total_bruto=total_bruto,
            total_efectivo=total_efectivo,
            total_qr=total_qr,
            total_gastos=total_gastos,
            total_neto=total_neto,
            ventas_por_dia=ventas_por_dia,
            top_productos=top_productos,
            top_combos=top_combos,
            cajas=list(cajas_rango.order_by('-fecha')),
        )


@strawberry.type
class CajaMutation:
    @strawberry.mutation
    def abrir_caja(self, fondo_inicial: float, cajera_id: int) -> CajaDiariaType:
        open_caja = CajaDiaria.objects.filter(hora_cierre__isnull=True).first()
        if open_caja:
            return open_caja
        
        hoy = timezone.localdate()
        return CajaDiaria.objects.create(
            fecha=hoy,
            hora_apertura=timezone.now(),
            fondo_inicial=Decimal(str(fondo_inicial)),
            cajera_id=cajera_id,
        )

    @strawberry.mutation
    def cerrar_caja(
        self,
        info: Info,
        caja_id: int,
        real_efectivo: float,
        real_qr: float,
        observacion: str = '',
    ) -> CajaDiariaType:
        caja = CajaDiaria.objects.get(pk=caja_id)
        caja.hora_cierre = timezone.now()
        caja.real_efectivo = Decimal(str(real_efectivo))
        caja.real_qr = Decimal(str(real_qr))
        caja.observacion = observacion
        if info.context.request.user.is_authenticated:
            caja.cajera_cierre = info.context.request.user
        caja.save()
        return caja

    @strawberry.mutation
    def registrar_cobro(self, pedido_id: int, medio: str, cajera_id: int) -> bool:
        from pedidos.schema import _notificar_mesa
        pedido = Pedido.objects.get(pk=pedido_id)
        
        # Evitar cobros duplicados (doble clic o reintentos)
        if Pago.objects.filter(pedido=pedido).exists():
            return True
            
        caja = CajaDiaria.objects.filter(hora_cierre__isnull=True).order_by('-hora_apertura').first()
        if not caja:
            caja = CajaDiaria.objects.filter(fecha=timezone.localdate()).order_by('-hora_apertura').first()
        if not caja:
            raise Exception("No hay ninguna caja abierta para registrar el cobro.")

        from django.db import IntegrityError
        try:
            Pago.objects.create(
                pedido=pedido,
                caja=caja,
                medio=medio,
                monto=pedido.total,
                confirmado=True,
            )
        except IntegrityError:
            pass
        pedido.estado = Pedido.EstadoMesa.CERRADO
        pedido.save()
        if pedido.mesa:
            estados_activos = [
                Pedido.EstadoMesa.ABIERTO,
                Pedido.EstadoMesa.EN_PREPARACION,
                Pedido.EstadoMesa.LISTO,
                Pedido.EstadoMesa.ENTREGADO,
                Pedido.EstadoMesa.COBRAR,
            ]
            otros_activos = Pedido.objects.filter(
                mesa=pedido.mesa, estado__in=estados_activos
            ).exclude(pk=pedido.pk).exists()
            if not otros_activos:
                pedido.mesa.estado = pedido.mesa.Estado.LIBRE
                pedido.mesa.save()
        _notificar_mesa(pedido)
        return True

    @strawberry.mutation
    def registrar_gasto(
        self,
        monto: float,
        descripcion: str,
        via: str,
        registrado_por_id: int,
    ) -> GastoType:
        caja = CajaDiaria.objects.filter(hora_cierre__isnull=True).order_by('-hora_apertura').first()
        if not caja:
            caja = CajaDiaria.objects.filter(fecha=timezone.localdate()).order_by('-hora_apertura').first()
        if not caja:
            raise Exception("No hay ninguna caja abierta para registrar el gasto.")

        return Gasto.objects.create(
            caja=caja,
            monto=Decimal(str(monto)),
            descripcion=descripcion,
            via=via,
            registrado_por_id=registrado_por_id,
        )
