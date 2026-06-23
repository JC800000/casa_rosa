import { gql } from '@apollo/client'

export const GET_MESAS = gql`
  query GetMesas {
    mesas {
      id
      nombre
      estado
      activa
      seats
      xPos
      yPos
      area {
        id
        nombre
      }
      qrUrl
      pideCuenta
    }
  }
`

export const GET_AREAS = gql`
  query GetAreas {
    areas {
      id
      nombre
      activo
    }
  }
`

export const CREAR_AREA = gql`
  mutation CrearArea($nombre: String!) {
    crearArea(nombre: $nombre) {
      id
      nombre
      activo
    }
  }
`

export const ACTUALIZAR_AREA = gql`
  mutation ActualizarArea($id: Int!, $nombre: String!) {
    actualizarArea(id: $id, nombre: $nombre) {
      id
      nombre
      activo
    }
  }
`

export const ELIMINAR_AREA = gql`
  mutation EliminarArea($id: Int!) {
    eliminarArea(id: $id)
  }
`

export const GUARDAR_POSICIONES_MESAS = gql`
  mutation GuardarPosicionesMesas($posiciones: [MesaPosInput!]!) {
    guardarPosicionesMesas(posiciones: $posiciones) {
      id
      xPos
      yPos
      area {
        id
      }
    }
  }
`

export const CREAR_MESA = gql`
  mutation CrearMesa($nombre: String!, $areaId: Int, $seats: Int) {
    crearMesa(nombre: $nombre, areaId: $areaId, seats: $seats) {
      id
      nombre
      estado
      seats
      xPos
      yPos
      area {
        id
        nombre
      }
      qrUrl
    }
  }
`

export const ACTUALIZAR_MESA = gql`
  mutation ActualizarMesa($id: Int!, $nombre: String!, $areaId: Int, $seats: Int) {
    actualizarMesa(id: $id, nombre: $nombre, areaId: $areaId, seats: $seats) {
      id
      nombre
      estado
      seats
      xPos
      yPos
      area {
        id
        nombre
      }
      qrUrl
    }
  }
`

export const ELIMINAR_MESA = gql`
  mutation EliminarMesa($id: Int!) {
    eliminarMesa(id: $id)
  }
`

export const TRASLADAR_PEDIDO = gql`
  mutation TrasladarPedido($pedidoId: Int!, $nuevaMesaId: Int!) {
    trasladarPedido(pedidoId: $pedidoId, nuevaMesaId: $nuevaMesaId) {
      id
      estado
    }
  }
`

export const APLICAR_DESCUENTO_PROPINA = gql`
  mutation AplicarDescuentoPropina($pedidoId: Int!, $descuento: Float!, $propina: Float!) {
    aplicarDescuentoPropina(pedidoId: $pedidoId, descuento: $descuento, propina: $propina) {
      id
      total
      descuento
      propina
    }
  }
`

export const DIVIDIR_CUENTA = gql`
  mutation DividirCuenta($pedidoId: Int!, $detallesDiv: [DetalleDivisionInput!]!, $medio: String!, $cajeraId: Int!) {
    dividirCuenta(pedidoId: $pedidoId, detallesDiv: $detallesDiv, medio: $medio, cajeraId: $cajeraId) {
      id
      total
      detalles {
        id
        nombreItem
        cantidad
        subtotal
      }
    }
  }
`

export const AGREGAR_ITEM_POR_CODIGO_BARRAS = gql`
  mutation DivierItemPorCodigoBarras($pedidoId: Int!, $codigoBarras: String!) {
    agregarItemPorCodigoBarras(pedidoId: $pedidoId, codigoBarras: $codigoBarras) {
      id
      total
      detalles {
        id
        nombreItem
        cantidad
        subtotal
      }
    }
  }
`
