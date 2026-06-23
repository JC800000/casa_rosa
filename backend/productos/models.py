from django.db import models


class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    orden = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name_plural = 'categorias'





class Producto(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    foto = models.ImageField(upload_to='productos/', null=True, blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos')
    codigo_barras = models.CharField(max_length=100, null=True, blank=True, unique=True)
    disponible = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

    class Meta:
        ordering = ['categoria__orden', 'nombre']
        verbose_name_plural = 'productos'


class Combo(models.Model):
    nombre = models.CharField(max_length=200)
    foto = models.ImageField(upload_to='combos/', null=True, blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    productos = models.ManyToManyField(Producto, related_name='combos')
    activo = models.BooleanField(default=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = 'combos'

