import strawberry
from strawberry import auto
from strawberry.types import Info
from typing import List, Optional
from datetime import timedelta
from decimal import Decimal
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from .models import Pedido, DetallePedido
from mesas.models import Mesa


@strawberry.type
class TopProductoType:
    nombre: str
    cantidad: int
    foto_url: Optional[str] = None


@strawberry.type
class PedidoPorHoraType:
    hora: int
    cantidad: int


@strawberry.type
class StatsHoyType:
    pedidos_hoy: int
    pedidos_pendientes: int
    ventas_totales: float
    ticket_promedio: float
    tiempo_espera_promedio: float
    ocupacion_mesas_porcentaje: float
    top_productos: List[TopProductoType]
    pedidos_por_hora: List[PedidoPorHoraType]


@strawberry.django.type(DetallePedido)
class DetallePedidoType:
    id: auto
    cantidad: auto
    precio_unitario: auto
    nota: auto
    creado_en: auto

    @strawberry.field
    def nombre_item(self) -> str:
        item = self.producto or self.combo
        return item.nombre if item else ''

    @strawberry.field
    def subtotal(self) -> float:
        return float(self.subtotal)


@strawberry.django.type(Pedido)
class PedidoType:
    id: auto
    origen: auto
    estado: auto
    tipo_entrega: auto
    costo_envio: auto
    descuento: auto
    propina: auto
    creado_en: auto
    nota_general: auto
    detalles: List[DetallePedidoType]
    numero_pedido: auto

    @strawberry.field
    def total(self) -> float:
        return float(self.total)

    @strawberry.field
    def nombre_mesa(self) -> Optional[str]:
        return self.mesa.nombre if self.mesa else None

    @strawberry.field
    def cliente_nombre(self) -> str:
        try:
            import json
            return json.loads(self.nota_general).get('nombre', '')
        except Exception:
            return ''

    @strawberry.field
    def cliente_telefono(self) -> str:
        try:
            import json
            return json.loads(self.nota_general).get('telefono', '')
        except Exception:
            return ''

    @strawberry.field
    def cliente_direccion(self) -> str:
        try:
            import json
            return json.loads(self.nota_general).get('direccion', '')
        except Exception:
            return ''

    @strawberry.field
    def cliente_nota(self) -> str:
        try:
            import json
            return json.loads(self.nota_general).get('nota', '')
        except Exception:
            return self.nota_general or ''


@strawberry.input
class DetallePedidoInput:
    producto_id: Optional[int] = None
    combo_id: Optional[int] = None
    cantidad: int = 1
    nota: str = ''


@strawberry.input
class DetalleDivisionInput:
    detalle_id: int
    cantidad: int



@strawberry.type
class PedidoQuery:
    @strawberry.field
    def pedidos_cocina(self) -> List[PedidoType]:
        # Solo los estados activos de cocina
        estados_activos = [
            Pedido.EstadoMesa.ABIERTO,
            Pedido.EstadoMesa.EN_PREPARACION,
            Pedido.EstadoOnline.PAGO_CONFIRMADO,
            Pedido.EstadoOnline.EN_COCINA,
        ]
        # Pedidos listos (esperando a la mesera)
        estados_listos = [Pedido.EstadoMesa.LISTO]
        
        # Pedidos entregados recientemente (últimos 5 minutos para que el cocinero vea el OK de la mesera)
        limite_tiempo = timezone.now() - timedelta(minutes=5)
        
        return Pedido.objects.filter(
            Q(estado__in=estados_activos) |
            Q(estado__in=estados_listos) |
            Q(estado=Pedido.EstadoMesa.ENTREGADO, actualizado_en__gte=limite_tiempo)
        ).filter(Q(mesa__isnull=True) | Q(mesa__activa=True)).distinct()

    @strawberry.field
    def pedidos_por_entregar(self) -> List[PedidoType]:
        # Solo listo — la mesera ve esto, lo marca entregado y desaparece
        return Pedido.objects.filter(estado=Pedido.EstadoMesa.LISTO).filter(Q(mesa__isnull=True) | Q(mesa__activa=True))

    @strawberry.field
    def pedido(self, id: int) -> Optional[PedidoType]:
        return Pedido.objects.filter(pk=id).first()

    @strawberry.field
    def pedidos_a_cobrar(self) -> List[PedidoType]:
        return Pedido.objects.filter(estado=Pedido.EstadoMesa.COBRAR, mesa__activa=True)

    @strawberry.field
    def pedidos_mesa(self, mesa_id: int) -> List[PedidoType]:
        # Todos los estados activos para que el cliente vea el tracker
        estados_activos = [
            Pedido.EstadoMesa.ABIERTO,
            Pedido.EstadoMesa.EN_PREPARACION,
            Pedido.EstadoMesa.LISTO,
            Pedido.EstadoMesa.ENTREGADO,
            Pedido.EstadoMesa.COBRAR,
        ]
        return Pedido.objects.filter(mesa_id=mesa_id, estado__in=estados_activos)

    @strawberry.field
    def stats_hoy(self) -> StatsHoyType:
        from django.db.models import Sum
        from caja.models import Pago, CajaDiaria
        from mesas.models import Mesa
        
        hoy = timezone.localdate()
        
        # 1. Pedidos Hoy
        pedidos_hoy = Pedido.objects.filter(creado_en__date=hoy).count()
        
        # 2. Ventas Totales
        ventas_totales = float(Pago.objects.filter(
            registrado_en__date=hoy, confirmado=True
        ).aggregate(t=Sum('monto'))['t'] or 0)
        
        # 3. Ticket Promedio
        pedidos_cobrados_count = Pago.objects.filter(registrado_en__date=hoy, confirmado=True).count()
        ticket_promedio = (ventas_totales / pedidos_cobrados_count) if pedidos_cobrados_count > 0 else 0.0
        
        # 4. Tiempo Espera Promedio (en minutos)
        pedidos_preparados = Pedido.objects.filter(
            creado_en__date=hoy,
            estado__in=[Pedido.EstadoMesa.LISTO, Pedido.EstadoMesa.ENTREGADO, Pedido.EstadoMesa.CERRADO]
        )
        tiempos = []
        for p in pedidos_preparados:
            delta = p.actualizado_en - p.creado_en
            tiempos.append(delta.total_seconds() / 60.0)
        tiempo_espera_promedio = (sum(tiempos) / len(tiempos)) if tiempos else 0.0
        
        # 5. Ocupación de Mesas
        mesas_totales = Mesa.objects.filter(activa=True).count()
        mesas_ocupadas = Mesa.objects.filter(activa=True, estado=Mesa.Estado.OCUPADA).count()
        ocupacion_mesas_porcentaje = (mesas_ocupadas / mesas_totales * 100.0) if mesas_totales > 0 else 0.0
        
        # 6. Top Productos Hoy
        top_prods_qs = (
            DetallePedido.objects
            .filter(
                producto__isnull=False,
                pedido__creado_en__date=hoy
            )
            .values('producto_id')
            .annotate(cantidad=Sum('cantidad'))
            .order_by('-cantidad')[:5]
        )
        from productos.models import Producto
        prod_ids = [r['producto_id'] for r in top_prods_qs]
        productos_dict = {p.id: p for p in Producto.objects.filter(id__in=prod_ids)}
        
        top_productos = []
        for r in top_prods_qs:
            p = productos_dict.get(r['producto_id'])
            if p:
                foto_url = p.foto.url if p.foto else None
                top_productos.append(
                    TopProductoType(
                        nombre=p.nombre,
                        cantidad=r['cantidad'],
                        foto_url=foto_url
                    )
                )
        
        # 7. Pedidos por Hora
        pedidos_hoy_qs = Pedido.objects.filter(creado_en__date=hoy)
        horas = {h: 0 for h in range(24)}
        for p in pedidos_hoy_qs:
            hora_local = timezone.localtime(p.creado_en).hour
            horas[hora_local] += 1
        
        pedidos_por_hora = [
            PedidoPorHoraType(hora=h, cantidad=c)
            for h, c in sorted(horas.items())
        ]
        
        # 8. Pedidos Pendientes (Cocina)
        estados_activos = [
            Pedido.EstadoMesa.ABIERTO,
            Pedido.EstadoMesa.EN_PREPARACION,
            Pedido.EstadoOnline.PAGO_CONFIRMADO,
            Pedido.EstadoOnline.EN_COCINA,
        ]
        pedidos_pendientes = Pedido.objects.filter(
            estado__in=estados_activos
        ).filter(Q(mesa__isnull=True) | Q(mesa__activa=True)).distinct().count()
        
        return StatsHoyType(
            pedidos_hoy=pedidos_hoy,
            pedidos_pendientes=pedidos_pendientes,
            ventas_totales=ventas_totales,
            ticket_promedio=ticket_promedio,
            tiempo_espera_promedio=tiempo_espera_promedio,
            ocupacion_mesas_porcentaje=ocupacion_mesas_porcentaje,
            top_productos=top_productos,
            pedidos_por_hora=pedidos_por_hora,
        )

    @strawberry.field
    def pedidos_pendiente_pago(self) -> List[PedidoType]:
        return Pedido.objects.filter(
            origen=Pedido.Origen.ONLINE,
            estado=Pedido.EstadoOnline.PENDIENTE_PAGO,
        )

    @strawberry.field
    def pedidos_online_activos(self) -> List[PedidoType]:
        estados = [
            Pedido.EstadoOnline.PAGO_CONFIRMADO,
            Pedido.EstadoOnline.EN_COCINA,
            Pedido.EstadoMesa.EN_PREPARACION,
            Pedido.EstadoMesa.LISTO,
        ]
        return Pedido.objects.filter(origen=Pedido.Origen.ONLINE, estado__in=estados)

    @strawberry.field
    def pedidos_online_historial(self) -> List[PedidoType]:
        estados = [
            Pedido.EstadoOnline.ENTREGADO,
            Pedido.EstadoOnline.CANCELADO,
        ]
        return Pedido.objects.filter(origen=Pedido.Origen.ONLINE, estado__in=estados).order_by('-creado_en')[:100]

    @strawberry.field
    def pedidos_mesa_activos(self) -> List[PedidoType]:
        estados = [
            Pedido.EstadoMesa.ABIERTO,
            Pedido.EstadoMesa.EN_PREPARACION,
            Pedido.EstadoMesa.LISTO,
            Pedido.EstadoMesa.ENTREGADO,
            Pedido.EstadoMesa.COBRAR,
        ]
        return Pedido.objects.filter(origen=Pedido.Origen.MESA, estado__in=estados, mesa__activa=True)

    @strawberry.field
    def mis_pedidos(self, info: Info) -> List[PedidoType]:
        user = info.context.request.user
        if not user.is_authenticated:
            return []
        return Pedido.objects.filter(cliente=user, origen=Pedido.Origen.ONLINE)

    @strawberry.field
    def ultimo_pedido_activo(self, info: Info) -> Optional[PedidoType]:
        user = info.context.request.user
        if not user.is_authenticated:
            return None
        estados_activos = [
            Pedido.EstadoOnline.PENDIENTE_PAGO,
            Pedido.EstadoOnline.PAGO_CONFIRMADO,
            Pedido.EstadoOnline.EN_COCINA,
            Pedido.EstadoMesa.EN_PREPARACION,
            Pedido.EstadoOnline.LISTO,
        ]
        return Pedido.objects.filter(
            cliente=user,
            origen=Pedido.Origen.ONLINE,
            estado__in=estados_activos
        ).order_by('-creado_en').first()


@strawberry.type
class PedidoMutation:
    @strawberry.mutation
    def crear_pedido_mesa(self, mesa_id: int, detalles: List[DetallePedidoInput]) -> PedidoType:
        from caja.models import CajaDiaria
        if not CajaDiaria.objects.filter(hora_cierre__isnull=True).exists():
            raise Exception("No se pueden realizar pedidos porque la caja está cerrada. Por favor, abre la caja primero.")
        from productos.models import Producto, Combo
        mesa = Mesa.objects.get(pk=mesa_id)
        pedido = Pedido.objects.create(origen=Pedido.Origen.MESA, mesa=mesa, estado=Pedido.EstadoMesa.ABIERTO)
        _crear_detalles(pedido, detalles)
        mesa.estado = Mesa.Estado.OCUPADA
        mesa.save()
        _notificar_cocina(pedido)
        _notificar_mesa(pedido)
        return pedido

    @strawberry.mutation
    def agregar_items(self, pedido_id: int, detalles: List[DetallePedidoInput]) -> PedidoType:
        from caja.models import CajaDiaria
        if not CajaDiaria.objects.filter(hora_cierre__isnull=True).exists():
            raise Exception("No se pueden registrar consumos porque la caja está cerrada. Por favor, abre la caja primero.")
        pedido = Pedido.objects.get(pk=pedido_id)
        _crear_detalles(pedido, detalles)
        # Si el pedido ya fue entregado/listo/cobrar, volver a abierto para que el cocinero lo vea
        estados_a_reactivar = [
            Pedido.EstadoMesa.ENTREGADO,
            Pedido.EstadoMesa.LISTO,
            Pedido.EstadoMesa.COBRAR,
        ]
        if pedido.estado in estados_a_reactivar:
            pedido.estado = Pedido.EstadoMesa.ABIERTO
            pedido.save()
        _notificar_cocina(pedido)
        _notificar_mesa(pedido)
        return pedido

    @strawberry.mutation
    def pedir_cuenta(self, pedido_id: int) -> PedidoType:
        pedido = Pedido.objects.get(pk=pedido_id)
        pedido.estado = Pedido.EstadoMesa.COBRAR
        pedido.save()
        _notificar_caja_cobrar(pedido)
        _notificar_mesa(pedido)
        return pedido

    @strawberry.mutation
    def actualizar_estado_cocina(self, pedido_id: int, estado: str) -> PedidoType:
        pedido = Pedido.objects.get(pk=pedido_id)
        pedido.estado = estado
        pedido.save()
        if estado in (Pedido.EstadoMesa.LISTO, Pedido.EstadoOnline.LISTO):
            _notificar_caja_listo(pedido)
        _notificar_cocina_actualizado(pedido)
        _notificar_mesa(pedido)
        _notificar_pedido(pedido)
        return pedido

    @strawberry.mutation
    def marcar_entregado(self, pedido_id: int) -> PedidoType:
        pedido = Pedido.objects.get(pk=pedido_id)
        pedido.estado = Pedido.EstadoMesa.ENTREGADO
        pedido.save()
        _notificar_mesa(pedido)
        _notificar_pedido(pedido)
        return pedido

    # ── Online ────────────────────────────────────────────────────
    @strawberry.mutation
    def crear_pedido_online(
        self,
        info: Info,
        tipo_entrega: str,
        costo_envio: float,
        cliente_nombre: str,
        cliente_telefono: str,
        cliente_direccion: str = '',
        nota: str = '',
        detalles: List[DetallePedidoInput] = strawberry.UNSET,
    ) -> PedidoType:
        from caja.models import CajaDiaria
        if not CajaDiaria.objects.filter(hora_cierre__isnull=True).exists():
            raise Exception("No se pueden realizar pedidos online porque la caja está cerrada. Por favor, abre la caja primero.")
        import json
        from configuracion.models import Configuracion
        from django.utils.timezone import localtime, now as tz_now

        config = Configuracion.get()
        hora = localtime(tz_now()).time()
        abierto = (
            (config.horario_manana_inicio <= hora <= config.horario_manana_fin) or
            (config.horario_tarde_inicio <= hora <= config.horario_tarde_fin)
        )
        if not abierto:
            raise Exception('El local está cerrado en este momento')

        nota_data = {
            'nombre': cliente_nombre,
            'telefono': cliente_telefono,
            'direccion': cliente_direccion,
            'nota': nota,
        }
        pedido = Pedido.objects.create(
            origen=Pedido.Origen.ONLINE,
            tipo_entrega=tipo_entrega,
            costo_envio=Decimal(str(costo_envio)),
            estado=Pedido.EstadoOnline.PENDIENTE_PAGO,
            cliente=info.context.request.user if info.context.request.user.is_authenticated else None,
            nota_general=json.dumps(nota_data, ensure_ascii=False),
        )
        if detalles and detalles is not strawberry.UNSET:
            _crear_detalles(pedido, detalles)
        return pedido

    @strawberry.mutation
    def confirmar_pago_online(
        self,
        pedido_id: int,
        monto_confirmado: float,
        costo_envio_ajustado: Optional[float] = None,
    ) -> PedidoType:
        from caja.models import CajaDiaria, Pago

        pedido = Pedido.objects.get(pk=pedido_id)

        # Evitar confirmaciones de pago duplicadas (doble clic o reintentos)
        if Pago.objects.filter(pedido=pedido).exists():
            return pedido

        if costo_envio_ajustado is not None:
            pedido.costo_envio = Decimal(str(costo_envio_ajustado))

        pedido.estado = Pedido.EstadoOnline.PAGO_CONFIRMADO
        pedido.save()

        caja = CajaDiaria.objects.filter(hora_cierre__isnull=True).order_by('-hora_apertura').first()
        if not caja:
            caja = CajaDiaria.objects.filter(fecha=timezone.localdate()).order_by('-hora_apertura').first()
        if not caja:
            raise Exception("No hay ninguna caja abierta para registrar el cobro online.")

        from django.db import IntegrityError
        try:
            Pago.objects.create(
                pedido=pedido,
                caja=caja,
                medio='qr',
                monto=Decimal(str(monto_confirmado)),
                confirmado=True,
            )
        except IntegrityError:
            pass

        _notificar_cocina(pedido)
        _notificar_pedido(pedido)
        return pedido

    @strawberry.mutation
    def cancelar_pedido_online(self, pedido_id: int) -> PedidoType:
        pedido = Pedido.objects.get(pk=pedido_id)
        pedido.estado = Pedido.EstadoOnline.CANCELADO
        pedido.save()
        _notificar_pedido(pedido)
        return pedido

    @strawberry.mutation
    def trasladar_pedido(self, pedido_id: int, nueva_mesa_id: int) -> PedidoType:
        pedido = Pedido.objects.get(pk=pedido_id)
        vieja_mesa = pedido.mesa
        nueva_mesa = Mesa.objects.get(pk=nueva_mesa_id)
        
        pedido.mesa = nueva_mesa
        pedido.save()
        
        if vieja_mesa:
            estados_activos = [
                Pedido.EstadoMesa.ABIERTO,
                Pedido.EstadoMesa.EN_PREPARACION,
                Pedido.EstadoMesa.LISTO,
                Pedido.EstadoMesa.ENTREGADO,
                Pedido.EstadoMesa.COBRAR,
            ]
            otros_activos = Pedido.objects.filter(
                mesa=vieja_mesa, estado__in=estados_activos
            ).exists()
            if not otros_activos:
                vieja_mesa.estado = Mesa.Estado.LIBRE
                vieja_mesa.save()
                
        nueva_mesa.estado = Mesa.Estado.OCUPADA
        nueva_mesa.save()
        
        _notificar_mesa(pedido)
        if vieja_mesa:
            from mesas.models import _nombre_a_slug
            slug_nueva = _nombre_a_slug(nueva_mesa.nombre)
            layer = get_channel_layer()
            async_to_sync(layer.group_send)(f'mesa_{vieja_mesa.id}', {
                'type': 'pedido_traslado',
                'data': {'nuevo_slug': slug_nueva},
            })

            class FakePedido:
                pk = 0
                mesa_id = vieja_mesa.id
                estado = 'cerrado'
            _notificar_mesa(FakePedido)
            
        return pedido

    @strawberry.mutation
    def aplicar_descuento_propina(self, pedido_id: int, descuento: float, propina: float) -> PedidoType:
        pedido = Pedido.objects.get(pk=pedido_id)
        pedido.descuento = Decimal(str(descuento))
        pedido.propina = Decimal(str(propina))
        pedido.save()
        _notificar_mesa(pedido)
        return pedido

    @strawberry.mutation
    def actualizar_cantidad_detalle(self, detalle_id: int, cantidad: int) -> PedidoType:
        detalle = DetallePedido.objects.get(pk=detalle_id)
        pedido = detalle.pedido
        if cantidad <= 0:
            detalle.delete()
        else:
            detalle.cantidad = cantidad
            detalle.save()
            
        # Si el pedido quedó sin detalles, cerrarlo y liberar la mesa
        if not pedido.detalles.exists():
            pedido.estado = Pedido.EstadoMesa.CERRADO
            pedido.save()
            if pedido.mesa:
                pedido.mesa.estado = Mesa.Estado.LIBRE
                pedido.mesa.save()
                
            # Notificar websocket
            class FakePedido:
                pk = 0
                mesa_id = pedido.mesa.id
                estado = 'cerrado'
            _notificar_mesa(FakePedido)
        else:
            _notificar_cocina_actualizado(pedido)
            _notificar_mesa(pedido)
            
        return pedido

    @strawberry.mutation
    def agregar_item_por_codigo_barras(self, pedido_id: int, codigo_barras: str) -> PedidoType:
        from caja.models import CajaDiaria
        if not CajaDiaria.objects.filter(hora_cierre__isnull=True).exists():
            raise Exception("No se pueden registrar consumos porque la caja está cerrada. Por favor, abre la caja primero.")
        from productos.models import Producto
        pedido = Pedido.objects.get(pk=pedido_id)
        producto = Producto.objects.filter(codigo_barras=codigo_barras, activo=True).first()
        if not producto:
            raise Exception("Producto no encontrado con el código de barras provisto.")
            
        DetallePedido.objects.create(
            pedido=pedido,
            producto=producto,
            cantidad=1,
            precio_unitario=producto.precio
        )
        
        estados_a_reactivar = [
            Pedido.EstadoMesa.ENTREGADO,
            Pedido.EstadoMesa.LISTO,
            Pedido.EstadoMesa.COBRAR,
        ]
        if pedido.estado in estados_a_reactivar:
            pedido.estado = Pedido.EstadoMesa.ABIERTO
            pedido.save()
            
        _notificar_cocina(pedido)
        _notificar_mesa(pedido)
        return pedido

    @strawberry.mutation
    def dividir_cuenta(
        self,
        pedido_id: int,
        detalles_div: List[DetalleDivisionInput],
        medio: str,
        cajera_id: int
    ) -> PedidoType:
        from django.db import transaction
        from caja.models import CajaDiaria, Pago
        
        pedido_original = Pedido.objects.get(pk=pedido_id)
        
        caja = CajaDiaria.objects.filter(hora_cierre__isnull=True).order_by('-hora_apertura').first()
        if not caja:
            caja = CajaDiaria.objects.filter(fecha=timezone.localdate()).order_by('-hora_apertura').first()
        if not caja:
            raise Exception("No hay ninguna caja abierta para registrar el cobro.")

        if not detalles_div:
            raise Exception("No se seleccionaron ítems válidos para cobrar.")

        with transaction.atomic():
            pedido_nuevo = Pedido.objects.create(
                origen=Pedido.Origen.MESA,
                mesa=pedido_original.mesa,
                estado=Pedido.EstadoMesa.CERRADO,
                cliente=pedido_original.cliente
            )
            
            total_cobrado = Decimal('0.00')
            for item in detalles_div:
                detalle = DetallePedido.objects.get(pk=item.detalle_id, pedido=pedido_original)
                if item.cantidad <= 0 or item.cantidad > detalle.cantidad:
                    raise Exception(f"Cantidad no válida para cobrar de {detalle.producto or detalle.combo}")
                
                subtotal_cobrado = detalle.precio_unitario * item.cantidad
                total_cobrado += subtotal_cobrado
                
                if item.cantidad == detalle.cantidad:
                    # Mover el detalle completo
                    detalle.pedido = pedido_nuevo
                    detalle.save()
                else:
                    # Crear nuevo detalle en el pedido nuevo y reducir la cantidad en el original
                    DetallePedido.objects.create(
                        pedido=pedido_nuevo,
                        producto=detalle.producto,
                        combo=detalle.combo,
                        cantidad=item.cantidad,
                        precio_unitario=detalle.precio_unitario,
                        nota=detalle.nota
                    )
                    detalle.cantidad -= item.cantidad
                    detalle.save()
                
            Pago.objects.create(
                pedido=pedido_nuevo,
                caja=caja,
                medio=medio,
                monto=total_cobrado,
                confirmado=True
            )
            
            # Recargar de base de datos para ver si quedan detalles en el pedido original
            pedido_original.refresh_from_db()
            original_vacio = not pedido_original.detalles.exists()
            if original_vacio:
                pedido_original.estado = Pedido.EstadoMesa.CERRADO
                pedido_original.save()
                
                if pedido_original.mesa:
                    pedido_original.mesa.estado = Mesa.Estado.LIBRE
                    pedido_original.mesa.save()
                    
                class FakePedido:
                    pk = 0
                    mesa_id = pedido_original.mesa.id
                    estado = 'cerrado'
                _notificar_mesa(FakePedido)
            else:
                _notificar_mesa(pedido_original)

        return pedido_original


def _crear_detalles(pedido: Pedido, detalles: List[DetallePedidoInput]):
    from productos.models import Producto, Combo
    for d in detalles:
        precio = 0
        producto = combo = None
        if d.producto_id:
            producto = Producto.objects.get(pk=d.producto_id)
            precio = producto.precio
        elif d.combo_id:
            combo = Combo.objects.get(pk=d.combo_id)
            precio = combo.precio
        DetallePedido.objects.create(
            pedido=pedido, producto=producto, combo=combo,
            cantidad=d.cantidad, precio_unitario=precio, nota=d.nota,
        )


def _notificar_cocina(pedido: Pedido):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)('cocina', {
        'type': 'pedido_nuevo',
        'data': {'pedido_id': pedido.pk, 'mesa': pedido.mesa.nombre if pedido.mesa else 'Online'},
    })


def _notificar_cocina_actualizado(pedido: Pedido):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)('cocina', {
        'type': 'pedido_actualizado',
        'data': {'pedido_id': pedido.pk, 'estado': pedido.estado},
    })


def _notificar_caja_cobrar(pedido: Pedido):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)('caja', {
        'type': 'aviso_cobrar',
        'data': {'pedido_id': pedido.pk, 'mesa': pedido.mesa.nombre if pedido.mesa else ''},
    })


def _notificar_caja_listo(pedido: Pedido):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)('caja', {
        'type': 'pedido_listo',
        'data': {'pedido_id': pedido.pk, 'mesa': pedido.mesa.nombre if pedido.mesa else 'Online'},
    })


def _notificar_mesa(pedido: Pedido):
    if not pedido.mesa_id:
        return
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(f'mesa_{pedido.mesa_id}', {
        'type': 'pedido_estado',
        'data': {'pedido_id': pedido.pk, 'estado': pedido.estado},
    })


def _notificar_pedido(pedido: Pedido):
    """Notifica al cliente online que sigue el estado de su pedido individual."""
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(f'pedido_{pedido.pk}', {
        'type': 'pedido_estado',
        'data': {'pedido_id': pedido.pk, 'estado': pedido.estado},
    })
