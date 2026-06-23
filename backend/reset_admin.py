import os
import django

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'casa_rosa.settings.local')
django.setup()

from django.contrib.auth import get_user_model

def reset_admin_password():
    User = get_user_model()
    username = 'admin'
    password = '123'
    
    # Obtener o crear el usuario admin
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'is_superuser': True,
            'is_staff': True,
            'email': 'admin@example.com'
        }
    )
    
    # Si ya existía, nos aseguramos de que sea superusuario
    if not created:
        user.is_superuser = True
        user.is_staff = True
        
    # Establecer la contraseña directamente (esto evade la validación de Django de 8 caracteres/numérica)
    user.set_password(password)
    user.save()
    
    if created:
        print(f"¡Usuario '{username}' creado exitosamente con la contraseña '{password}'!")
    else:
        print(f"¡La contraseña del usuario '{username}' ha sido actualizada exitosamente a '{password}'!")

if __name__ == '__main__':
    reset_admin_password()
