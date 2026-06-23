import { gql } from '@apollo/client'

export const GET_ITEMS_SHOWCASE = gql`
  query GetItemsShowcase {
    itemsShowcase {
      id
      nombre
      descripcion
      precio
      fotoUrl
      orden
      activo
      colorTema
    }
  }
`

export const CREAR_ITEM_SHOWCASE = gql`
  mutation CrearItemShowcase($nombre: String!, $precio: Float!, $fotoPath: String!, $descripcion: String, $colorTema: String) {
    crearItemShowcase(nombre: $nombre, precio: $precio, fotoPath: $fotoPath, descripcion: $descripcion, colorTema: $colorTema) {
      id
      nombre
      descripcion
      precio
      fotoUrl
      orden
      activo
      colorTema
    }
  }
`

export const ACTUALIZAR_ITEM_SHOWCASE = gql`
  mutation ActualizarItemShowcase($id: Int!, $nombre: String, $precio: Float, $descripcion: String, $activo: Boolean, $fotoPath: String, $colorTema: String) {
    actualizarItemShowcase(id: $id, nombre: $nombre, precio: $precio, descripcion: $descripcion, activo: $activo, fotoPath: $fotoPath, colorTema: $colorTema) {
      id
      nombre
      descripcion
      precio
      fotoUrl
      orden
      activo
      colorTema
    }
  }
`

export const ELIMINAR_ITEM_SHOWCASE = gql`
  mutation EliminarItemShowcase($id: Int!) {
    eliminarItemShowcase(id: $id)
  }
`

export const MOVER_ITEM_SHOWCASE = gql`
  mutation MoverItemShowcase($id: Int!, $direccion: String!) {
    moverItemShowcase(id: $id, direccion: $direccion) {
      id
      nombre
      orden
      activo
      fotoUrl
      precio
      descripcion
      colorTema
    }
  }
`

export const GET_CONFIGURACION = gql`
  query Configuracion {
    configuracion {
      nombreNegocio
      telefonoWhatsapp
      costoDelivery
      qrPagoUrl
      fotoHistoriaUrl
      abiertoAhora
      horarioMananaInicio
      horarioMananaFin
      horarioTardeInicio
      horarioTardeFin
      direccionFisica
      horarioAtencion
      googleMapsUrl
      googleMapsEmbedUrl
      estacionamientoDetalle
    }
  }
`

export const ACTUALIZAR_CONFIGURACION = gql`
  mutation ActualizarConfiguracion(
    $nombreNegocio: String
    $telefonoWhatsapp: String
    $costoDelivery: Float
    $qrPath: String
    $horarioMananaInicio: String
    $horarioMananaFin: String
    $horarioTardeInicio: String
    $horarioTardeFin: String
    $direccionFisica: String
    $horarioAtencion: String
    $googleMapsUrl: String
    $googleMapsEmbedUrl: String
    $estacionamientoDetalle: String
  ) {
    actualizarConfiguracion(
      nombreNegocio: $nombreNegocio
      telefonoWhatsapp: $telefonoWhatsapp
      costoDelivery: $costoDelivery
      qrPath: $qrPath
      horarioMananaInicio: $horarioMananaInicio
      horarioMananaFin: $horarioMananaFin
      horarioTardeInicio: $horarioTardeInicio
      horarioTardeFin: $horarioTardeFin
      direccionFisica: $direccionFisica
      horarioAtencion: $horarioAtencion
      googleMapsUrl: $googleMapsUrl
      googleMapsEmbedUrl: $googleMapsEmbedUrl
      estacionamientoDetalle: $estacionamientoDetalle
    ) {
      nombreNegocio
      telefonoWhatsapp
      costoDelivery
      qrPagoUrl
      horarioMananaInicio
      horarioMananaFin
      horarioTardeInicio
      horarioTardeFin
      direccionFisica
      horarioAtencion
      googleMapsUrl
      googleMapsEmbedUrl
      estacionamientoDetalle
    }
  }
`
