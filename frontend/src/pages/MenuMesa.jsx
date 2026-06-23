import { useState, useRef, useEffect, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  GET_MESA_CLIENTE, GET_MENU_COMPLETO, GET_PEDIDOS_MESA,
  CREAR_PEDIDO_MESA, AGREGAR_ITEMS, PEDIR_CUENTA,
  GET_COMBOS_ACTIVOS_MENU,
} from '../graphql/menu'
import { useMesaWS } from '../hooks/useMesaWS'

// Emojis por categoría para el placeholder de foto
const EMOJI_CATEGORIA = {
  'cafés': '☕', 'cafe': '☕', 'bebidas': '🥤', 'pastelería': '🍰',
  'pasteles': '🍰', 'tortas': '🎂', 'salados': '🥪', 'postres': '🍮',
  'jugos': '🍊', 'helados': '🍦',
}
const emojiPorCategoria = (nombre = '') => {
  const key = nombre.toLowerCase()
  return Object.entries(EMOJI_CATEGORIA).find(([k]) => key.includes(k))?.[1] ?? '🍽️'
}

// ─── Tracker visual de estado del pedido ─────────────────────────
const ESTADO_ORDEN = ['abierto', 'en_preparacion', 'listo', 'entregado', 'cobrar', 'cerrado']
const estadoIndex  = (e) => ESTADO_ORDEN.indexOf(e)

const MENSAJES = {
  abierto:        { titulo: '📋 Pedido recibido',          sub: 'Tu pedido llegó a cocina' },
  en_preparacion: { titulo: '🍳 Preparando tu pedido...',  sub: 'El cocinero está en ello' },
  listo:          { titulo: '✅ ¡Pedido listo!',           sub: 'Su pedido ya fue preparado por el chef, en un momento se lo llevaremos' },
  entregado:      { titulo: '🎉 ¡Buen provecho!',          sub: 'Disfrutá tu pedido' },
  cobrar:         { titulo: '💳 Cuenta en camino',         sub: 'Ya avisamos al mesero' },
}

function agruparPorRondas(detalles) {
  const grupos = {}
  detalles.forEach(d => {
    const key = d.creadoEn || 'Otro'
    if (!grupos[key]) {
      grupos[key] = []
    }
    grupos[key].push(d)
  })
  return Object.entries(grupos)
    .map(([timestamp, items]) => ({
      timestamp,
      items,
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

function formatearHora(isoString) {
  if (!isoString || isoString === 'Otro') return 'Pedidos anteriores'
  try {
    return new Date(isoString).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return 'Consumo'
  }
}

function TrackerEstado({ estado, total, detalles = [] }) {
  const [expandido, setExpandido] = useState(false)
  const idx = estadoIndex(estado)
  const msg = MENSAJES[estado] ?? MENSAJES.abierto

  const steps = [
    { label: 'Recibido',     minIdx: 0, doneIdx: 1 },
    { label: 'Preparando',   minIdx: 1, doneIdx: 2 },
    { label: '¡Listo!',      minIdx: 2, doneIdx: 2 },
  ]

  const rondas = agruparPorRondas(detalles)
  const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-gray-800">{msg.titulo}</p>
            <p className="text-xs text-gray-400 mt-0.5">{msg.sub}</p>
          </div>
          <span className="text-sm font-bold text-pink-600">
            {bs(total)}
          </span>
        </div>

        {/* Steps */}
        <div className="flex items-center mb-2">
          {steps.map((step, i) => {
            const done   = idx >= step.doneIdx
            const active = idx === step.minIdx && idx < step.doneIdx
            return (
              <Fragment key={step.label}>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done   ? 'bg-green-500 text-white' :
                    active ? 'bg-orange-400 text-white animate-pulse' :
                             'bg-gray-100 text-gray-300'
                  }`}>
                    {done ? '✓' : active ? '●' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center leading-tight max-w-[64px] ${
                    done   ? 'text-green-600 font-medium' :
                    active ? 'text-orange-500 font-medium' :
                             'text-gray-300'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 rounded transition-all ${
                    done ? 'bg-green-300' : 'bg-gray-100'
                  }`} />
                )}
              </Fragment>
            )
          })}
        </div>

        {/* Botón para expandir/colapsar rondas */}
        {detalles.length > 0 && (
          <div className="border-t border-gray-50 pt-3 mt-3">
            <button
              onClick={() => setExpandido(!expandido)}
              className="w-full flex items-center justify-between text-xs font-semibold text-pink-700 hover:text-pink-800 transition"
            >
              <span>📋 Ver mis consumos ({rondas.length} rondas)</span>
              <span>{expandido ? '▲ Ocultar' : '▼ Mostrar'}</span>
            </button>

            {expandido && (
              <div className="mt-3 space-y-3 max-h-[300px] overflow-y-auto pr-1 divide-y divide-gray-50">
                {rondas.map((ronda, rIdx) => (
                  <div key={rIdx} className="pt-3 first:pt-0">
                    <p className="text-[10px] font-bold text-pink-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span>Pedido #{rIdx + 1}</span>
                      <span>⏱ {formatearHora(ronda.timestamp)}</span>
                    </p>
                    <div className="space-y-1">
                      {ronda.items.map(d => (
                        <div key={d.id} className="flex justify-between items-baseline text-xs">
                          <span className="text-gray-600">
                            <span className="font-semibold text-pink-600">{d.cantidad}×</span> {d.nombreItem}
                            {d.nota && <span className="text-gray-400 italic text-[10px] ml-1">({d.nota})</span>}
                          </span>
                          <span className="font-medium text-gray-700">{bs(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MenuMesa() {
  const { id: slug } = useParams()

  // ─── Estado local ───────────────────────────────────────────────
  const [categoriaActiva, setCategoriaActiva] = useState('combos')
  const TAB_COMBOS = 'combos'
  const [carrito, setCarrito] = useState(() => {
    try {
      const saved = localStorage.getItem(`casa_rosa_carrito_mesa_${slug}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showCarrito, setShowCarrito] = useState(false)
  const [editandoNota, setEditandoNota] = useState(null) // índice del carrito
  const [notaTemp, setNotaTemp] = useState('')
  const [pedidoActivoId, setPedidoActivoId] = useState(null)
  const [cuentaPedida, setCuentaPedida] = useState(false)
  const [pedidoCerrado, setPedidoCerrado] = useState(false)
  const [notif, setNotif] = useState(null)
  const tabsRef = useRef(null)

  useEffect(() => {
    if (slug) {
      localStorage.setItem(`casa_rosa_carrito_mesa_${slug}`, JSON.stringify(carrito))
    }
  }, [carrito, slug])

  // Resetear estados locales cuando cambia la mesa seleccionada (slug de la URL)
  useEffect(() => {
    setPedidoActivoId(null)
    setCuentaPedida(false)
    setPedidoCerrado(false)
    try {
      const saved = localStorage.getItem(`casa_rosa_carrito_mesa_${slug}`)
      setCarrito(saved ? JSON.parse(saved) : [])
    } catch {
      setCarrito([])
    }
  }, [slug])


  // ─── Queries ────────────────────────────────────────────────────
  const { data: dataMesa, loading: loadingMesa } = useQuery(GET_MESA_CLIENTE, {
    variables: { id: slug },
    fetchPolicy: 'network-only',
  })
  // ID entero real de la mesa (pk de BD), disponible tras cargar la query
  const mesaId = dataMesa?.mesa ? parseInt(dataMesa.mesa.id) : null

  const { data: dataMenu, loading: loadingMenu } = useQuery(GET_MENU_COMPLETO)
  const { data: dataCombos } = useQuery(GET_COMBOS_ACTIVOS_MENU)

  useEffect(() => {
    if (dataMenu?.categorias?.length && categoriaActiva === 'combos' && !dataCombos?.combosActivos?.length) {
      setCategoriaActiva(dataMenu.categorias[0].id)
    }
  }, [dataMenu, dataCombos, categoriaActiva])

  const { data: dataPedidos, refetch: refetchPedidos } = useQuery(GET_PEDIDOS_MESA, {
    variables: { mesaId: mesaId ?? 0 },
    skip: !mesaId,
    fetchPolicy: 'network-only',
    pollInterval: 8000,
  })

  // Sincronizar pedidoActivoId con el servidor
  useEffect(() => {
    const pedidos = dataPedidos?.pedidosMesa
    if (pedidos === undefined) return // query aún no llegó
    if (pedidos.length > 0) {
      // Hay pedidos activos: inicializar si no hay ID local
      if (!pedidoActivoId) setPedidoActivoId(parseInt(pedidos[0].id))
    } else {
      // No hay pedidos activos: limpiar estado local
      setPedidoActivoId(null)
      setCuentaPedida(false)
    }
  }, [dataPedidos?.pedidosMesa])

  // ─── Mutations ──────────────────────────────────────────────────
  const [crearPedido, { loading: creando }] = useMutation(CREAR_PEDIDO_MESA, {
    onCompleted: (d) => {
      setPedidoActivoId(parseInt(d.crearPedidoMesa.id))
      setCarrito([])
      setShowCarrito(false)
      mostrarNotif('¡Pedido enviado a cocina! 🍳', 'ok')
    },
    onError: (err) => {
      mostrarNotif(err.message || 'Error al enviar pedido', 'error')
    }
  })

  const [agregarItems, { loading: agregando }] = useMutation(AGREGAR_ITEMS, {
    onCompleted: () => {
      setCarrito([])
      setShowCarrito(false)
      mostrarNotif('Productos agregados al pedido 👍', 'ok')
      refetchPedidos()
    },
    onError: (err) => {
      mostrarNotif(err.message || 'Error al agregar productos', 'error')
    },
  })

  const [pedirCuenta, { loading: pidiendo }] = useMutation(PEDIR_CUENTA, {
    onCompleted: () => {
      setCuentaPedida(true)
      mostrarNotif('¡Avisamos al mesero! Enseguida va 😊', 'ok')
    },
  })

  // ─── WebSocket tiempo real ───────────────────────────────────────
  useMesaWS(mesaId, (msg) => {
    if (msg.tipo === 'estado') {
      if (msg.estado === 'cerrado') {
        setPedidoCerrado(true)
        // Después de 5 segundos, reset completo para el próximo comensal
        setTimeout(() => {
          setPedidoCerrado(false)
          setPedidoActivoId(null)
          setCuentaPedida(false)
          refetchPedidos()
        }, 5000)
      } else {
        refetchPedidos()
      }
    } else if (msg.tipo === 'traslado') {
      // Redirigir automáticamente el navegador a la URL de la nueva mesa
      window.location.href = `/mesa/${msg.nuevo_slug}`
    }
  })

  // ─── Helpers ────────────────────────────────────────────────────
  const mostrarNotif = (msg, tipo) => {
    setNotif({ msg, tipo })
    setTimeout(() => setNotif(null), 3500)
  }

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.productoId === producto.id && !i.comboId)
      if (idx >= 0) {
        const nuevo = [...prev]
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1 }
        return nuevo
      }
      return [...prev, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        nota: '',
        categoriaId: producto.categoria.id,
      }]
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
        nota: '',
      }]
    })
  }

  const cambiarCantidad = (idx, delta) => {
    setCarrito(prev => {
      const nuevo = [...prev]
      const nuevaCantidad = nuevo[idx].cantidad + delta
      if (nuevaCantidad <= 0) {
        nuevo.splice(idx, 1)
      } else {
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevaCantidad }
      }
      return nuevo
    })
  }

  const guardarNota = () => {
    if (editandoNota === null) return
    setCarrito(prev => {
      const nuevo = [...prev]
      nuevo[editandoNota] = { ...nuevo[editandoNota], nota: notaTemp }
      return nuevo
    })
    setEditandoNota(null)
    setNotaTemp('')
  }

  const totalCarrito = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const cantidadCarrito = carrito.reduce((s, i) => s + i.cantidad, 0)

  const confirmarPedido = () => {
    if (carrito.length === 0) return
    const detalles = carrito.map(i => ({
      productoId: i.comboId ? null : parseInt(i.productoId),
      comboId: i.comboId ? parseInt(i.comboId) : null,
      cantidad: i.cantidad,
      nota: i.nota,
    }))
    if (pedidoActivoId) {
      agregarItems({ variables: { pedidoId: pedidoActivoId, detalles } })
    } else {
      crearPedido({ variables: { mesaId, detalles } })
    }
  }

  const handlePedirCuenta = () => {
    if (!pedidoActivoId) return
    pedirCuenta({ variables: { pedidoId: pedidoActivoId } })
  }

  const productosCategoria = (categoriaId) =>
    dataMenu?.menu?.filter(p => p.categoria.id === categoriaId) ?? []

  const pedidosAbiertos = dataPedidos?.pedidosMesa ?? []
  const pedidoActual = pedidosAbiertos[0] ?? null
  const cuentaYaPedida = cuentaPedida || pedidoActual?.estado === 'cobrar'
  const guardando = creando || agregando

  // ─── Estados de carga y error ───────────────────────────────────
  if (loadingMesa) return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center">
      <p className="text-pink-400 text-sm animate-pulse">Cargando menú...</p>
    </div>
  )

  if (!dataMesa?.mesa) return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-6 text-center">
      <span className="text-5xl mb-4">😕</span>
      <h2 className="text-xl font-semibold text-gray-700">Mesa no encontrada</h2>
      <p className="text-gray-400 text-sm mt-2">Verificá que el QR sea correcto.</p>
    </div>
  )

  const mesa = dataMesa.mesa
  const categorias = dataMenu?.categorias ?? []

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Notificación */}
      {notif && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-bold text-white text-center w-[90%] max-w-sm transition-all animate-fade-up ${notif.tipo === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notif.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-pink-700">Casa Rosa</h1>
            <p className="text-xs text-gray-400">{mesa.nombre}</p>
          </div>
          {pedidoActivoId && !cuentaYaPedida && (
            <button
              onClick={handlePedirCuenta}
              disabled={pidiendo}
              className="text-xs bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 rounded-full font-medium hover:bg-pink-100 transition disabled:opacity-50"
            >
              {pidiendo ? '...' : 'Pedir la cuenta'}
            </button>
          )}
          {cuentaYaPedida && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
              ✓ Cuenta solicitada
            </span>
          )}
        </div>
      </header>

      {/* Pantalla "Gracias" cuando el pedido fue cobrado */}
      {pedidoCerrado && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="font-bold text-pink-700 text-xl mb-1">¡Gracias por visitarnos!</p>
            <p className="text-pink-400 text-sm">Esperamos verte pronto 😊</p>
          </div>
        </div>
      )}

      {/* Tracker de estado (mientras hay pedido activo y no fue cerrado) */}
      {pedidoActual && !pedidoCerrado && (
        <TrackerEstado estado={pedidoActual.estado} total={pedidoActual.total} detalles={pedidoActual.detalles} />
      )}

      {/* Tabs de categorías */}
      {loadingMenu ? (
        <div className="h-12 flex items-center justify-center">
          <p className="text-gray-400 text-sm animate-pulse">Cargando menú...</p>
        </div>
      ) : (
        <>
          <div ref={tabsRef} className="sticky top-[65px] z-10 bg-white border-b border-gray-100">
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
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${
                    categoriaActiva === cat.id
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {emojiPorCategoria(cat.nombre)} {cat.nombre}
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
                          {enCarrito ? (
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
            {categoriaActiva && (
              <>
                {productosCategoria(categoriaActiva).length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">
                    No hay productos disponibles en esta categoría.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {productosCategoria(categoriaActiva).map(producto => {
                      const enCarrito = carrito.find(i => i.productoId === producto.id && !i.comboId)
                      const catNombre = categorias.find(c => c.id === producto.categoria.id)?.nombre ?? ''
                      return (
                        <div key={producto.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                          {/* Foto / placeholder */}
                          {producto.fotoUrl ? (
                            <img src={producto.fotoUrl} alt={producto.nombre}
                              className="w-full h-36 object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-36 bg-pink-50 flex items-center justify-center">
                              <span className="text-5xl">{emojiPorCategoria(catNombre)}</span>
                            </div>
                          )}
                          <div className="p-3">
                            <h3 className="font-semibold text-gray-800 text-sm leading-tight">{producto.nombre}</h3>
                            {producto.descripcion && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{producto.descripcion}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-pink-600 text-sm">Bs {Number(producto.precio).toFixed(2)}</span>
                              {enCarrito ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => cambiarCantidad(carrito.indexOf(enCarrito), -1)}
                                    className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 font-bold text-base flex items-center justify-center leading-none"
                                  >−</button>
                                  <span className="text-sm font-semibold text-gray-700 w-4 text-center">{enCarrito.cantidad}</span>
                                  <button
                                    onClick={() => agregarAlCarrito(producto)}
                                    className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-base flex items-center justify-center leading-none"
                                  >+</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => agregarAlCarrito(producto)}
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
                )}
              </>
            )}
          </div>
          )}
        </>
      )}

      {/* Botón flotante del carrito */}
      {cantidadCarrito > 0 && (
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
          <button
            onClick={() => setShowCarrito(true)}
            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-2xl shadow-xl flex items-center justify-between px-5 transition"
          >
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm font-bold">{cantidadCarrito}</span>
            <span className="font-semibold">Ver pedido</span>
            <span className="font-bold">Bs {totalCarrito.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Panel del carrito */}
      {showCarrito && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCarrito(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Tu pedido</h2>
              <button onClick={() => setShowCarrito(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Items del carrito */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
              {carrito.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    {/* Controles cantidad */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => cambiarCantidad(idx, -1)}
                        className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center">
                        −
                      </button>
                      <span className="text-sm font-semibold w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(idx, 1)}
                        className="w-7 h-7 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center">
                        +
                      </button>
                    </div>
                    {/* Nombre y precio */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                      Bs {(item.precio * item.cantidad).toFixed(2)}
                    </p>
                  </div>

                  {/* Nota */}
                  {editandoNota === idx ? (
                    <div className="flex gap-2 ml-11">
                      <input
                        autoFocus
                        type="text"
                        value={notaTemp}
                        onChange={e => setNotaTemp(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && guardarNota()}
                        placeholder="Ej: sin azúcar, bien caliente..."
                        className="flex-1 text-xs border border-pink-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-400"
                        maxLength={120}
                      />
                      <button onClick={guardarNota}
                        className="text-xs bg-pink-600 text-white px-3 py-1.5 rounded-lg font-medium">
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditandoNota(idx); setNotaTemp(item.nota) }}
                      className="ml-11 text-left text-xs text-pink-500 hover:text-pink-700"
                    >
                      {item.nota ? `📝 ${item.nota}` : '+ Agregar nota'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Total y botón confirmar */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Total</span>
                <span className="text-xl font-bold text-gray-800">Bs {totalCarrito.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (window.confirm('¿Deseas borrar toda la selección?')) { setCarrito([]); setShowCarrito(false) } }}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-red-500 font-semibold rounded-2xl transition text-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Vaciar
                </button>
                <button
                  onClick={confirmarPedido}
                  disabled={guardando || carrito.length === 0}
                  className="flex-[2] py-3.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white font-semibold rounded-2xl transition text-sm"
                >
                  {guardando ? 'Enviando...' : pedidoActivoId ? 'Agregar al pedido' : 'Confirmar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
