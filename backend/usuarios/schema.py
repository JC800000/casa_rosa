import strawberry
from strawberry import auto
from strawberry.types import Info
from typing import Optional, List
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from .models import Usuario, Rol, Permiso


# ─── Types ────────────────────────────────────────────────────────

@strawberry.django.type(Permiso)
class PermisoType:
    id: auto
    codigo: auto
    descripcion: auto


@strawberry.django.type(Rol)
class RolType:
    id: auto
    nombre: auto

    @strawberry.field
    def permisos(self) -> List[PermisoType]:
        return self.permisos.all()

    @strawberry.field
    def cant_usuarios(self) -> int:
        return self.usuarios.count()


@strawberry.django.type(Usuario)
class UsuarioType:
    id: auto
    username: auto
    email: auto
    is_superuser: auto
    is_active: auto

    @strawberry.field
    def rol_nombre(self) -> str:
        if self.is_superuser:
            return 'Administrador'
        return self.rol.nombre if self.rol_id else 'Sin rol'

    @strawberry.field
    def rol(self) -> Optional[RolType]:
        return self.rol if self.rol_id else None

    @strawberry.field
    def permisos(self) -> List[str]:
        if self.is_superuser:
            return list(Permiso.objects.values_list('codigo', flat=True))
        if not self.rol_id:
            return []
        return list(self.rol.permisos.values_list('codigo', flat=True))

    @strawberry.field
    def avatar_url(self) -> Optional[str]:
        social_account = self.socialaccount_set.filter(provider='google').first()
        if social_account and social_account.extra_data:
            return social_account.extra_data.get('picture')
        return None


@strawberry.type
class LoginResult:
    success: bool
    mensaje: str = ''
    usuario: Optional[UsuarioType] = None


# ─── Queries ──────────────────────────────────────────────────────

@strawberry.type
class UsuarioQuery:
    @strawberry.field
    def me(self, info: Info) -> Optional[UsuarioType]:
        user = info.context.request.user
        return user if user.is_authenticated else None

    @strawberry.field
    def roles(self, info: Info) -> List[RolType]:
        return Rol.objects.all().order_by('nombre')

    @strawberry.field
    def permisos_disponibles(self, info: Info) -> List[PermisoType]:
        return Permiso.objects.all().order_by('codigo')

    @strawberry.field
    def usuarios(self, info: Info) -> List[UsuarioType]:
        _require_permiso(info, 'gestionar_usuarios')
        return Usuario.objects.all().order_by('username')


# ─── Mutations ────────────────────────────────────────────────────

@strawberry.type
class UsuarioMutation:

    # ── Auth ──────────────────────────────────────────────────────
    @strawberry.mutation
    def login(self, info: Info, username: str, password: str) -> LoginResult:
        user = authenticate(info.context.request, username=username, password=password)
        if user:
            auth_login(info.context.request, user)
            return LoginResult(success=True, usuario=user)
        return LoginResult(success=False, mensaje='Usuario o contraseña incorrectos')

    @strawberry.mutation
    def logout(self, info: Info) -> bool:
        auth_logout(info.context.request)
        return True

    # ── Roles ─────────────────────────────────────────────────────
    @strawberry.mutation
    def crear_rol(self, info: Info, nombre: str) -> RolType:
        _require_permiso(info, 'gestionar_usuarios')
        return Rol.objects.create(nombre=nombre.strip())

    @strawberry.mutation
    def actualizar_rol(self, info: Info, id: int, nombre: str) -> RolType:
        _require_permiso(info, 'gestionar_usuarios')
        rol = Rol.objects.get(pk=id)
        rol.nombre = nombre.strip()
        rol.save()
        return rol

    @strawberry.mutation
    def eliminar_rol(self, info: Info, id: int) -> bool:
        _require_permiso(info, 'gestionar_usuarios')
        Rol.objects.filter(pk=id).delete()
        return True

    @strawberry.mutation
    def set_permisos_rol(self, info: Info, rol_id: int, permiso_ids: List[int]) -> RolType:
        _require_permiso(info, 'gestionar_usuarios')
        rol = Rol.objects.get(pk=rol_id)
        rol.permisos.set(permiso_ids)
        return rol

    # ── Usuarios ──────────────────────────────────────────────────
    @strawberry.mutation
    def crear_usuario(
        self,
        info: Info,
        username: str,
        password: str,
        email: Optional[str] = None,
        rol_id: Optional[int] = None,
    ) -> UsuarioType:
        _require_permiso(info, 'gestionar_usuarios')
        user = Usuario.objects.create_user(
            username=username.strip(),
            password=password,
            email=(email or '').strip(),
        )
        if rol_id:
            user.rol_id = rol_id
            user.save()
        return user

    @strawberry.mutation
    def actualizar_usuario(
        self,
        info: Info,
        id: int,
        username: Optional[str] = None,
        email: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> UsuarioType:
        _require_permiso(info, 'gestionar_usuarios')
        user = Usuario.objects.get(pk=id)
        if username is not None:
            user.username = username.strip()
        if email is not None:
            user.email = email.strip()
        if is_active is not None:
            user.is_active = is_active
        user.save()
        return user

    @strawberry.mutation
    def asignar_rol(self, info: Info, usuario_id: int, rol_id: Optional[int]) -> UsuarioType:
        _require_permiso(info, 'gestionar_usuarios')
        user = Usuario.objects.get(pk=usuario_id)
        user.rol_id = rol_id
        user.save()
        return user

    @strawberry.mutation
    def cambiar_password(self, info: Info, usuario_id: int, nueva_password: str) -> bool:
        _require_permiso(info, 'gestionar_usuarios')
        user = Usuario.objects.get(pk=usuario_id)
        user.set_password(nueva_password)
        user.save()
        return True


# ─── Helper ───────────────────────────────────────────────────────

def _require_permiso(info: Info, codigo: str):
    user = info.context.request.user
    if not user.is_authenticated:
        raise Exception('No autenticado')
    if not (user.is_superuser or user.tiene_permiso(codigo)):
        raise Exception(f'Permiso requerido: {codigo}')
