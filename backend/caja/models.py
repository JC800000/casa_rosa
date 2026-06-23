from django.db import models
from django.conf import settings


class CajaDiaria(models.Model):
    fecha = models.DateField()
    hora_apertura = models.DateTimeField()
    hora_cierre = models.DateTimeField(null=True, blank=True)
    fondo_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    real_efectivo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    real_qr = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    observacion = models.TextField(blank=True)
    cajera = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='cajas'
    )
    cajera_cierre = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='cajas_cerradas'
    )

    @property
    def ventas_efectivo(self):
        return sum(p.monto for p in self.pagos.filter(medio='efectivo', confirmado=True))

    @property
    def ventas_qr(self):
        return sum(p.monto for p in self.pagos.filter(medio='qr', confirmado=True))

    @property
    def total_gastos(self):
        return sum(g.monto for g in self.gastos.all())

    @property
    def esperado_efectivo(self):
        return self.fondo_inicial + self.ventas_efectivo - self.total_gastos

    @property
    def esperado_qr(self):
        return self.ventas_qr

    @property
    def diferencia_efectivo(self):
        if self.real_efectivo is None:
            return None
        return self.real_efectivo - self.esperado_efectivo

    @property
    def diferencia_qr(self):
        if self.real_qr is None:
            return None
        return self.real_qr - self.esperado_qr

    def __str__(self):
        return f'Caja {self.fecha}'

    class Meta:
        verbose_name_plural = 'cajas diarias'


class Pago(models.Model):
    class Medio(models.TextChoices):
        EFECTIVO = 'efectivo', 'Efectivo'
        QR = 'qr', 'QR'

    pedido = models.OneToOneField('pedidos.Pedido', on_delete=models.CASCADE, related_name='pago')
    caja = models.ForeignKey(CajaDiaria, on_delete=models.PROTECT, related_name='pagos')
    medio = models.CharField(max_length=10, choices=Medio.choices)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    comprobante = models.ImageField(upload_to='comprobantes/', null=True, blank=True)
    confirmado = models.BooleanField(default=False)
    registrado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Pago {self.medio} - Pedido #{self.pedido_id}'

    class Meta:
        verbose_name_plural = 'pagos'


class Gasto(models.Model):
    class Medio(models.TextChoices):
        EFECTIVO = 'efectivo', 'Efectivo'
        QR = 'qr', 'QR'

    caja = models.ForeignKey(CajaDiaria, on_delete=models.PROTECT, related_name='gastos')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.CharField(max_length=255)
    via = models.CharField(max_length=10, choices=Medio.choices)
    registrado_en = models.DateTimeField(auto_now_add=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='gastos'
    )

    def __str__(self):
        return f'Gasto Bs {self.monto} - {self.descripcion}'

    class Meta:
        verbose_name_plural = 'gastos'
