import { gql } from '@apollo/client'

const PEDIDO_ONLINE_FIELDS = gql`
  fragment PedidoOnlineFields on PedidoType {
    id
    numeroPedido
    estado
    tipoEntrega
    costoEnvio
    total
    creadoEn
    clienteNombre
    clienteTelefono
    clienteDireccion
    clienteNota
    detalles {
      id
      cantidad
      nombreItem
      nota
      subtotal
    }
  }
`

export const GET_PEDIDOS_PENDIENTE_PAGO = gql`
  ${PEDIDO_ONLINE_FIELDS}
  query PedidosPendientePago {
    pedidosPendientePago { ...PedidoOnlineFields }
  }
`

export const GET_PEDIDOS_ONLINE_ACTIVOS = gql`
  ${PEDIDO_ONLINE_FIELDS}
  query PedidosOnlineActivos {
    pedidosOnlineActivos { ...PedidoOnlineFields }
  }
`

export const GET_PEDIDOS_ONLINE_HISTORIAL = gql`
  ${PEDIDO_ONLINE_FIELDS}
  query PedidosOnlineHistorial {
    pedidosOnlineHistorial { ...PedidoOnlineFields }
  }
`

export const GET_PEDIDOS_MESA_ACTIVOS = gql`
  query PedidosMesaActivos {
    pedidosMesaActivos {
      id
      numeroPedido
      estado
      total
      nombreMesa
      creadoEn
      detalles {
        id
        cantidad
        nombreItem
        subtotal
      }
    }
  }
`

export const CREAR_PEDIDO_ONLINE = gql`
  mutation CrearPedidoOnline(
    $tipoEntrega: String!
    $costoEnvio: Float!
    $clienteNombre: String!
    $clienteTelefono: String!
    $clienteDireccion: String
    $nota: String
    $detalles: [DetallePedidoInput!]!
  ) {
    crearPedidoOnline(
      tipoEntrega: $tipoEntrega
      costoEnvio: $costoEnvio
      clienteNombre: $clienteNombre
      clienteTelefono: $clienteTelefono
      clienteDireccion: $clienteDireccion
      nota: $nota
      detalles: $detalles
    ) {
      id
      numeroPedido
      estado
      total
      costoEnvio
    }
  }
`

export const CONFIRMAR_PAGO_ONLINE = gql`
  mutation ConfirmarPagoOnline(
    $pedidoId: Int!
    $montoConfirmado: Float!
    $costoEnvioAjustado: Float
  ) {
    confirmarPagoOnline(
      pedidoId: $pedidoId
      montoConfirmado: $montoConfirmado
      costoEnvioAjustado: $costoEnvioAjustado
    ) {
      id
      estado
      total
      costoEnvio
    }
  }
`

export const CANCELAR_PEDIDO_ONLINE = gql`
  mutation CancelarPedidoOnline($pedidoId: Int!) {
    cancelarPedidoOnline(pedidoId: $pedidoId) {
      id
      estado
    }
  }
`

export const GET_MIS_PEDIDOS = gql`
  query MisPedidos {
    misPedidos {
      id
      numeroPedido
      estado
      total
      creadoEn
      tipoEntrega
      detalles {
        id
        cantidad
        nombreItem
        subtotal
      }
    }
  }
`

export const GET_ULTIMO_PEDIDO_ACTIVO = gql`
  query UltimoPedidoActivo {
    ultimoPedidoActivo {
      id
      numeroPedido
      estado
      tipoEntrega
      clienteTelefono
    }
  }
`

