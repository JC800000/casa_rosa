from django.apps import AppConfig


class MesasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mesas'

    def ready(self):
        import sys
        # No ejecutar durante comandos de migración o comandos especiales de mantenimiento
        avoid_commands = {'migrate', 'makemigrations', 'collectstatic', 'createsuperuser', 'test', 'showmigrations'}
        if not (set(sys.argv) & avoid_commands):
            import threading

            def check_ip_and_regenerate():
                try:
                    from django.conf import settings
                    from configuracion.models import Configuracion
                    from .models import Mesa

                    frontend_url = getattr(settings, 'FRONTEND_URL', None)
                    if frontend_url:
                        config = Configuracion.get()
                        current_url = config.frontend_url.lower() if config.frontend_url else ''
                        is_current_local = (
                            not current_url or
                            'localhost' in current_url or
                            '127.0.0.1' in current_url or
                            '192.168.' in current_url or
                            '10.' in current_url or
                            '172.' in current_url
                        )
                        if is_current_local and config.frontend_url != frontend_url:
                            config.frontend_url = frontend_url
                            config.save()
                            # Regenerar los códigos QR de todas las mesas
                            for mesa in Mesa.objects.all():
                                mesa.generar_qr(frontend_url)
                                mesa.save()
                            print(f"\n[Casa Rosa] ¡Detectado cambio de IP! frontend_url actualizado a: {frontend_url}")
                            print("[Casa Rosa] Se regeneraron de forma exitosa los códigos QR para todas las mesas.\n")
                except Exception:
                    # Silenciosamente ignorar si la base de datos no está inicializada o faltan tablas
                    pass

            threading.Thread(target=check_ip_and_regenerate, daemon=True).start()


