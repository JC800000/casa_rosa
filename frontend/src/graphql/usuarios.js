import { gql } from '@apollo/client'

export const GET_ROLES = gql`
  query Roles {
    roles {
      id
      nombre
      cantUsuarios
      permisos {
        id
        codigo
        descripcion
      }
    }
  }
`

export const GET_PERMISOS_DISPONIBLES = gql`
  query PermisosDisponibles {
    permisosDisponibles {
      id
      codigo
      descripcion
    }
  }
`

export const GET_USUARIOS = gql`
  query Usuarios {
    usuarios {
      id
      username
      email
      isSuperuser
      isActive
      rolNombre
      rol {
        id
        nombre
      }
    }
  }
`

export const CREAR_ROL = gql`
  mutation CrearRol($nombre: String!) {
    crearRol(nombre: $nombre) { id nombre cantUsuarios permisos { id codigo descripcion } }
  }
`

export const ACTUALIZAR_ROL = gql`
  mutation ActualizarRol($id: Int!, $nombre: String!) {
    actualizarRol(id: $id, nombre: $nombre) { id nombre }
  }
`

export const ELIMINAR_ROL = gql`
  mutation EliminarRol($id: Int!) {
    eliminarRol(id: $id)
  }
`

export const SET_PERMISOS_ROL = gql`
  mutation SetPermisosRol($rolId: Int!, $permisoIds: [Int!]!) {
    setPermisosRol(rolId: $rolId, permisoIds: $permisoIds) {
      id nombre
      permisos { id codigo descripcion }
    }
  }
`

export const CREAR_USUARIO = gql`
  mutation CrearUsuario($username: String!, $password: String!, $email: String, $rolId: Int) {
    crearUsuario(username: $username, password: $password, email: $email, rolId: $rolId) {
      id username email isActive rolNombre rol { id nombre }
    }
  }
`

export const ACTUALIZAR_USUARIO = gql`
  mutation ActualizarUsuario($id: Int!, $username: String, $email: String, $isActive: Boolean) {
    actualizarUsuario(id: $id, username: $username, email: $email, isActive: $isActive) {
      id username email isActive rolNombre
    }
  }
`

export const ASIGNAR_ROL = gql`
  mutation AsignarRol($usuarioId: Int!, $rolId: Int) {
    asignarRol(usuarioId: $usuarioId, rolId: $rolId) {
      id username rolNombre rol { id nombre }
    }
  }
`

export const CAMBIAR_PASSWORD = gql`
  mutation CambiarPassword($usuarioId: Int!, $nuevaPassword: String!) {
    cambiarPassword(usuarioId: $usuarioId, nuevaPassword: $nuevaPassword)
  }
`
