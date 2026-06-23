import { gql } from '@apollo/client'

export const GET_COMBOS = gql`
  query GetCombos {
    combos {
      id
      nombre
      precio
      activo
      fechaInicio
      fechaFin
      fotoUrl
      productos {
        id
        nombre
        precio
      }
    }
  }
`

export const GET_COMBOS_ACTIVOS = gql`
  query GetCombosActivos {
    combosActivos {
      id
      nombre
      precio
      fotoUrl
      productos {
        id
        nombre
      }
    }
  }
`

export const CREAR_COMBO = gql`
  mutation CrearCombo(
    $nombre: String!
    $precio: Float!
    $productosIds: [Int!]!
    $activo: Boolean
    $fechaInicio: String
    $fechaFin: String
    $fotoPath: String
  ) {
    crearCombo(
      nombre: $nombre
      precio: $precio
      productosIds: $productosIds
      activo: $activo
      fechaInicio: $fechaInicio
      fechaFin: $fechaFin
      fotoPath: $fotoPath
    ) {
      id
      nombre
      precio
      activo
      fechaInicio
      fechaFin
      fotoUrl
      productos { id nombre precio }
    }
  }
`

export const ACTUALIZAR_COMBO = gql`
  mutation ActualizarCombo(
    $id: Int!
    $nombre: String
    $precio: Float
    $productosIds: [Int!]
    $activo: Boolean
    $fechaInicio: String
    $fechaFin: String
    $fotoPath: String
  ) {
    actualizarCombo(
      id: $id
      nombre: $nombre
      precio: $precio
      productosIds: $productosIds
      activo: $activo
      fechaInicio: $fechaInicio
      fechaFin: $fechaFin
      fotoPath: $fotoPath
    ) {
      id
      nombre
      precio
      activo
      fechaInicio
      fechaFin
      fotoUrl
      productos { id nombre precio }
    }
  }
`

export const ELIMINAR_COMBO = gql`
  mutation EliminarCombo($id: Int!) {
    eliminarCombo(id: $id)
  }
`
