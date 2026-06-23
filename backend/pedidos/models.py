from django.db import models
from django.conf import settings


class Pedido(models.Model):
    class Origen(models.TextChoices):
        MESA = 'mesa', 'Mesa'
        ONLINE = 'online', 'Online'

    class EstadoMesa(models.TextChoices):
        ABIERTO         = 'abierto',         'Abierto'
        EN_PREPARACION  = 'en_preparacion',  'En preparación'
        LISTO           = 'listo',           'Listo para entregar'
        ENTREGADO       = 'entregado',       'Entregado'
        COBRAR          = 'cobrar',          'Pedir cuenta'
        CERRADO         = 'cerrado',         'Cerrado'

    class EstadoOnline(models.TextChoices):
        PENDIENTE_PAGO = 'pendiente_pago', 'Pendiente de pago'
        PAGO_CONFIRMADO = 'pago_confirmado', 'Pago confirmado'
        EN_COCINA = 'en_cocina', 'En cocina'
        LISTO = 'listo', 'Listo'
        ENTREGADO = 'entregado', 'Entregado'
        CANCELADO = 'cancelado', 'Cancelado'

    class TipoEntrega(models.TextChoices):
        LOCAL = 'local', 'En mesa'
        DELIVERY = 'delivery', 'Delivery'
        RECOJO = 'recojo', 'Recojo en local'

    origen = models.CharField(max_length=10, choices=Origen.choices)
    mesa = models.ForeignKey(
        'mesas.Mesa', null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos'
    )
    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos'
    )
    caja = models.ForeignKey(
        'caja.CajaDiaria', null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos'
    )
    numero_pedido = models.PositiveIntegerField(null=True, blank=True)
    tipo_entrega = models.CharField(max_length=10, choices=TipoEntrega.choices, default=TipoEntrega.LOCAL)
    estado = models.CharField(max_length=20, default=EstadoMesa.ABIERTO)
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    propina = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    nota_general = models.TextField(blank=True)

    @property
    def subtotal(self):
        return sum(d.subtotal for d in self.detalles.all())

    @property
    def total(self):
        return self.subtotal + self.costo_envio + self.propina - self.descuento

    def save(self, *args, **kwargs):
        if not self.numero_pedido:
            from caja.models import CajaDiaria
            caja_abierta = CajaDiaria.objects.filter(hora_cierre__isnull=True).order_by('-hora_apertura').first()
            if caja_abierta:
                self.caja = caja_abierta
                max_num = Pedido.objects.filter(caja=caja_abierta).aggregate(models.Max('numero_pedido'))['numero_pedido__max']
                self.numero_pedido = (max_num or 0) + 1
            else:
                import datetime
                hoy = datetime.date.today()
                max_num = Pedido.objects.filter(creado_en__date=hoy).aggregate(models.Max('numero_pedido'))['numero_pedido__max']
                self.numero_pedido = (max_num or 0) + 1
        super().save(*args, **kwargs)

    def __str__(self):
        num = self.numero_pedido if self.numero_pedido else self.pk
        if self.origen == self.Origen.MESA and self.mesa:
            return f'Pedido #{num} - {self.mesa}'
        return f'Pedido #{num} - Online'

    class Meta:
        ordering = ['-creado_en']
        verbose_name_plural = 'pedidos'


class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(
        'productos.Producto', null=True, blank=True, on_delete=models.SET_NULL, related_name='detalles'
    )
    combo = models.ForeignKey(
        'productos.Combo', null=True, blank=True, on_delete=models.SET_NULL, related_name='detalles'
    )
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    nota = models.CharField(max_length=255, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    @property
    def subtotal(self):
        return self.precio_unitario * self.cantidad

    def __str__(self):
        item = self.producto or self.combo
        num = self.pedido.numero_pedido if self.pedido and self.pedido.numero_pedido else self.pedido_id
        return f'{self.cantidad}x {item} (Pedido #{num})'

    class Meta:
        verbose_name_plural = 'detalles de pedido'
