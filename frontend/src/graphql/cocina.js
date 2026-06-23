import { gql } from '@apollo/client'

export const GET_PEDIDOS_COCINA = gql`
  query PedidosCocina {
    pedidosCocina {
      id
      numeroPedido
      estado
      origen
      creadoEn
      notaGeneral
      nombreMesa
      detalles {
        id
        cantidad
        nombreItem
        nota
      }
    }
  }
`

export const ACTUALIZAR_ESTADO_COCINA = gql`
  mutation ActualizarEstadoCocina($pedidoId: Int!, $estado: String!) {
    actualizarEstadoCocina(pedidoId: $pedidoId, estado: $estado) {
      id
      estado
    }
  }
`
