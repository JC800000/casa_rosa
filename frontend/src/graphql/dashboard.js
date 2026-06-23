import { gql } from '@apollo/client'

export const GET_DASHBOARD = gql`
  query Dashboard {
    mesas {
      id
      nombre
      estado
      xPos
      yPos
    }
    productos {
      id
    }
    cajaHoy {
      id
      fondoInicial
      ventasEfectivo
      ventasQr
      totalGastos
      horaCierre
    }
    pedidosCocina {
      id
      numeroPedido
      estado
      nombreMesa
      creadoEn
      detalles {
        id
        cantidad
        nombreItem
      }
    }
    statsHoy {
      pedidosHoy
      pedidosPendientes
      ventasTotales
      ticketPromedio
      tiempoEsperaPromedio
      ocupacionMesasPorcentaje
      topProductos {
        nombre
        cantidad
        fotoUrl
      }
      pedidosPorHora {
        hora
        cantidad
      }
    }
  }
`
