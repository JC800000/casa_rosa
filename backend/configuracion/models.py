from django.db import models


class ItemShowcase(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.CharField(max_length=500, blank=True, default='')
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    foto = models.ImageField(upload_to='showcase/')
    orden = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    color_tema = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        ordering = ['orden']
        verbose_name = 'Item Showcase'
        verbose_name_plural = 'Items Showcase'

    def __str__(self):
        return self.nombre


class Configuracion(models.Model):
    """Singleton de configuración del negocio. Siempre se usa pk=1."""
    nombre_negocio = models.CharField(max_length=200, default='Casa Rosa')
    telefono_whatsapp = models.CharField(max_length=20, blank=True)
    qr_pago_imagen = models.ImageField(upload_to='config/', null=True, blank=True)
    costo_delivery = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    horario_manana_inicio = models.TimeField(default='08:00')
    horario_manana_fin = models.TimeField(default='12:00')
    horario_tarde_inicio = models.TimeField(default='14:00')
    horario_tarde_fin = models.TimeField(default='18:00')
    frontend_url = models.CharField(max_length=200, default='http://localhost:5173')
    direccion_fisica = models.CharField(max_length=300, default='Av. Las Rosas #123, Zona Central, Bolivia')
    horario_atencion = models.CharField(max_length=150, default='Lunes a Domingo: 8:00 AM – 10:00 PM')
    google_maps_url = models.URLField(max_length=500, default='https://maps.google.com')
    google_maps_embed_url = models.URLField(max_length=1000, blank=True, default='')
    estacionamiento_detalle = models.CharField(max_length=200, default='Disponible frente al local')
    foto_historia = models.ImageField(upload_to='config/', null=True, blank=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        old_url = None
        try:
            old_instance = Configuracion.objects.get(pk=1)
            old_url = old_instance.frontend_url
        except Configuracion.DoesNotExist:
            pass

        super().save(*args, **kwargs)

        if old_url != self.frontend_url:
            try:
                from mesas.models import Mesa
                for mesa in Mesa.objects.all():
                    mesa.generar_qr(self.frontend_url)
                    mesa.save()
                print(f"[Casa Rosa] URL del frontend cambio de {old_url} a {self.frontend_url}. Se regeneraron todos los codigos QR.")
            except Exception:
                pass


    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Configuración del sistema'

    class Meta:
        verbose_name_plural = 'configuracion'
