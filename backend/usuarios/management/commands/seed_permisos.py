from django.core.management.base import BaseCommand
from usuarios.models import Permiso, Rol

PERMISOS = [
    ('ver_cocina',          'Ver pantalla de cocina (KDS)'),
    ('ver_caja',            'Acceder a la caja, cobrar y registrar gastos'),
    ('gestionar_productos', 'Crear y editar productos y categorías'),
    ('gestionar_mesas',     'Gestionar mesas y generar códigos QR'),
    ('gestionar_usuarios',  'Gestionar usuarios, roles y permisos'),
]

ROLES_DEFAULT = {
    'Cajera':   ['ver_caja'],
    'Cocinero': ['ver_cocina'],
    'Mozo':     ['ver_caja', 'gestionar_mesas'],
}


class Command(BaseCommand):
    help = 'Crea los permisos y roles por defecto de Casa Rosa'

    def handle(self, *args, **options):
        self.stdout.write('Creando permisos...')
        permisos = {}
        for codigo, desc in PERMISOS:
            p, created = Permiso.objects.get_or_create(
                codigo=codigo,
                defaults={'descripcion': desc},
            )
            permisos[codigo] = p
            estado = 'creado' if created else 'ya existe'
            self.stdout.write(f'  {codigo} ({estado})')

        self.stdout.write('\nCreando roles por defecto...')
        for nombre_rol, codigos in ROLES_DEFAULT.items():
            rol, created = Rol.objects.get_or_create(nombre=nombre_rol)
            rol.permisos.set([permisos[c] for c in codigos])
            estado = 'creado' if created else 'actualizado'
            self.stdout.write(f'  {nombre_rol} ({estado}) — permisos: {", ".join(codigos)}')

        self.stdout.write(self.style.SUCCESS('\nListo. Ejecutá este comando cada vez que agregues nuevos permisos.'))
