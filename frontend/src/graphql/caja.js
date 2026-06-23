import { gql } from '@apollo/client'

export const GET_PEDIDOS_POR_ENTREGAR = gql`
  query PedidosPorEntregar {
    pedidosPorEntregar {
      id
      numeroPedido
      nombreMesa
      creadoEn
      detalles {
        id
        cantidad
        nombreItem
        nota
      }
    }
  }
`

export const MARCAR_ENTREGADO = gql`
  mutation MarcarEntregado($pedidoId: Int!) {
    marcarEntregado(pedidoId: $pedidoId) {
      id
      estado
    }
  }
`

export const GET_CAJA_HOY = gql`
  query CajaHoy {
    cajaHoy {
      id
      fecha
      horaApertura
      horaCierre
      fondoInicial
      ventasEfectivo
      ventasQr
      totalGastos
      esperadoEfectivo
      esperadoQr
      diferenciaEfectivo
      diferenciaQr
      cajeraAperturaNombre
      cajeraCierreNombre
      gastos {
        id
        monto
        descripcion
        via
        registradoEn
      }
    }
  }
`

export const GET_HISTORIAL_CAJAS = gql`
  query HistorialCajas {
    historialCajas {
      id
      fecha
      horaApertura
      horaCierre
      fondoInicial
      ventasEfectivo
      ventasQr
      totalGastos
      esperadoEfectivo
      esperadoQr
      diferenciaEfectivo
      diferenciaQr
      cajeraAperturaNombre
      cajeraCierreNombre
      observacion
    }
  }
`

export const GET_PEDIDOS_A_COBRAR = gql`
  query PedidosACobrar {
    pedidosACobrar {
      id
      numeroPedido
      total
      nombreMesa
      creadoEn
      detalles {
        id
        cantidad
        nombreItem
        nota
        subtotal
      }
    }
  }
`

export const ABRIR_CAJA = gql`
  mutation AbrirCaja($fondoInicial: Float!, $cajeraId: Int!) {
    abrirCaja(fondoInicial: $fondoInicial, cajeraId: $cajeraId) {
      id
      fecha
      fondoInicial
    }
  }
`

export const REGISTRAR_COBRO = gql`
  mutation RegistrarCobro($pedidoId: Int!, $medio: String!, $cajeraId: Int!) {
    registrarCobro(pedidoId: $pedidoId, medio: $medio, cajeraId: $cajeraId)
  }
`

export const REGISTRAR_GASTO = gql`
  mutation RegistrarGasto($monto: Float!, $descripcion: String!, $via: String!, $registradoPorId: Int!) {
    registrarGasto(monto: $monto, descripcion: $descripcion, via: $via, registradoPorId: $registradoPorId) {
      id
      monto
      descripcion
      via
    }
  }
`

export const CERRAR_CAJA = gql`
  mutation CerrarCaja($cajaId: Int!, $realEfectivo: Float!, $realQr: Float!, $observacion: String) {
    cerrarCaja(cajaId: $cajaId, realEfectivo: $realEfectivo, realQr: $realQr, observacion: $observacion) {
      id
      horaCierre
      diferenciaEfectivo
      diferenciaQr
    }
  }
`

export const GET_MOVIMIENTOS_CAJA = gql`
  query MovimientosCaja($fechaInicio: String!, $fechaFin: String!) {
    movimientosCaja(fechaInicio: $fechaInicio, fechaFin: $fechaFin) {
      totalVentas
      numVentas
      totalEfectivo
      totalQr
      totalGastos
      numGastos
      balance
      fondoInicial
      pagos {
        id
        pedidoId
        pedidoNumeroPedido
        mesaNombre
        medio
        monto
        registradoEn
      }
      gastos {
        id
        monto
        descripcion
        via
        registradoEn
      }
    }
  }
`

