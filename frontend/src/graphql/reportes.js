import { gql } from '@apollo/client'

export const GET_REPORTE_VENTAS = gql`
  query GetReporteVentas($fechaInicio: String!, $fechaFin: String!) {
    reporteVentas(fechaInicio: $fechaInicio, fechaFin: $fechaFin) {
      totalBruto
      totalEfectivo
      totalQr
      totalGastos
      totalNeto
      ventasPorDia {
        fecha
        total
        efectivo
        qr
      }
      topProductos {
        nombre
        cantidad
        total
      }
      topCombos {
        nombre
        cantidad
        total
      }
      cajas {
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
        realEfectivo
        realQr
        diferenciaEfectivo
        diferenciaQr
        observacion
        cajeraAperturaNombre
        cajeraCierreNombre
      }
    }
  }
`
