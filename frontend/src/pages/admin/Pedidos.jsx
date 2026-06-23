import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { useCajaWS } from '../../hooks/useCajaWS'
import {
  GET_PEDIDOS_PENDIENTE_PAGO,
  GET_PEDIDOS_ONLINE_ACTIVOS,
  GET_PEDIDOS_ONLINE_HISTORIAL,
  CONFIRMAR_PAGO_ONLINE,
  CANCELAR_PEDIDO_ONLINE,
} from '../../graphql/online'
import { GET_CONFIGURACION, ACTUALIZAR_CONFIGURACION } from '../../graphql/configuracion'

const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`
const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

const ESTADO_LABEL = {
  pendiente_pago:  { txt: 'Pendiente pago', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  pago_confirmado: { txt: 'Pago confirmado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_cocina:       { txt: 'En cocina',       cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  listo:           { txt: 'Listo',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  entregado:       { txt: 'Entregado',       cls: 'bg-crema text-gris border-linea' },
  cancelado:       { txt: 'Cancelado',       cls: 'bg-red-50 text-red-600 border-red-200' },
  abierto:         { txt: 'En mesa',         cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  en_preparacion:  { txt: 'Preparando',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  cobrar:          { txt: 'Pide cuenta',     cls: 'bg-rosa-niebla text-rosa border-rosa-claro' },
}

function EstadoBadge({ estado }) {
  const e = ESTADO_LABEL[estado] ?? { txt: estado, cls: 'bg-crema text-gris border-linea' }
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-outfit font-medium border ${e.cls}`}>{e.txt}</span>
}

function RenderDireccion({ direccion }) {
  if (!direccion) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = direccion.split(urlRegex)
  
  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-semibold break-all inline-flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              📍 Ver ubicación
            </a>
          )
        }
        return part
      })}
    </span>
  )
}

function ModalBase({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[18px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
          <h3 className="font-fraunces font-semibold text-tinta">{titulo}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-colors text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function ModalConfirmarPago({ pedido, onClose, onConfirmado }) {
  const [costoEnvio, setCostoEnvio] = useState(String(Number(pedido.costoEnvio ?? 0)))
  const [monto, setMonto] = useState('')

  const subtotalItems = pedido.detalles.reduce((s, d) => s + Number(d.subtotal), 0)
  const totalCalc = subtotalItems + Number(costoEnvio || 0)

  const [confirmar, { loading }] = useMutation(CONFIRMAR_PAGO_ONLINE, {
    refetchQueries: [{ query: GET_PEDIDOS_PENDIENTE_PAGO }, { query: GET_PEDIDOS_ONLINE_ACTIVOS }],
    onCompleted: () => { onConfirmado(); onClose() },
    onError: (err) => alert(err.message || 'Error al confirmar el pago'),
  })

  const submit = () => {
    const m = parseFloat(monto)
    if (isNaN(m) || m <= 0) return
    confirmar({ variables: { pedidoId: parseInt(pedido.id), montoConfirmado: m, costoEnvioAjustado: Number(costoEnvio) !== Number(pedido.costoEnvio) ? Number(costoEnvio) : null } })
  }

  return (
    <ModalBase titulo={`Confirmar pago — #${pedido.numeroPedido || pedido.id}`} onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <div className="bg-crema/60 rounded-xl p-4 text-sm space-y-1.5 font-outfit border border-linea">
          <p><span className="text-gris">Cliente:</span> <strong className="text-tinta">{pedido.clienteNombre}</strong></p>
          <p><span className="text-gris">Tel:</span> {pedido.clienteTelefono}</p>
          {pedido.clienteDireccion && <p><span className="text-gris">Dir:</span> <RenderDireccion direccion={pedido.clienteDireccion} /></p>}
          {pedido.clienteNota && <p><span className="text-gris">Nota:</span> {pedido.clienteNota}</p>}
          <p><span className="text-gris">Entrega:</span> {pedido.tipoEntrega === 'delivery' ? '🚚 Delivery' : '📍 Recojo'}</p>
        </div>
        <div className="bg-crema/60 rounded-xl p-4 space-y-1.5 text-sm border border-linea">
          {pedido.detalles.map(d => (
            <div key={d.id} className="flex justify-between font-outfit">
              <span className="text-gris">{d.cantidad}× {d.nombreItem}</span>
              <span className="font-medium text-tinta">{bs(d.subtotal)}</span>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Costo de envío (Bs) — ajustable</label>
          <input type="number" value={costoEnvio} onChange={e => setCostoEnvio(e.target.value)} min="0" className={inputCls} />
        </div>
        <div className="flex justify-between font-fraunces font-semibold text-base bg-rosa-niebla border border-rosa-claro px-4 py-3 rounded-xl">
          <span className="text-tinta">Total a cobrar</span>
          <span className="text-rosa">{bs(totalCalc)}</span>
        </div>
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Monto recibido por Yape (Bs) *</label>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder={String(totalCalc.toFixed(2))} autoFocus className={inputCls + ' text-lg font-fraunces font-semibold'} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-linea text-gris py-3 rounded-xl text-sm font-outfit font-medium hover:bg-crema transition-colors">Cancelar</button>
          <button onClick={submit} disabled={loading || !monto} className="flex-1 bg-vino hover:bg-rosa disabled:bg-gris text-white py-3 rounded-xl text-sm font-outfit font-semibold transition-colors shadow-sm">
            {loading ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

function ModalConfiguracion({ conf, onClose }) {
  const [form, setForm] = useState({
    nombreNegocio: conf?.nombreNegocio ?? '',
    telefonoWhatsapp: conf?.telefonoWhatsapp ?? '',
    costoDelivery: String(conf?.costoDelivery ?? 5),
    horarioMananaInicio: conf?.horarioMananaInicio ?? '08:00',
    horarioMananaFin: conf?.horarioMananaFin ?? '12:00',
    horarioTardeInicio: conf?.horarioTardeInicio ?? '14:00',
    horarioTardeFin: conf?.horarioTardeFin ?? '18:00',
  })
  const [uploading, setUploading] = useState(false)
  const [qrUrl, setQrUrl] = useState(conf?.qrPagoUrl ?? null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (conf) {
      setForm({ nombreNegocio: conf.nombreNegocio ?? '', telefonoWhatsapp: conf.telefonoWhatsapp ?? '', costoDelivery: String(conf.costoDelivery ?? 5), horarioMananaInicio: conf.horarioMananaInicio ?? '08:00', horarioMananaFin: conf.horarioMananaFin ?? '12:00', horarioTardeInicio: conf.horarioTardeInicio ?? '14:00', horarioTardeFin: conf.horarioTardeFin ?? '18:00' })
      setQrUrl(conf.qrPagoUrl ?? null)
    }
  }, [conf])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const [actualizar, { loading }] = useMutation(ACTUALIZAR_CONFIGURACION, { refetchQueries: [{ query: GET_CONFIGURACION }], onCompleted: onClose })

  const subirQr = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('foto', file)
    try {
      const res = await fetch('/api/upload-foto/', { method: 'POST', body: fd })
      const data = await res.json()
      setUploading(false)
      if (data.success) { setQrUrl(data.fotoUrl); setForm(p => ({ ...p, _qrPath: data.fotoPath })) }
      else alert(data.error || 'Error al subir el comprobante')
    } catch { setUploading(false); alert('Error de conexión al subir la imagen') }
  }

  const guardar = () => {
    actualizar({ variables: { nombreNegocio: form.nombreNegocio, telefonoWhatsapp: form.telefonoWhatsapp, costoDelivery: Number(form.costoDelivery), qrPath: form._qrPath ?? null, horarioMananaInicio: form.horarioMananaInicio, horarioMananaFin: form.horarioMananaFin, horarioTardeInicio: form.horarioTardeInicio, horarioTardeFin: form.horarioTardeFin } })
  }

  return (
    <ModalBase titulo="Configuración del negocio" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        {[
          { k: 'nombreNegocio',    label: 'Nombre del negocio' },
          { k: 'telefonoWhatsapp', label: 'WhatsApp (con código país)' },
          { k: 'costoDelivery',    label: 'Costo delivery base (Bs)', type: 'number' },
        ].map(f => (
          <div key={f.k}>
            <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">{f.label}</label>
            <input type={f.type ?? 'text'} value={form[f.k]} onChange={e => set(f.k, e.target.value)} className={inputCls} />
          </div>
        ))}
        <div>
          <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-2">Horarios de atención</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[{ k: 'horarioMananaInicio', label: 'Mañana inicio' }, { k: 'horarioMananaFin', label: 'Mañana fin' }, { k: 'horarioTardeInicio', label: 'Tarde inicio' }, { k: 'horarioTardeFin', label: 'Tarde fin' }].map(f => (
              <div key={f.k}>
                <label className="text-xs text-gris font-outfit block mb-0.5">{f.label}</label>
                <input type="time" value={form[f.k]} onChange={e => set(f.k, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-2">QR de pago Yape</p>
          {qrUrl && <img src={qrUrl} alt="QR actual" className="w-28 h-28 object-contain rounded-xl border border-linea mb-3" />}
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={subirQr} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="border border-linea text-gris hover:bg-crema px-4 py-2 rounded-xl text-sm font-outfit transition-colors">
            {uploading ? 'Subiendo...' : qrUrl ? 'Cambiar QR' : '+ Subir QR'}
          </button>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-linea text-gris py-3 rounded-xl text-sm font-outfit font-medium hover:bg-crema transition-colors">Cancelar</button>
          <button onClick={guardar} disabled={loading} className="flex-1 bg-vino hover:bg-rosa disabled:bg-gris text-white py-3 rounded-xl text-sm font-outfit font-semibold transition-colors shadow-sm">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

export function ModalDetallePedido({ pedido, onClose }) {
  const subtotalItems = pedido.detalles.reduce((s, d) => s + Number(d.subtotal), 0)
  return (
    <ModalBase titulo={`Detalle de Pedido — #${pedido.numeroPedido || pedido.id}`} onClose={onClose}>
      <div className="px-6 py-5 space-y-4 text-left">
        {/* Estado y Fecha */}
        <div className="flex items-center justify-between border-b border-linea pb-3">
          <div className="text-xs text-gris font-outfit">
            <span>Creado: </span>
            <strong className="text-tinta">
              {new Date(pedido.creadoEn).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </strong>
          </div>
          <EstadoBadge estado={pedido.estado} />
        </div>

        {/* Datos Cliente */}
        <div className="bg-crema/60 rounded-xl p-4 text-sm space-y-1.5 font-outfit border border-linea">
          <p className="font-bold text-tinta border-b border-linea/60 pb-1 mb-1.5">👤 Datos del Cliente</p>
          <p><span className="text-gris">Cliente:</span> <strong className="text-tinta">{pedido.clienteNombre}</strong></p>
          <p><span className="text-gris">Teléfono:</span> {pedido.clienteTelefono}</p>
          {pedido.clienteDireccion && (
            <p>
              <span className="text-gris">Dirección: </span> 
              <RenderDireccion direccion={pedido.clienteDireccion} />
            </p>
          )}
          {pedido.clienteNota && <p><span className="text-gris">Nota:</span> {pedido.clienteNota}</p>}
          <p><span className="text-gris">Entrega:</span> {pedido.tipoEntrega === 'delivery' ? '🚚 Delivery' : '📍 Recojo'}</p>
        </div>

        {/* Detalles Pedido */}
        <div className="bg-crema/60 rounded-xl p-4 space-y-1.5 text-sm border border-linea">
          <p className="font-bold text-tinta border-b border-linea/60 pb-1 mb-1.5">🛍️ Artículos</p>
          {pedido.detalles.map(d => (
            <div key={d.id} className="flex justify-between font-outfit">
              <span className="text-gris">{d.cantidad}× {d.nombreItem}</span>
              <span className="font-medium text-tinta">{bs(d.subtotal)}</span>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="space-y-1.5 text-sm font-outfit border-t border-linea pt-3">
          <div className="flex justify-between text-gris">
            <span>Subtotal</span>
            <span>{bs(subtotalItems)}</span>
          </div>
          {Number(pedido.costoEnvio) > 0 && (
            <div className="flex justify-between text-gris">
              <span>Envío</span>
              <span>{bs(pedido.costoEnvio)}</span>
            </div>
          )}
          <div className="flex justify-between font-fraunces font-semibold text-base bg-rosa-niebla border border-rosa-claro px-4 py-3 rounded-xl !mt-3">
            <span className="text-tinta">Total Cobrado</span>
            <span className="text-rosa">{bs(pedido.total)}</span>
          </div>
        </div>

        {/* Botón cerrar */}
        <button onClick={onClose} className="w-full bg-vino hover:bg-rosa text-white py-3 rounded-xl text-sm font-outfit font-semibold transition-colors shadow-sm">
          Cerrar
        </button>
      </div>
    </ModalBase>
  )
}

export default function Pedidos() {
  const { usuario } = useAuth()
  const [tab, setTab] = useState('activos') // 'activos' | 'historial'
  const [busqueda, setBusqueda] = useState('')
  const [modalPago, setModalPago] = useState(null)
  const [modalConf, setModalConf] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [notif, setNotif] = useState(null)

  const showNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 4000) }

  const { data: dataConf } = useQuery(GET_CONFIGURACION)
  const { data: dataPendiente, refetch: refetchPendiente } = useQuery(GET_PEDIDOS_PENDIENTE_PAGO, { pollInterval: 8000 })
  const { data: dataActivos, refetch: refetchActivos } = useQuery(GET_PEDIDOS_ONLINE_ACTIVOS, { pollInterval: 8000 })
  const { data: dataHistorial, refetch: refetchHistorial } = useQuery(GET_PEDIDOS_ONLINE_HISTORIAL, { fetchPolicy: 'network-only' })
  const [cancelarPedido] = useMutation(CANCELAR_PEDIDO_ONLINE, { refetchQueries: [{ query: GET_PEDIDOS_PENDIENTE_PAGO }, { query: GET_PEDIDOS_ONLINE_HISTORIAL }] })

  useCajaWS((msg) => {
    if (msg.tipo === 'pedido_listo') { refetchActivos(); showNotif(`📦 Listo — ${msg.mesa}`) }
  })

  const pendientes = dataPendiente?.pedidosPendientePago ?? []
  const activos    = dataActivos?.pedidosOnlineActivos ?? []
  const historial  = dataHistorial?.pedidosOnlineHistorial ?? []
  const conf       = dataConf?.configuracion

  const historialFiltrado = historial.filter(p => {
    if (!busqueda) return true
    const term = busqueda.toLowerCase()
    const numMatch = String(p.numeroPedido || p.id).includes(term)
    const nombreMatch = (p.clienteNombre || '').toLowerCase().includes(term)
    return numMatch || nombreMatch
  })

  return (
    <AdminLayout titulo="Pedidos Online">
      {notif && (
        <div className="fixed top-6 right-6 z-50 bg-rosa text-white px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-semibold">
          {notif}
        </div>
      )}

      {/* Tabs + config */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex gap-1 bg-white border border-linea p-1 rounded-xl shadow-sm">
          {[
            { val: 'activos', label: 'Pedidos Activos', count: pendientes.length + activos.length },
            { val: 'historial', label: 'Historial de Pedidos', count: 0 },
          ].map(t => (
            <button key={t.val} onClick={() => { setTab(t.val); if (t.val === 'historial') refetchHistorial() }}
              className={`px-5 py-2 rounded-lg text-sm font-outfit font-semibold transition-all flex items-center gap-2 ${
                tab === t.val
                  ? 'bg-vino text-white shadow-sm'
                  : 'text-gris hover:text-tinta'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.val ? 'bg-white/20 text-white' : 'bg-rosa text-white'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setModalConf(true)} className="flex items-center gap-2 border border-linea hover:bg-crema text-gris hover:text-tinta px-4 py-2.5 rounded-xl text-sm font-outfit font-medium transition-colors shadow-sm">
          ⚙️ Configuración
        </button>
      </div>

      {tab === 'activos' ? (
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-latir" />
              <h3 className="text-[11px] font-outfit font-semibold text-yellow-600 uppercase tracking-widest">
                Solicitudes entrantes — {pendientes.length}
              </h3>
            </div>
            {pendientes.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-[18px] border-2 border-dashed border-linea animate-fade-up">
                <p className="text-gris/40 text-3xl mb-2">📥</p>
                <p className="text-gris text-sm font-outfit italic">Sin solicitudes nuevas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendientes.map(p => (
                  <div key={p.id} className="bg-white rounded-[18px] border border-yellow-200 shadow-card overflow-hidden card-hover animate-fade-up">
                    <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
                      <div>
                        <p className="font-fraunces font-semibold text-tinta">#{p.numeroPedido || p.id} — {p.clienteNombre}</p>
                        <p className="text-xs text-gris font-outfit">
                          {p.tipoEntrega === 'delivery' ? (
                            <>🚚 <RenderDireccion direccion={p.clienteDireccion} /></>
                          ) : (
                            '📍 Recojo'
                          )} · {p.clienteTelefono}
                        </p>
                      </div>
                      <span className="font-fraunces font-bold text-rosa">{bs(p.total)}</span>
                    </div>
                    <div className="px-4 py-3 space-y-1">
                      {p.detalles.map(d => (
                        <div key={d.id} className="flex justify-between text-sm font-outfit">
                          <span className="text-gris">{d.cantidad}× {d.nombreItem}</span>
                          <span className="text-gris">{bs(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 pb-4 flex gap-2">
                      <button onClick={() => cancelarPedido({ variables: { pedidoId: parseInt(p.id) } })} className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 py-2.5 rounded-xl text-sm font-outfit font-medium transition-colors">Cancelar</button>
                      <button onClick={() => setModalPago(p)} className="flex-1 bg-vino hover:bg-rosa text-white py-2.5 rounded-xl text-sm font-outfit font-semibold transition-colors shadow-sm">Confirmar pago</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activos.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <h3 className="text-[11px] font-outfit font-semibold text-blue-600 uppercase tracking-widest">
                  En proceso — {activos.length}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activos.map((p, i) => (
                  <div key={p.id} className="bg-white rounded-[18px] border border-linea shadow-card p-4 card-hover animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-fraunces font-semibold text-tinta text-sm">#{p.numeroPedido || p.id} — {p.clienteNombre}</p>
                        <p className="text-xs text-gris font-outfit">{p.tipoEntrega === 'delivery' ? '🚚' : '📍'} {p.clienteTelefono}</p>
                      </div>
                      <EstadoBadge estado={p.estado} />
                    </div>
                    <div className="space-y-0.5">
                      {p.detalles.map(d => <p key={d.id} className="text-xs text-gris font-outfit">{d.cantidad}× {d.nombreItem}</p>)}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-linea/60">
                      <span className="text-xs text-gris font-outfit truncate max-w-[180px]">
                        {p.tipoEntrega === 'delivery' ? (
                          <RenderDireccion direccion={p.clienteDireccion} />
                        ) : (
                          'Recojo en local'
                        )}
                      </span>
                      <span className="font-fraunces font-bold text-rosa text-sm">{bs(p.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-linea shadow-card overflow-hidden animate-fade-up">
          <div className="px-6 py-4 border-b border-linea bg-crema/20 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-fraunces font-semibold text-tinta text-base">Historial de Pedidos Online</h3>
              <p className="text-xs text-gris font-outfit mt-0.5">Mostrando los últimos 100 finalizados</p>
            </div>
            
            {/* Buscador */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gris text-xs">
                🔍
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente o # pedido..."
                className="w-full pl-9 pr-4 py-2 border border-linea rounded-xl text-sm font-outfit text-tinta focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/30 transition-all bg-white"
              />
            </div>
          </div>
          {historial.length === 0 ? (
            <div className="text-center py-16 bg-white">
              <p className="text-4xl mb-3">📜</p>
              <p className="text-gris text-sm font-outfit italic">No hay pedidos registrados en el historial</p>
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="text-center py-16 bg-white font-outfit">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-tinta font-semibold text-sm">No se encontraron resultados</p>
              <p className="text-gris text-xs mt-1">No hay coincidencias para "{busqueda}"</p>
            </div>
          ) : (
            <div className="divide-y divide-linea overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-crema/40 text-[10px] font-outfit font-bold uppercase tracking-wider text-gris border-b border-linea">
                    <th className="px-6 py-3.5">Pedido</th>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-6 py-3.5">Entrega</th>
                    <th className="px-6 py-3.5">Estado</th>
                    <th className="px-6 py-3.5 text-right">Total</th>
                    <th className="px-6 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea font-outfit text-sm text-tinta">
                  {historialFiltrado.map(p => (
                    <tr key={p.id} className="hover:bg-crema/20 transition-colors">
                      <td className="px-6 py-4 font-semibold">#{p.numeroPedido || p.id}</td>
                      <td className="px-6 py-4 text-xs text-gris">
                        {new Date(p.creadoEn).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold">{p.clienteNombre || 'Sin nombre'}</div>
                        <div className="text-xs text-gris">{p.clienteTelefono}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {p.tipoEntrega === 'delivery' ? (
                          <span className="flex items-center gap-1">🚚 Delivery</span>
                        ) : (
                          <span className="flex items-center gap-1">📍 Recojo</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <EstadoBadge estado={p.estado} />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rosa">{bs(p.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setModalDetalle(p)}
                          className="bg-rosa-niebla/70 hover:bg-rosa hover:text-white text-rosa text-xs font-semibold px-4 py-2 rounded-xl transition duration-200"
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalPago && <ModalConfirmarPago pedido={modalPago} onClose={() => setModalPago(null)} onConfirmado={() => { refetchPendiente(); refetchActivos(); refetchHistorial() }} />}
      {modalConf && <ModalConfiguracion conf={conf} onClose={() => setModalConf(false)} />}
      {modalDetalle && <ModalDetallePedido pedido={modalDetalle} onClose={() => setModalDetalle(null)} />}
    </AdminLayout>
  )
}
