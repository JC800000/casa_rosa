from django.contrib.auth.models import AbstractUser
from django.db import models


class Permiso(models.Model):
    codigo = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=255)

    def __str__(self):
        return self.codigo

    class Meta:
        verbose_name_plural = 'permisos'


class Rol(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    permisos = models.ManyToManyField(Permiso, blank=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = 'roles'


class Usuario(AbstractUser):
    rol = models.ForeignKey(Rol, null=True, blank=True, on_delete=models.SET_NULL, related_name='usuarios')

    def tiene_permiso(self, codigo: str) -> bool:
        if self.is_superuser:
            return True
        return self.rol.permisos.filter(codigo=codigo).exists() if self.rol else False

    def __str__(self):
        return self.username
