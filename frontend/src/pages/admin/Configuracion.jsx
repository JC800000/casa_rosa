import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  GET_CONFIGURACION, ACTUALIZAR_CONFIGURACION,
  GET_ITEMS_SHOWCASE, CREAR_ITEM_SHOWCASE, ACTUALIZAR_ITEM_SHOWCASE,
  ELIMINAR_ITEM_SHOWCASE, MOVER_ITEM_SHOWCASE,
} from '../../graphql/configuracion'
import { PALETA_LISTA } from '../../lib/showcasePaleta'

const inputCls = [
  'w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5',
  'text-sm text-gray-800 placeholder:text-gray-400',
  'focus:outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100',
  'transition-all duration-200',
].join(' ')

/* ─── Sección contenedora ─── */
function Section({ titulo, descripcion, icono, children }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-stone-50/60 border-b border-stone-100 flex items-center gap-3">
        {icono && (
          <span className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-base flex-shrink-0">
            {icono}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 leading-snug">{titulo}</h3>
          {descripcion && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{descripcion}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

/* ─── Campo de formulario ─── */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

/* ─── Selector de color ─── */
function SelectorColor({ valor, onChange }) {
  const etiqueta = valor
    ? PALETA_LISTA.find(p => p.key === valor)?.label ?? valor
    : 'Automático (según nombre del producto)'

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        Color de fondo
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Opción automático */}
        <button
          type="button"
          onClick={() => onChange('')}
          title="Automático"
          className={[
            'w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] transition-all duration-200',
            valor === ''
              ? 'border-rose-400 scale-110 shadow-sm'
              : 'border-stone-200 hover:border-stone-400',
          ].join(' ')}
          style={{ background: 'conic-gradient(#f43f5e, #818cf8, #f59e0b, #4ade80, #f43f5e)' }}
        >
          {valor === '' && <span className="text-white font-black drop-shadow text-[10px]">✓</span>}
        </button>

        {PALETA_LISTA.map(({ key, label, swatch }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            title={label}
            className={[
              'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200',
              valor === key
                ? 'border-gray-700 scale-110 shadow-sm'
                : 'border-transparent hover:border-stone-400',
            ].join(' ')}
            style={{ background: swatch }}
          >
            {valor === key && <span className="text-white font-black drop-shadow text-[10px]">✓</span>}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">{etiqueta}</p>
    </div>
  )
}

/* ─── Zona de carga de foto ─── */
function FotoZona({ url, placeholder, ancho = 'w-36', alto = 'h-24', onClick, subiendo, etiqueta = 'Cambiar foto' }) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={onClick}
        disabled={subiendo}
        className={[
          ancho, alto,
          'rounded-xl overflow-hidden border-2 border-dashed border-stone-200',
          'bg-stone-50 flex items-center justify-center flex-shrink-0',
          'hover:border-rose-300 hover:bg-rose-50/40 transition-all duration-200 group',
          subiendo ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">
            {placeholder}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onClick}
        disabled={subiendo}
        className="mt-1 self-start px-4 py-2 text-xs font-semibold bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-gray-600 hover:text-rose-700 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm"
      >
        {subiendo ? (
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Subiendo…
          </span>
        ) : etiqueta}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════
   Showcase — Menú Página de Inicio
════════════════════════════════════════ */
function SeccionShowcase({ mostrarNotif }) {
  const fotoNuevoRef = useRef(null)
  const fotoEditRef  = useRef(null)

  const [nuevo, setNuevo]           = useState({ nombre: '', precio: '', descripcion: '', colorTema: '' })
  const [fotoNuevoUrl, setFotoNuevoUrl] = useState(null)
  const [fotoNuevoPath, setFotoNuevoPath] = useState(null)
  const [subiendoNuevo, setSubiendoNuevo] = useState(false)

  const [editando, setEditando]     = useState(null)
  const [subiendoEdit, setSubiendoEdit] = useState(false)

  const { data, refetch } = useQuery(GET_ITEMS_SHOWCASE)
  const items = data?.itemsShowcase ?? []

  const [crearItem]      = useMutation(CREAR_ITEM_SHOWCASE,      { onCompleted: () => { refetch(); setNuevo({ nombre: '', precio: '', descripcion: '', colorTema: '' }); setFotoNuevoUrl(null); setFotoNuevoPath(null); mostrarNotif('Item agregado', 'ok') }, onError: e => mostrarNotif(e.message, 'error') })
  const [actualizarItem] = useMutation(ACTUALIZAR_ITEM_SHOWCASE, { onCompleted: () => { refetch(); setEditando(null); mostrarNotif('Item actualizado', 'ok') }, onError: e => mostrarNotif(e.message, 'error') })
  const [eliminarItem]   = useMutation(ELIMINAR_ITEM_SHOWCASE,   { onCompleted: () => { refetch(); mostrarNotif('Item eliminado', 'ok') }, onError: e => mostrarNotif(e.message, 'error') })
  const [moverItem]      = useMutation(MOVER_ITEM_SHOWCASE,      { onCompleted: () => refetch(), onError: e => mostrarNotif(e.message, 'error') })

  const subirFoto = async (archivo, destino) => {
    const setter = destino === 'nuevo' ? setSubiendoNuevo : setSubiendoEdit
    setter(true)
    const fd = new FormData()
    fd.append('foto', archivo)
    try {
      const res  = await fetch('/api/upload-foto-showcase/', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        if (destino === 'nuevo') { setFotoNuevoUrl(json.url); setFotoNuevoPath(json.path) }
        else setEditando(e => ({ ...e, fotoUrl: json.url, fotoPath: json.path }))
      } else {
        mostrarNotif(json.error || 'Error al subir', 'error')
      }
    } catch {
      mostrarNotif('Error de red', 'error')
    } finally {
      setter(false)
    }
  }

  const agregarItem = () => {
    if (!nuevo.nombre.trim() || !nuevo.precio || !fotoNuevoPath) {
      mostrarNotif('Nombre, precio y foto son requeridos', 'error')
      return
    }
    crearItem({ variables: { nombre: nuevo.nombre.trim(), precio: parseFloat(nuevo.precio), fotoPath: fotoNuevoPath, descripcion: nuevo.descripcion || '', colorTema: nuevo.colorTema || '' } })
  }

  const guardarEdicion = () => {
    if (!editando) return
    actualizarItem({
      variables: {
        id: parseInt(editando.id),
        nombre: editando.nombre,
        precio: parseFloat(editando.precio),
        descripcion: editando.descripcion,
        activo: editando.activo,
        fotoPath: editando.fotoPath || null,
        colorTema: editando.colorTema ?? '',
      },
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-stone-50/60 border-b border-stone-100 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-base flex-shrink-0">
          🌟
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Menú — Página de Inicio</h3>
          <p className="text-xs text-gray-400 mt-0.5">Items del carrusel en la pantalla de inicio. Independientes del menú del local.</p>
        </div>
      </div>

      <div className="p-6">
        {/* Lista items existentes */}
        <div className="space-y-2 mb-6">
          {items.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-2xl">
              <p className="text-2xl mb-2 opacity-30">🌸</p>
              <p className="text-xs text-gray-400">No hay items aún. Agrega uno abajo.</p>
            </div>
          )}

          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50/50 transition-all duration-150 group"
            >
              {/* Foto */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-rose-50 flex-shrink-0 border border-stone-100">
                {item.fotoUrl
                  ? <img src={item.fotoUrl} alt={item.nombre} className="w-full h-full object-cover" />
                  : <span className="flex items-center justify-center h-full text-xl opacity-20">🖼</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-snug">{item.nombre}</p>
                {item.descripcion && (
                  <p className="text-xs text-gray-400 truncate">{item.descripcion}</p>
                )}
                <p className="text-xs font-bold text-rose-500 mt-0.5">Bs. {Number(item.precio).toFixed(2)}</p>
              </div>

              {/* Visible / Oculto */}
              <button
                onClick={() => actualizarItem({ variables: { id: parseInt(item.id), activo: !item.activo } })}
                className={[
                  'text-[11px] font-semibold px-3 py-1 rounded-full border transition-all duration-200 flex-shrink-0',
                  item.activo
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100',
                ].join(' ')}
              >
                {item.activo ? '● Visible' : '○ Oculto'}
              </button>

              {/* Orden */}
              <div className="flex flex-col gap-px flex-shrink-0">
                <button
                  onClick={() => moverItem({ variables: { id: parseInt(item.id), direccion: 'arriba' } })}
                  disabled={i === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-20 text-[10px] transition-colors"
                >▲</button>
                <button
                  onClick={() => moverItem({ variables: { id: parseInt(item.id), direccion: 'abajo' } })}
                  disabled={i === items.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-20 text-[10px] transition-colors"
                >▼</button>
              </div>

              {/* Editar */}
              <button
                onClick={() => setEditando({ id: item.id, nombre: item.nombre, precio: item.precio, descripcion: item.descripcion, activo: item.activo, colorTema: item.colorTema || '', fotoUrl: item.fotoUrl, fotoPath: null })}
                className="text-xs px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-gray-600 rounded-lg transition-all duration-200 shadow-sm flex-shrink-0"
              >
                Editar
              </button>

              {/* Eliminar */}
              <button
                onClick={() => { if (window.confirm('¿Eliminar este item del showcase?')) eliminarItem({ variables: { id: parseInt(item.id) } }) }}
                className="text-xs px-3 py-1.5 bg-white hover:bg-red-50 border border-stone-200 hover:border-red-200 text-gray-400 hover:text-red-600 rounded-lg transition-all duration-200 shadow-sm flex-shrink-0"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>

        {/* ── Modal de edición ── */}
        {editando && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Editar item</h4>
                <button
                  onClick={() => setEditando(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-stone-100 transition-colors text-lg"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Foto edición */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Foto</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-50 border border-stone-200 flex-shrink-0 flex items-center justify-center">
                      {editando.fotoUrl
                        ? <img src={editando.fotoUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-2xl opacity-20">🖼</span>
                      }
                    </div>
                    <button
                      onClick={() => fotoEditRef.current?.click()}
                      disabled={subiendoEdit}
                      className="text-xs px-3 py-2 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-gray-600 hover:text-rose-700 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm"
                    >
                      {subiendoEdit ? 'Subiendo…' : 'Cambiar foto'}
                    </button>
                    <input
                      ref={fotoEditRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0], 'edit')}
                    />
                  </div>
                </div>

                <Field label="Nombre">
                  <input
                    value={editando.nombre}
                    onChange={e => setEditando(ed => ({ ...ed, nombre: e.target.value }))}
                    className={inputCls}
                  />
                </Field>

                <Field label="Descripción">
                  <input
                    value={editando.descripcion}
                    onChange={e => setEditando(ed => ({ ...ed, descripcion: e.target.value }))}
                    className={inputCls}
                  />
                </Field>

                <Field label="Precio (Bs)">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editando.precio}
                    onChange={e => setEditando(ed => ({ ...ed, precio: e.target.value }))}
                    className={inputCls}
                  />
                </Field>

                <SelectorColor valor={editando.colorTema} onChange={v => setEditando(ed => ({ ...ed, colorTema: v }))} />
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 bg-stone-50/60 border-t border-stone-100 flex gap-2">
                <button
                  onClick={guardarEdicion}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditando(null)}
                  className="flex-1 py-2.5 bg-white hover:bg-stone-100 border border-stone-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Agregar nuevo item ── */}
        <div className="border-t border-stone-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-rose-300 rounded-full" />
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agregar nuevo item</p>
          </div>

          <div className="flex items-start gap-4">
            {/* Zona foto nuevo */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => fotoNuevoRef.current?.click()}
                disabled={subiendoNuevo}
                className={[
                  'w-16 h-16 rounded-xl overflow-hidden border-2 border-dashed border-stone-200',
                  'bg-stone-50 flex items-center justify-center',
                  'hover:border-rose-300 hover:bg-rose-50/40 transition-all duration-200 cursor-pointer',
                  subiendoNuevo ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {fotoNuevoUrl
                  ? <img src={fotoNuevoUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl opacity-25">📷</span>
                }
              </button>
              <span className="text-[10px] text-gray-400 font-medium">
                {subiendoNuevo ? '…' : 'Foto *'}
              </span>
              <input
                ref={fotoNuevoRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0], 'nuevo')}
              />
            </div>

            {/* Campos nuevo */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <input
                value={nuevo.nombre}
                onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
                placeholder="Nombre del item *"
                className={inputCls}
              />
              <input
                value={nuevo.descripcion}
                onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))}
                placeholder="Descripción (opcional)"
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                step="0.5"
                value={nuevo.precio}
                onChange={e => setNuevo(n => ({ ...n, precio: e.target.value }))}
                placeholder="Precio en Bs *"
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-4">
            <SelectorColor valor={nuevo.colorTema} onChange={v => setNuevo(n => ({ ...n, colorTema: v }))} />
          </div>

          <button
            onClick={agregarItem}
            disabled={subiendoNuevo}
            className="mt-5 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            Agregar al showcase
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Página principal de Configuración
════════════════════════════════════════ */
export default function Configuracion() {
  const [form, setForm] = useState({
    nombreNegocio: '',
    telefonoWhatsapp: '',
    costoDelivery: '',
    direccionFisica: '',
    horarioAtencion: '',
    googleMapsUrl: '',
    googleMapsEmbedUrl: '',
    estacionamientoDetalle: '',
    horarioMananaInicio: '',
    horarioMananaFin: '',
    horarioTardeInicio: '',
    horarioTardeFin: '',
  })
  const [notif, setNotif]               = useState(null)
  const [fotoHistoriaUrl, setFotoHistoriaUrl] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoInputRef = useRef(null)

  const subirFotoHistoria = async (archivo) => {
    setSubiendoFoto(true)
    const fd = new FormData()
    fd.append('foto', archivo)
    try {
      const res  = await fetch('/api/upload-foto-historia/', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        setFotoHistoriaUrl(json.url)
        mostrarNotif('Foto actualizada', 'ok')
      } else {
        mostrarNotif(json.error || 'Error al subir', 'error')
      }
    } catch {
      mostrarNotif('Error de red al subir la foto', 'error')
    } finally {
      setSubiendoFoto(false)
    }
  }

  const { loading: loadingQuery } = useQuery(GET_CONFIGURACION, {
    onCompleted: (d) => {
      const c = d.configuracion
      if (c.fotoHistoriaUrl) setFotoHistoriaUrl(c.fotoHistoriaUrl)
      setForm({
        nombreNegocio:          c.nombreNegocio ?? '',
        telefonoWhatsapp:       c.telefonoWhatsapp ?? '',
        costoDelivery:          c.costoDelivery ?? '',
        direccionFisica:        c.direccionFisica ?? '',
        horarioAtencion:        c.horarioAtencion ?? '',
        googleMapsUrl:          c.googleMapsUrl ?? '',
        googleMapsEmbedUrl:     c.googleMapsEmbedUrl ?? '',
        estacionamientoDetalle: c.estacionamientoDetalle ?? '',
        horarioMananaInicio:    c.horarioMananaInicio ?? '',
        horarioMananaFin:       c.horarioMananaFin ?? '',
        horarioTardeInicio:     c.horarioTardeInicio ?? '',
        horarioTardeFin:        c.horarioTardeFin ?? '',
      })
    },
  })

  const [actualizar, { loading: guardando }] = useMutation(ACTUALIZAR_CONFIGURACION, {
    onCompleted: () => mostrarNotif('Configuración guardada', 'ok'),
    onError:     (err) => mostrarNotif(err.message, 'error'),
  })

  const mostrarNotif = (msg, tipo) => {
    setNotif({ msg, tipo })
    setTimeout(() => setNotif(null), 3500)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = () => {
    actualizar({
      variables: {
        nombreNegocio:          form.nombreNegocio || null,
        telefonoWhatsapp:       form.telefonoWhatsapp || null,
        costoDelivery:          form.costoDelivery !== '' ? parseFloat(form.costoDelivery) : null,
        direccionFisica:        form.direccionFisica || null,
        horarioAtencion:        form.horarioAtencion || null,
        googleMapsUrl:          form.googleMapsUrl || null,
        googleMapsEmbedUrl:     form.googleMapsEmbedUrl || null,
        estacionamientoDetalle: form.estacionamientoDetalle || null,
        horarioMananaInicio:    form.horarioMananaInicio || null,
        horarioMananaFin:       form.horarioMananaFin || null,
        horarioTardeInicio:     form.horarioTardeInicio || null,
        horarioTardeFin:        form.horarioTardeFin || null,
      },
    })
  }

  if (loadingQuery) {
    return (
      <AdminLayout titulo="Configuración General">
        <div className="flex items-center gap-3 text-rose-400">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-sm">Cargando configuración…</span>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout titulo="Configuración General">

      {/* Toast de notificación */}
      {notif && (
        <div className={[
          'fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
          notif.tipo === 'ok'
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white',
        ].join(' ')}>
          <span className="text-base">{notif.tipo === 'ok' ? '✓' : '✕'}</span>
          {notif.msg}
        </div>
      )}

      <div className="max-w-3xl space-y-5">

        {/* ── Foto Nuestra Historia ── */}
        <Section
          titulo='Foto — "Nuestra Historia"'
          descripcion='Imagen que aparece en la sección de historia de la página de inicio.'
          icono="🏠"
        >
          <FotoZona
            url={fotoHistoriaUrl}
            placeholder="🏠"
            ancho="w-40"
            alto="h-28"
            onClick={() => fotoInputRef.current?.click()}
            subiendo={subiendoFoto}
            etiqueta="Cambiar foto"
          />
          <input
            ref={fotoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => e.target.files?.[0] && subirFotoHistoria(e.target.files[0])}
          />
        </Section>

        {/* ── Datos del Negocio ── */}
        <Section titulo="Datos del Negocio" icono="🌸">
          <Field label="Nombre del negocio">
            <input
              value={form.nombreNegocio}
              onChange={e => set('nombreNegocio', e.target.value)}
              className={inputCls}
              placeholder="Casa Rosa"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono / WhatsApp">
              <input
                value={form.telefonoWhatsapp}
                onChange={e => set('telefonoWhatsapp', e.target.value)}
                className={inputCls}
                placeholder="+591 76543210"
              />
            </Field>
            <Field label="Costo de delivery (Bs)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.costoDelivery}
                onChange={e => set('costoDelivery', e.target.value)}
                className={inputCls}
                placeholder="5"
              />
            </Field>
          </div>
        </Section>

        {/* ── Ubicación y Contacto ── */}
        <Section titulo="Ubicación y Contacto" icono="📍">
          <Field label="Dirección física">
            <input
              value={form.direccionFisica}
              onChange={e => set('direccionFisica', e.target.value)}
              className={inputCls}
              placeholder="Av. Las Rosas #123, Zona Central, Bolivia"
            />
          </Field>

          <Field label="Enlace de Google Maps">
            <input
              value={form.googleMapsUrl}
              onChange={e => set('googleMapsUrl', e.target.value)}
              className={inputCls}
              placeholder="https://maps.google.com/maps?q=..."
            />
          </Field>

          <Field
            label="URL de embed del mapa"
            hint='En Google Maps: busca tu local → Compartir → Insertar un mapa → copia el enlace del atributo src'
          >
            <input
              value={form.googleMapsEmbedUrl}
              onChange={e => set('googleMapsEmbedUrl', e.target.value)}
              className={inputCls}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
          </Field>

          <Field label="Detalle de estacionamiento">
            <input
              value={form.estacionamientoDetalle}
              onChange={e => set('estacionamientoDetalle', e.target.value)}
              className={inputCls}
              placeholder="Disponible frente al local"
            />
          </Field>
        </Section>

        {/* ── Horarios ── */}
        <Section titulo="Horarios de Atención" icono="🕐">
          <Field label="Descripción visible en la página de inicio">
            <input
              value={form.horarioAtencion}
              onChange={e => set('horarioAtencion', e.target.value)}
              className={inputCls}
              placeholder="Lunes a Domingo: 8:00 AM – 10:00 PM"
            />
          </Field>

          {/* Horario mañana */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Turno mañana</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Apertura">
                <input
                  type="time"
                  value={form.horarioMananaInicio}
                  onChange={e => set('horarioMananaInicio', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Cierre">
                <input
                  type="time"
                  value={form.horarioMananaFin}
                  onChange={e => set('horarioMananaFin', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Horario tarde */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Turno tarde</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Apertura">
                <input
                  type="time"
                  value={form.horarioTardeInicio}
                  onChange={e => set('horarioTardeInicio', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Cierre">
                <input
                  type="time"
                  value={form.horarioTardeFin}
                  onChange={e => set('horarioTardeFin', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── Showcase ── */}
        <SeccionShowcase mostrarNotif={mostrarNotif} />

        {/* ── Botón guardar ── */}
        <div className="flex justify-end pb-4">
          <button
            onClick={guardar}
            disabled={guardando}
            className={[
              'flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200',
              guardando
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-rose-500 hover:bg-rose-600 text-white hover:shadow-md active:scale-95',
            ].join(' ')}
          >
            {guardando && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {guardando ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </AdminLayout>
  )
}
