import { gql } from '@apollo/client'

export const GET_MESA_CLIENTE = gql`
  query GetMesaCliente($id: String!) {
    mesa(id: $id) {
      id
      nombre
      estado
    }
  }
`

export const GET_COMBOS_ACTIVOS_MENU = gql`
  query GetCombosActivosMenu {
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

export const GET_MENU_COMPLETO = gql`
  query GetMenuCompleto {
    categorias {
      id
      nombre
      orden
    }
    menu {
      id
      nombre
      descripcion
      precio
      fotoUrl
      categoria {
        id
      }
    }
  }
`

export const GET_PEDIDOS_MESA = gql`
  query GetPedidosMesa($mesaId: Int!) {
    pedidosMesa(mesaId: $mesaId) {
      id
      numeroPedido
      estado
      total
      detalles {
        id
        nombreItem
        cantidad
        nota
        subtotal
        creadoEn
      }
    }
  }
`

export const CREAR_PEDIDO_MESA = gql`
  mutation CrearPedidoMesa($mesaId: Int!, $detalles: [DetallePedidoInput!]!) {
    crearPedidoMesa(mesaId: $mesaId, detalles: $detalles) {
      id
      numeroPedido
      estado
      total
    }
  }
`

export const AGREGAR_ITEMS = gql`
  mutation AgregarItems($pedidoId: Int!, $detalles: [DetallePedidoInput!]!) {
    agregarItems(pedidoId: $pedidoId, detalles: $detalles) {
      id
      numeroPedido
      estado
      total
    }
  }
`

export const PEDIR_CUENTA = gql`
  mutation PedirCuenta($pedidoId: Int!) {
    pedirCuenta(pedidoId: $pedidoId) {
      id
      estado
    }
  }
`

export const ACTUALIZAR_CANTIDAD_DETALLE = gql`
  mutation ActualizarCantidadDetalle($detalleId: Int!, $cantidad: Int!) {
    actualizarCantidadDetalle(detalleId: $detalleId, cantidad: $cantidad) {
      id
      numeroPedido
      estado
      total
      detalles {
        id
        nombreItem
        cantidad
        nota
        subtotal
        creadoEn
      }
    }
  }
`
