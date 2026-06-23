import { useState, useEffect, useRef, Fragment } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_CONFIGURACION } from '../graphql/configuracion'
import { GET_MENU_COMPLETO, GET_COMBOS_ACTIVOS_MENU } from '../graphql/menu'
import { CREAR_PEDIDO_ONLINE, GET_MIS_PEDIDOS, GET_ULTIMO_PEDIDO_ACTIVO } from '../graphql/online'
import { usePedidoWS } from '../hooks/usePedidoWS'
import { useAuth } from '../context/AuthContext'

// ─── Emojis por categoría ─────────────────────────────────────────
const EMOJI_CAT = {
  cafés: '☕', cafe: '☕', bebidas: '🥤', pastelería: '🍰',
  pasteles: '🍰', tortas: '🎂', salados: '🥪', postres: '🍮',
  jugos: '🍊', helados: '🍦',
}
const emojiCat = (nombre = '') => {
  const k = nombre.toLowerCase()
  return Object.entries(EMOJI_CAT).find(([c]) => k.includes(c))?.[1] ?? '🍽️'
}

const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`

// ─── Componente tracker ───────────────────────────────────────────
function TrackerOnline({ estado, pedidoId, numeroPedido, telefono, tipoEntrega }) {
  const isDelivery = tipoEntrega === 'delivery'

  const TRACKER_ESTADOS_CUSTOM = {
    pendiente_pago: {
      titulo: '⏳ Esperando confirmación de pago',
      sub: 'El local verificará tu comprobante de Yape en breve.',
      paso: 0,
    },
    pago_confirmado: {
      titulo: '✅ ¡Pedido aceptado!',
      sub: 'El pedido fue verificado y ya se encuentra en cola para cocina.',
      paso: 1,
    },
    en_cocina: {
      titulo: '🍳 Preparando tu pedido...',
      sub: 'El chef está elaborando tus delicias en la cocina.',
      paso: 2,
    },
    en_preparacion: {
      titulo: '🍳 Preparando tu pedido...',
      sub: 'El chef está elaborando tus delicias en la cocina.',
      paso: 2,
    },
    listo: {
      titulo: isDelivery ? '🛵 ¡Pedido listo y en camino!' : '🛍️ ¡Listo para retirar!',
      sub: isDelivery
        ? 'Tu delivery ya salió de Casa Rosa y va en camino a tu dirección.'
        : 'Tu pedido está terminado. Ya podés pasar por el local a recogerlo.',
      paso: 3,
    },
    entregado: {
      titulo: isDelivery ? '🎉 ¡Pedido entregado!' : '🎉 ¡Pedido retirado!',
      sub: isDelivery
        ? '¡Que disfrutes tu comida! Muchas gracias por tu confianza. 😊'
        : '¡Gracias por visitarnos! Que disfrutes mucho tu comida 😊',
      paso: 4,
    },
    cancelado: {
      titulo: '❌ Pedido cancelado o rechazado',
      sub: 'Por favor, contactate con nosotros por WhatsApp para más información.',
      paso: -1,
    },
  }

  const info = TRACKER_ESTADOS_CUSTOM[estado] ?? TRACKER_ESTADOS_CUSTOM.pendiente_pago
  const cancelado = estado === 'cancelado'

  const PASOS_TRACKER = ['Confirmado', 'Aceptado', 'En cocina', isDelivery ? 'En camino' : 'Listo']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-4xl mb-3">
            {cancelado ? '❌' : estado === 'pendiente_pago' ? '⏳' : '🌹'}
          </p>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{info.titulo}</h2>
          <p className="text-sm text-gray-400 mb-6">{info.sub}</p>

          {/* Steps (solo si no cancelado) */}
          {!cancelado && (
            <div className="flex items-center mb-6">
              {PASOS_TRACKER.map((paso, i) => {
                const done   = info.paso > i
                const active = info.paso === i
                return (
                  <Fragment key={paso}>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        done   ? 'bg-green-500 text-white' :
                        active ? 'bg-pink-500 text-white animate-pulse' :
                                 'bg-gray-100 text-gray-300'
                      }`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs mt-1 text-center leading-tight max-w-[52px] ${
                        done ? 'text-green-600' : active ? 'text-pink-600 font-medium' : 'text-gray-300'
                      }`}>{paso}</span>
                    </div>
                    {i < PASOS_TRACKER.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${done ? 'bg-green-300' : 'bg-gray-100'}`} />
                    )}
                  </Fragment>
                )
              })}
            </div>
          )}

          <p className="text-xs text-gray-300 mb-4">Pedido #{numeroPedido || pedidoId}</p>

          {telefono && (
            <a
              href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy el cliente del pedido #${numeroPedido || pedidoId}. ¿Alguna novedad?`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-2xl text-sm transition w-full"
            >
              <span>📱</span> Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Historial de Pedidos ──────────────────────────────────
function ModalHistorial({ onClose, onSelectTracker }) {
  const { data, loading } = useQuery(GET_MIS_PEDIDOS, {
    fetchPolicy: 'network-only',
  })

  const pedidos = data?.misPedidos ?? []

  const ESTADOS_ONLINE_LABEL = {
    pendiente_pago:  { txt: 'Espera Pago', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
    pago_confirmado: { txt: 'Confirmado',  cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
    en_cocina:       { txt: 'En cocina',   cls: 'bg-orange-50 text-orange-700 border border-orange-100' },
    listo:           { txt: 'Listo',       cls: 'bg-green-50 text-green-700 border border-green-100' },
    entregado:       { txt: 'Entregado',   cls: 'bg-gray-50 text-gray-500 border border-gray-100' },
    cancelado:       { txt: 'Cancelado',   cls: 'bg-red-50 text-red-600 border border-red-100' },
  }

  const badgeEstado = (est) => {
    const e = ESTADOS_ONLINE_LABEL[est] ?? { txt: est, cls: 'bg-gray-50 text-gray-500' }
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.cls}`}>{e.txt}</span>
  }

  const formatFecha = (str) => {
    try {
      const d = new Date(str)
      return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch {
      return str
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">📜 Tu Historial</h3>
            <p className="text-xs text-gray-400">Pedidos registrados con tu cuenta</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 font-medium">Buscando tus delicias...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-5xl block">🥪</span>
              <p className="text-gray-400 text-sm font-semibold">¿Aún no has pedido nada?</p>
              <p className="text-xs text-gray-300 max-w-[200px] mx-auto">Tus pedidos online se guardarán aquí automáticamente al iniciar sesión.</p>
            </div>
          ) : (
            pedidos.map(p => {
              const isActivo = ['pendiente_pago', 'pago_confirmado', 'en_cocina', 'listo'].includes(p.estado)
              return (
                <div key={p.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-800">Pedido #{p.numeroPedido || p.id}</span>
                      <span className="text-[10px] text-gray-400 block">{formatFecha(p.creadoEn)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {badgeEstado(p.estado)}
                      {isActivo && (
                        <button
                          onClick={() => { onSelectTracker(p); onClose() }}
                          className="bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full transition shadow-xs flex items-center gap-0.5"
                        >
                          Rastrear 📡
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 bg-white p-2.5 rounded-xl border border-gray-50">
                    {p.detalles.map(d => (
                      <div key={d.id} className="flex justify-between">
                        <span>{d.cantidad}x {d.nombreItem}</span>
                        <span className="font-semibold">{bs(d.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-gray-400">{p.tipoEntrega === 'delivery' ? '🚚 Delivery' : '📍 Retiro local'}</span>
                    <span className="font-bold text-pink-600 text-sm">{bs(p.total)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────
export default function Online() {
  const { usuario, logout } = useAuth()
  const [vista, setVista] = useState('menu')   // 'menu' | 'checkout' | 'pago' | 'tracker'
  const [tipoEntrega, setTipoEntrega] = useState('recojo')
  const [categoriaActiva, setCategoriaActiva] = useState('combos')
  const TAB_COMBOS = 'combos'
  const [carrito, setCarrito] = useState(() => {
    try {
      const saved = localStorage.getItem('casa_rosa_carrito_online')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showCarrito, setShowCarrito] = useState(false)
  const [pedidoId, setPedidoId] = useState(null)
  const [numeroPedido, setNumeroPedido] = useState(null)
  const [estadoPedido, setEstadoPedido] = useState('pendiente_pago')
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('casa_rosa_form_online')
      const defaultForm = { nombre: '', telefono: '', direccion: '', nota: '' }
      return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm
    } catch {
      return { nombre: '', telefono: '', direccion: '', nota: '' }
    }
  })
  const [notif, setNotif] = useState(null)
  const [showHistorial, setShowHistorial] = useState(false)
  const notifTimer = useRef(null)
  const [obteniendoGps, setObteniendoGps] = useState(false)

  const obtenerUbicacionGps = () => {
    if (!navigator.geolocation) {
      mostrarNotif('Tu navegador no soporta geolocalización', 'error')
      return
    }
    setObteniendoGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        setForm(prev => ({
          ...prev,
          direccion: mapUrl
        }))
        setObteniendoGps(false)
        mostrarNotif('📍 Ubicación GPS obtenida con éxito')
      },
      (err) => {
        setObteniendoGps(false)
        let errMsg = 'No se pudo obtener la ubicación. Activá el GPS y dale permisos al navegador.'
        if (err.code === 1) errMsg = 'Permiso denegado. Activá los permisos de ubicación en tu navegador.'
        else if (err.code === 2) errMsg = 'Ubicación no disponible.'
        else if (err.code === 3) errMsg = 'Tiempo de espera agotado.'
        mostrarNotif(errMsg, 'error')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    localStorage.setItem('casa_rosa_carrito_online', JSON.stringify(carrito))
  }, [carrito])

  useEffect(() => {
    localStorage.setItem('casa_rosa_form_online', JSON.stringify(form))
  }, [form])


  const { data: dataConf, loading: loadingConf } = useQuery(GET_CONFIGURACION)
  const { data: dataMenu, loading: loadingMenu } = useQuery(GET_MENU_COMPLETO)
  const { data: dataCombos } = useQuery(GET_COMBOS_ACTIVOS_MENU)

  useEffect(() => {
    if (dataMenu?.categorias?.length && (categoriaActiva === 'combos' || !categoriaActiva) && !dataCombos?.combosActivos?.length) {
      setCategoriaActiva(dataMenu.categorias[0].id)
    }
  }, [dataMenu, dataCombos, categoriaActiva])

  const { data: dataActivo } = useQuery(GET_ULTIMO_PEDIDO_ACTIVO, {
    skip: !usuario,
    fetchPolicy: 'network-only',
  })

  // Auto-redirección si se detecta un pedido activo
  useEffect(() => {
    if (dataActivo?.ultimoPedidoActivo) {
      const act = dataActivo.ultimoPedidoActivo
      setPedidoId(parseInt(act.id))
      setNumeroPedido(act.numeroPedido)
      setEstadoPedido(act.estado)
      setTipoEntrega(act.tipoEntrega)
      setVista('tracker')
      mostrarNotif('📋 Redireccionado a tu pedido activo')
    }
  }, [dataActivo])

  // Cargar nombre del perfil automáticamente al formulario si está autenticado
  useEffect(() => {
    if (usuario) {
      setForm(p => ({
        ...p,
        nombre: usuario.username || p.nombre,
      }))
    }
  }, [usuario])

  usePedidoWS(pedidoId, (msg) => {
    if (msg.tipo === 'estado') setEstadoPedido(msg.estado)
  })

  const handleGoogleLogin = () => {
    window.location.href = `/accounts/google/login/?process=login&next=${encodeURIComponent(window.location.href)}`
  }

  const [crearPedido, { loading: creando }] = useMutation(CREAR_PEDIDO_ONLINE, {
    onCompleted: (d) => {
      const newId = parseInt(d.crearPedidoOnline.id)
      const newNum = d.crearPedidoOnline.numeroPedido
      setPedidoId(newId)
      setNumeroPedido(newNum)

      // Generar el mensaje con el número de pedido real obtenido
      const items = carrito.map(i => `  ${i.cantidad}× ${i.nombre} — ${bs(i.precio * i.cantidad)}`).join('\n')
      const numStr = newNum || newId || 'nuevo'
      const msg = [
        `Hola! Pedido #${numStr} 🌹`,
        '',
        `📋 *Ítems:*\n${items}`,
        tipoEntrega === 'delivery' ? `🚚 Delivery a: ${form.direccion}` : `📍 Recojo en local`,
        `💰 Total: ${bs(total)}`,
        '',
        `Mi nombre: ${form.nombre}`,
        `Tel: ${form.telefono}`,
        form.nota ? `Nota: ${form.nota}` : '',
        '',
        '(Adjunto comprobante Yape)',
      ].filter(Boolean).join('\n')

      const tel = (conf?.telefonoWhatsapp ?? '').replace(/\D/g, '')
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
      
      // Abrir WhatsApp
      window.open(url, '_blank')

      setCarrito([])
      setVista('tracker')
    },
    onError: (e) => mostrarNotif(e.message, 'error'),
  })


  const mostrarNotif = (msg, tipo = 'ok') => {
    clearTimeout(notifTimer.current)
    setNotif({ msg, tipo })
    notifTimer.current = setTimeout(() => setNotif(null), 4000)
  }

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.productoId === producto.id && !i.comboId)
      if (idx >= 0) {
        const n = [...prev]
        n[idx] = { ...n[idx], text: '', cantidad: n[idx].cantidad + 1 }
        return n
      }
      return [...prev, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }]
    })
  }

  const agregarComboAlCarrito = (combo) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.comboId === combo.id)
      if (idx >= 0) {
        const nuevo = [...prev]
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1 }
        return nuevo
      }
      return [...prev, {
        comboId: combo.id,
        nombre: combo.nombre,
        precio: combo.precio,
        cantidad: 1,
      }]
    })
  }

  const cambiarCantidad = (idx, delta) => {
    setCarrito(prev => {
      const n = [...prev]
      const nueva = n[idx].cantidad + delta
      if (nueva <= 0) n.splice(idx, 1)
      else n[idx] = { ...n[idx], cantidad: nueva }
      return n
    })
  }

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const costoEnvio = tipoEntrega === 'delivery' ? Number(dataConf?.configuracion?.costoDelivery ?? 0) : 0
  const total = subtotal + costoEnvio
  const cantCarrito = carrito.reduce((s, i) => s + i.cantidad, 0)

  const confirmarPedido = () => {
    if (!form.nombre || !form.telefono) {
      mostrarNotif('Nombre y teléfono son obligatorios', 'error')
      return
    }
    if (tipoEntrega === 'delivery' && !form.direccion) {
      mostrarNotif('La dirección es obligatoria para delivery', 'error')
      return
    }
    crearPedido({
      variables: {
        tipoEntrega,
        costoEnvio,
        clienteNombre: form.nombre,
        clienteTelefono: form.telefono,
        clienteDireccion: form.direccion,
        nota: form.nota,
        detalles: carrito.map(i => ({
          productoId: i.comboId ? null : parseInt(i.productoId),
          comboId: i.comboId ? parseInt(i.comboId) : null,
          cantidad: i.cantidad,
        })),
      },
    })
  }

  const whatsappUrl = (conf) => {
    const tel = (conf?.telefonoWhatsapp ?? '').replace(/\D/g, '')
    const items = carrito.map(i => `  ${i.cantidad}× ${i.nombre} — ${bs(i.precio * i.cantidad)}`).join('\n')
    const msg = [
      `Hola! Pedido #${numeroPedido || pedidoId || 'nuevo'} 🌹`,
      '',
      `📋 *Ítems:*\n${items}`,
      tipoEntrega === 'delivery' ? `🚚 Delivery a: ${form.direccion}` : `📍 Recojo en local`,
      `💰 Total: ${bs(total)}`,
      ``,
      `Mi nombre: ${form.nombre}`,
      `Tel: ${form.telefono}`,
      form.nota ? `Nota: ${form.nota}` : '',
      '',
      '(Adjunto comprobante Yape)',
    ].filter(Boolean).join('\n')
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
  }

  const conf = dataConf?.configuracion
  const categorias = dataMenu?.categorias ?? []
  const menu = dataMenu?.menu ?? []

  // ─── Vista tracker ───────────────────────────────────────────────
  if (vista === 'tracker') {
    return <TrackerOnline estado={estadoPedido} pedidoId={pedidoId} numeroPedido={numeroPedido} telefono={conf?.telefonoWhatsapp} tipoEntrega={tipoEntrega} />
  }

  // ─── Vista checkout ───────────────────────────────────────────────
  if (vista === 'checkout') {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setVista('menu')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <h1 className="text-lg font-bold text-pink-700">Confirmar pedido</h1>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
          {/* Tipo entrega */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Tipo de entrega</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'recojo',   label: '📍 Recojo en local',  sub: 'Gratis' },
                { val: 'delivery', label: '🚚 Delivery',         sub: bs(conf?.costoDelivery) },
              ].map(t => (
                <button key={t.val} onClick={() => setTipoEntrega(t.val)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                    tipoEntrega === t.val ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500'
                  }`}>
                  {t.label}<br /><span className="text-xs font-normal">{t.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Tus datos</p>
            {[
              { key: 'nombre',    label: 'Nombre *',         type: 'text',  ph: 'Tu nombre' },
              { key: 'telefono',  label: 'Teléfono *',       type: 'tel',   ph: '7xxxxxxx' },
              { key: 'direccion', label: 'Dirección de entrega *',  type: 'text',  ph: 'Dirección o enlace de Google Maps', show: tipoEntrega === 'delivery' },
              { key: 'nota',      label: 'Nota adicional o detalles de entrega',   type: 'text',  ph: 'Ej: Casa de rejas blancas, timbre 3' },
            ].filter(f => f.show !== false).map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                {f.key === 'direccion' ? (
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <input type={f.type} value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.ph}
                        className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
                      {form.direccion?.startsWith('http') && (
                        <span className="absolute right-3 text-emerald-500 font-semibold" title="Enlace de ubicación detectado">📍</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={obtenerUbicacionGps}
                      disabled={obteniendoGps}
                      className="w-full flex items-center justify-center gap-2 bg-pink-50 hover:bg-pink-100 disabled:bg-gray-50 text-pink-700 disabled:text-gray-400 font-semibold py-2.5 px-4 rounded-xl text-xs transition border border-pink-100 disabled:border-gray-200"
                    >
                      {obteniendoGps ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-pink-700 border-t-transparent rounded-full animate-spin" />
                          Obteniendo ubicación GPS...
                        </>
                      ) : (
                        <>
                          <span>📍</span> Compartir ubicación por GPS actual
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      Hacé clic para rellenar tu ubicación GPS actual de Google Maps, o pegá un enlace manualmente.
                    </p>
                  </div>
                ) : (
                  <input type={f.type} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
                )}
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Resumen</p>
            {carrito.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{item.cantidad}× {item.nombre}</span>
                <span className="font-medium">{bs(item.precio * item.cantidad)}</span>
              </div>
            ))}
            {tipoEntrega === 'delivery' && (
              <div className="flex justify-between text-sm py-1 text-gray-500">
                <span>Delivery</span><span>{bs(costoEnvio)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 mt-2">
              <span>Total</span>
              <span className="text-pink-600">{bs(total)}</span>
            </div>
          </div>

          {/* QR Yape */}
          {conf?.qrPagoUrl && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-3">Pagá con Yape</p>
              <img src={conf.qrPagoUrl} alt="QR Yape" className="w-48 h-48 object-contain mx-auto rounded-xl border border-gray-100" />
              <p className="text-xs text-gray-400 mt-2">Escaneá y pagá <strong>{bs(total)}</strong></p>
            </div>
          )}

          {notif && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium text-white text-center ${notif.tipo === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
              {notif.msg}
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3 pb-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas borrar toda la selección?')) {
                    setCarrito([])
                    setVista('menu')
                  }
                }}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-red-500 font-semibold rounded-2xl transition text-sm flex items-center justify-center gap-1.5 border border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Vaciar
              </button>
              <button
                type="button"
                onClick={confirmarPedido}
                disabled={creando || carrito.length === 0}
                className="flex-[2.5] bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                {creando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <span>📱</span> Confirmar y enviar por WhatsApp
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Al confirmar, tu pedido queda registrado con su número correlativo y se abrirá WhatsApp para enviar el comprobante.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Vista menú (default) ─────────────────────────────────────────
  const cerrado = conf && !conf.abiertoAhora

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {notif && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white ${notif.tipo === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {notif.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-pink-700">{conf?.nombreNegocio ?? 'Casa Rosa'}</h1>
                {conf && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${conf.abiertoAhora ? 'bg-green-500' : 'bg-red-500'}`}
                    title={conf.abiertoAhora ? 'Abierto' : 'Cerrado'} />
                )}
              </div>
              <p className="text-xs text-gray-400">Pedido online</p>
            </div>
            {usuario ? (
              <div className="flex items-center gap-2.5">
                <button onClick={() => setShowHistorial(true)}
                  className="bg-pink-50 hover:bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition">
                  📜 Mis Pedidos
                </button>
                <div className="flex items-center gap-2 border-l border-gray-100 pl-2.5">
                  {usuario.avatarUrl ? (
                    <img 
                      src={usuario.avatarUrl} 
                      referrerPolicy="no-referrer" 
                      className="w-7 h-7 rounded-full border border-pink-200 object-cover shadow-sm shrink-0" 
                      alt={usuario.username} 
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-pink-100 border border-pink-200 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {usuario.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[11px] font-bold text-gray-800 max-w-[80px] truncate">{usuario.username}</span>
                    <button onClick={logout} className="text-[9px] text-gray-400 hover:text-gray-600 leading-none mt-0.5">Salir</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={handleGoogleLogin}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Acceder
              </button>
            )}
          </div>

          {/* Tipo entrega */}
          <div className="flex gap-2 mt-3">
            {[
              { val: 'recojo',   label: '📍 Recojo' },
              { val: 'delivery', label: `🚚 Delivery ${conf ? `(${bs(conf.costoDelivery)})` : ''}` },
            ].map(t => (
              <button key={t.val} onClick={() => setTipoEntrega(t.val)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  tipoEntrega === t.val ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Banner cerrado */}
      {cerrado && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-600 font-semibold text-sm">🕐 Estamos cerrados</p>
            <p className="text-red-400 text-xs mt-1">
              Horario: {conf.horarioMananaInicio}–{conf.horarioMananaFin} y {conf.horarioTardeInicio}–{conf.horarioTardeFin}
            </p>
          </div>
        </div>
      )}

      {/* Banner de bienvenida / login */}
      {!usuario && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-3xl p-5 text-white shadow-md relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1 relative z-10">
              <h4 className="font-bold text-base leading-tight">🔒 ¡Guardá tus pedidos!</h4>
              <p className="text-xs text-white/80 max-w-[200px]">Iniciá sesión para guardar tu historial y rastrear tus pedidos en vivo.</p>
            </div>
            <button onClick={handleGoogleLogin}
              className="bg-white hover:bg-gray-50 text-pink-600 font-bold text-xs px-4 py-3 rounded-2xl shadow-md transition flex items-center gap-1.5 shrink-0 relative z-10">
              Entrar con Google
            </button>
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -left-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
          </div>
        </div>
      )}

      {/* Tabs categorías */}
      {!loadingMenu && (
        <>
          <div className="sticky top-[105px] z-10 bg-white border-b border-gray-100">
            <div className="max-w-lg mx-auto flex overflow-x-auto gap-1 px-4 py-2 scrollbar-none">
              {/* Pestaña de combos */}
              {(dataCombos?.combosActivos?.length > 0) && (
                <button
                  onClick={() => setCategoriaActiva(TAB_COMBOS)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${
                    categoriaActiva === TAB_COMBOS
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                  }`}
                >
                  🎁 Combos y Promos
                </button>
              )}
              {categorias.map(cat => (
                <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${
                    categoriaActiva === cat.id ? 'bg-pink-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {emojiCat(cat.nombre)} {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de combos */}
          {categoriaActiva === TAB_COMBOS && (
            <div className="max-w-lg mx-auto px-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                {(dataCombos?.combosActivos ?? []).map(combo => {
                  const enCarrito = carrito.find(i => i.comboId === combo.id)
                  return (
                    <div key={combo.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-pink-100">
                      {combo.fotoUrl ? (
                        <img src={combo.fotoUrl} alt={combo.nombre}
                          className="w-full h-36 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-36 bg-pink-50 flex items-center justify-center">
                          <span className="text-5xl">🎁</span>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight">{combo.nombre}</h3>
                        {combo.productos?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {combo.productos.map(p => p.nombre).join(' + ')}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-pink-600 text-sm">Bs {Number(combo.precio).toFixed(2)}</span>
                          {cerrado ? (
                            <span className="text-xs text-gray-300">Cerrado</span>
                          ) : enCarrito ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => cambiarCantidad(carrito.indexOf(enCarrito), -1)}
                                className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 font-bold text-base flex items-center justify-center leading-none"
                              >−</button>
                              <span className="text-sm font-semibold text-gray-700 w-4 text-center">{enCarrito.cantidad}</span>
                              <button
                                onClick={() => agregarComboAlCarrito(combo)}
                                className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-base flex items-center justify-center leading-none"
                              >+</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => agregarComboAlCarrito(combo)}
                              className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium px-3 py-1.5 rounded-full transition"
                            >
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grilla de productos */}
          {categoriaActiva !== TAB_COMBOS && (
            <div className="max-w-lg mx-auto px-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                {menu.filter(p => p.categoria.id === categoriaActiva).map(producto => {
                  const enCarrito = carrito.find(i => i.productoId === producto.id && !i.comboId)
                  return (
                    <div key={producto.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                      {producto.fotoUrl ? (
                        <img src={producto.fotoUrl} alt={producto.nombre} className="w-full h-36 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-36 bg-pink-50 flex items-center justify-center">
                          <span className="text-5xl">{emojiCat(categorias.find(c => c.id === producto.categoria.id)?.nombre)}</span>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight">{producto.nombre}</h3>
                        {producto.descripcion && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{producto.descripcion}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-pink-600 text-sm">{bs(producto.precio)}</span>
                          {cerrado ? (
                            <span className="text-xs text-gray-300">Cerrado</span>
                          ) : enCarrito ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => cambiarCantidad(carrito.indexOf(enCarrito), -1)}
                                className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center">−</button>
                              <span className="text-sm font-semibold w-4 text-center">{enCarrito.cantidad}</span>
                              <button onClick={() => agregarAlCarrito(producto)}
                                className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold flex items-center justify-center">+</button>
                            </div>
                          ) : (
                            <button onClick={() => agregarAlCarrito(producto)}
                              className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium px-3 py-1.5 rounded-full transition">
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Carrito flotante */}
      {cantCarrito > 0 && !cerrado && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4 flex gap-2">
          <button
            onClick={() => {
              if (window.confirm('¿Deseas borrar toda la selección?')) {
                setCarrito([])
              }
            }}
            className="bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 p-4 rounded-2xl shadow-xl transition flex items-center justify-center aspect-square shrink-0"
            title="Vaciar selección"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={() => setVista('checkout')}
            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-2xl shadow-xl flex items-center justify-between px-5 transition">
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm font-bold">{cantCarrito}</span>
            <span className="font-semibold">Ver pedido</span>
            <span className="font-bold">{bs(total)}</span>
          </button>
        </div>
      )}

      {/* Modales */}
      {showHistorial && (
        <ModalHistorial onClose={() => setShowHistorial(false)} onSelectTracker={(p) => {
          setPedidoId(parseInt(p.id))
          setNumeroPedido(p.numeroPedido)
          setEstadoPedido(p.estado)
          setTipoEntrega(p.tipoEntrega)
          setVista('tracker')
        }} />
      )}
    </div>
  )
}
