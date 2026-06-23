from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView
from schema import schema
from productos.views import upload_foto_view
from configuracion.views import upload_qr_pago_view, upload_foto_historia_view, upload_foto_showcase_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('graphql/', csrf_exempt(GraphQLView.as_view(schema=schema))),
    path('accounts/', include('allauth.urls')),
    path('api/upload-foto/', csrf_exempt(upload_foto_view), name='upload_foto'),
    path('api/upload-qr/', csrf_exempt(upload_qr_pago_view), name='upload_qr'),
    path('api/upload-foto-historia/', csrf_exempt(upload_foto_historia_view), name='upload_foto_historia'),
    path('api/upload-foto-showcase/', csrf_exempt(upload_foto_showcase_view), name='upload_foto_showcase'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
