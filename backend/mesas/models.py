from django.db import models
from django.conf import settings
import qrcode
import io
import re
from django.core.files.base import ContentFile


def _nombre_a_slug(nombre: str) -> str:
    num = re.search(r'\d+', nombre)
    if num:
        return num.group()
    return re.sub(r'[^a-z0-9]+', '-', nombre.lower()).strip('-')


class Area(models.Model):
    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = 'areas'


class Mesa(models.Model):
    class Estado(models.TextChoices):
        LIBRE = 'libre', 'Libre'
        OCUPADA = 'ocupada', 'Ocupada'
        RESERVADA = 'reservada', 'Reservada'

    nombre = models.CharField(max_length=50)
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, related_name='mesas')
    seats = models.PositiveIntegerField(default=4)
    x_pos = models.IntegerField(default=50)
    y_pos = models.IntegerField(default=50)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.LIBRE)
    qr_imagen = models.ImageField(upload_to='qr/', null=True, blank=True)
    activa = models.BooleanField(default=True)

    @property
    def slug(self) -> str:
        return _nombre_a_slug(self.nombre)

    def get_url(self, base_url: str = '') -> str:
        return f'{base_url}/mesa/{self.slug}'

    def generar_qr(self, base_url: str = ''):
        url = self.get_url(base_url)
        img = qrcode.make(url)
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        filename = f'mesa_{self.slug}_{self.pk}.png'
        self.qr_imagen.save(filename, ContentFile(buffer.getvalue()), save=False)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = 'mesas'


class Reserva(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        CONFIRMADA = 'confirmada', 'Confirmada'
        RECHAZADA = 'rechazada', 'Rechazada'
        CANCELADA = 'cancelada', 'Cancelada'

    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas'
    )
    nombre_cliente = models.CharField(max_length=100)
    telefono_cliente = models.CharField(max_length=50)
    fecha = models.DateField()
    hora = models.TimeField()
    personas = models.PositiveIntegerField()
    mesa = models.ForeignKey(
        Mesa, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas'
    )
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    notas = models.TextField(blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Reserva {self.nombre_cliente} - {self.fecha} {self.hora}'

    class Meta:
        verbose_name_plural = 'reservas'
        ordering = ['-fecha', '-hora']
