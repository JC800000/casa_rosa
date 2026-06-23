import { gql } from '@apollo/client'

export const GET_CATEGORIAS = gql`
  query GetCategorias {
    categorias {
      id
      nombre
      orden
    }
  }
`

export const GET_PRODUCTOS = gql`
  query GetProductos {
    productos {
      id
      nombre
      descripcion
      precio
      disponible
      activo
      fotoUrl
      categoria {
        id
        nombre
      }
    }
  }
`

export const CREAR_CATEGORIA = gql`
  mutation CrearCategoria($nombre: String!, $orden: Int!) {
    crearCategoria(nombre: $nombre, orden: $orden) {
      id nombre orden
    }
  }
`

export const ACTUALIZAR_CATEGORIA = gql`
  mutation ActualizarCategoria($id: Int!, $nombre: String!, $orden: Int!) {
    actualizarCategoria(id: $id, nombre: $nombre, orden: $orden) {
      id nombre orden
    }
  }
`

export const ELIMINAR_CATEGORIA = gql`
  mutation EliminarCategoria($id: Int!) {
    eliminarCategoria(id: $id)
  }
`

export const CREAR_PRODUCTO = gql`
  mutation CrearProducto(
    $nombre: String!, $precio: Float!, $categoriaId: Int!,
    $descripcion: String!, $disponible: Boolean!, $fotoPath: String
  ) {
    crearProducto(
      nombre: $nombre, precio: $precio, categoriaId: $categoriaId,
      descripcion: $descripcion, disponible: $disponible, fotoPath: $fotoPath
    ) {
      id nombre precio disponible fotoUrl categoria { id nombre }
    }
  }
`

export const ACTUALIZAR_PRODUCTO = gql`
  mutation ActualizarProducto(
    $id: Int!, $nombre: String, $precio: Float,
    $descripcion: String, $disponible: Boolean, $categoriaId: Int, $fotoPath: String
  ) {
    actualizarProducto(
      id: $id, nombre: $nombre, precio: $precio,
      descripcion: $descripcion, disponible: $disponible, categoriaId: $categoriaId, fotoPath: $fotoPath
    ) {
      id nombre precio disponible fotoUrl categoria { id nombre }
    }
  }
`

export const TOGGLE_DISPONIBLE = gql`
  mutation ToggleDisponible($productoId: Int!) {
    toggleDisponible(productoId: $productoId) {
      id disponible
    }
  }
`

export const ELIMINAR_PRODUCTO = gql`
  mutation EliminarProducto($id: Int!) {
    eliminarProducto(id: $id)
  }
`
