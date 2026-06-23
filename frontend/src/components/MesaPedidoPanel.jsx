import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { useAuth } from '../context/AuthContext'
import SplitBillModal from './SplitBillModal'
import {
  GET_MESAS,
  TRASLADAR_PEDIDO,
  APLICAR_DESCUENTO_PROPINA
} from '../graphql/mesas'
import {
  GET_PEDIDOS_MESA,
  AGREGAR_ITEMS,
  CREAR_PEDIDO_MESA,
  GET_MENU_COMPLETO,
  ACTUALIZAR_CANTIDAD_DETALLE
} from '../graphql/menu'
import {
  REGISTRAR_COBRO
} from '../graphql/caja'

const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`

const CAT_EMOJIS = {
  cafe: '☕', cafes: '☕', café: '☕', cafés: '☕',
  postre: '🍰', postres: '🍰', pasteleria: '🍰', pastelería: '🍰', pasteles: '🍰',
  saladito: '🥐', saladitos: '🥐', salado: '🥐', salados: '🥐',
  bebida: '🧃', bebidas: '🧃', jugo: '🧃', jugos: '🧃',
  desayuno: '🍳', desayunos: '🍳',
  sandwich: '🥪', sandwiches: '🥪', sándwich: '🥪',
  ensalada: '🥗', ensaladas: '🥗',
  combo: '🎁', combos: '🎁',
  pizza: '🍕', burger: '🍔', hamburguesa: '🍔',
  helado: '🍦', helados: '🍦',
  torta: '🎂', tortas: '🎂',
  pan: '🥖', panes: '🥖',
  fruta: '🍓', frutas: '🍓',
  chocolate: '🍫', chocolates: '🍫',
  galleta: '🍪', galletas: '🍪',
  queque: '🧁', queques: '🧁',
  muffin: '🧁', muffins: '🧁',
}

function getEmojiCat(nombre) {
  if (!nombre) return '🍽️'
  const key = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return CAT_EMOJIS[key] ?? '🍽️'
}

/**
 * Panel lateral de pedido/cobro de una mesa. Compartido entre "Punto de Venta"
 * y "Mesas & QR" para no duplicar la lógica de comandas.
 */
export default function MesaPedidoPanel({ mesa, mesas, onClose, headerActions }) {
  const { usuario } = useAuth()

  const [notif, setNotif] = useState(null)

  // Descuento y traslado
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [descuentoVal, setDescuentoVal] = useState('0')
  const [propinaVal, setPropinaVal] = useState('0')

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [nuevaMesaId, setNuevaMesaId] = useState('')

  const [showSplitModal, setShowSplitModal] = useState(false)
  const [mobileTab, setMobileTab] = useState('menu') // 'menu' o 'cuenta'
  const [productQuery, setProductQuery] = useState('')
  const [cart, setCart] = useState([])
  const [activeCategory, setActiveCategory] = useState('todos')

  const { data: dataMenu } = useQuery(GET_MENU_COMPLETO)

  // Pedido activo de la mesa
  const { data: dataPedidos, refetch: refetchPedidos } = useQuery(GET_PEDIDOS_MESA, {
    variables: { mesaId: parseInt(mesa.id) },
    fetchPolicy: 'network-only',
    pollInterval: 8000,
  })

  const orderActivo = dataPedidos?.pedidosMesa?.[0] ?? null

  const refetchOpts = { refetchQueries: [{ query: GET_MESAS }] }

  const mostrarNotif = (msg, tipo) => { setNotif({ msg, tipo }); setTimeout(() => setNotif(null), 3000) }

  // Mutations
  const [trasladarPedido, { loading: trasladando }] = useMutation(TRASLADAR_PEDIDO, {
    ...refetchOpts,
    onCompleted: () => {
      setShowTransferModal(false)
      mostrarNotif('Pedido trasladado con éxito', 'ok')
      onClose()
    }
  })

  const [aplicarDescPropina, { loading: aplicandoDescPropina }] = useMutation(APLICAR_DESCUENTO_PROPINA, {
    onCompleted: () => {
      setShowDiscountModal(false)
      refetchPedidos()
      mostrarNotif('Descuento/Propina aplicados', 'ok')
    }
  })

  const [agregarItems, { loading: agregandoItems }] = useMutation(AGREGAR_ITEMS, {
    onCompleted: () => {
      setShowAddProductModal(false)
      refetchPedidos()
      mostrarNotif('Productos agregados a la mesa', 'ok')
    },
    onError: (err) => {
      mostrarNotif(err.message || 'Error al agregar productos', 'error')
    }
  })

  const [crearPedidoMesa, { loading: creandoPedido }] = useMutation(CREAR_PEDIDO_MESA, {
    ...refetchOpts,
    onCompleted: () => {
      refetchPedidos()
      mostrarNotif('Mesa abierta. Pedido enviado a cocina.', 'ok')
    },
    onError: (err) => {
      mostrarNotif(err.message || 'Error al abrir mesa', 'error')
    }
  })

  const [registrarCobro, { loading: cobrando }] = useMutation(REGISTRAR_COBRO, {
    refetchQueries: [{ query: GET_MESAS }, { query: GET_PEDIDOS_MESA, variables: { mesaId: parseInt(mesa.id) } }],
    onCompleted: () => {
      mostrarNotif('Cuenta cerrada con éxito', 'ok')
      onClose()
    },
    onError: (err) => {
      console.error('Error al cobrar:', err)
      mostrarNotif(err.message || 'Error al cobrar', 'error')
    }
  })

  const [actualizarCantidadDetalle, { loading: actualizandoCantidad }] = useMutation(ACTUALIZAR_CANTIDAD_DETALLE, {
    refetchQueries: [{ query: GET_MESAS }],
    onCompleted: () => {
      refetchPedidos()
      mostrarNotif('Cantidad actualizada', 'ok')
    },
    onError: (err) => {
      mostrarNotif(err.message || 'Error al actualizar cantidad', 'error')
    }
  })

  // Handlers
  const handleConfirmarPedido = () => {
    if (cart.length === 0) return
    const detallesInput = cart.map(i => ({
      productoId: i.productoId,
      cantidad: i.cantidad,
      nota: i.nota
    }))
    crearPedidoMesa({
      variables: {
        mesaId: parseInt(mesa.id),
        detalles: detallesInput
      }
    })
    setCart([])
  }

  const handleRemoveFromCart = (index) => {
    setCart(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateCartItem = (index, field, value) => {
    setCart(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const handleTrasladar = () => {
    if (!orderActivo || !nuevaMesaId) return
    trasladarPedido({
      variables: {
        pedidoId: parseInt(orderActivo.id),
        nuevaMesaId: parseInt(nuevaMesaId)
      }
    })
  }

  const handleDescuentoSubmit = (e) => {
    e.preventDefault()
    if (!orderActivo) return
    aplicarDescPropina({
      variables: {
        pedidoId: parseInt(orderActivo.id),
        descuento: parseFloat(descuentoVal) || 0.0,
        propina: parseFloat(propinaVal) || 0.0
      }
    })
  }

  const handleAddProduct = (producto) => {
    if (!orderActivo) {
      setCart(prev => {
        const existing = prev.find(item => item.productoId === parseInt(producto.id))
        if (existing) {
          return prev.map(item => item.productoId === parseInt(producto.id) ? { ...item, cantidad: item.cantidad + 1 } : item)
        } else {
          return [...prev, {
            productoId: parseInt(producto.id),
            nombre: producto.nombre,
            precio: parseFloat(producto.precio),
            cantidad: 1,
            nota: ''
          }]
        }
      })
      mostrarNotif(`${producto.nombre} añadido al borrador`, 'ok')
      return
    }
    agregarItems({
      variables: {
        pedidoId: parseInt(orderActivo.id),
        detalles: [{
          productoId: parseInt(producto.id),
          cantidad: 1,
          nota: ''
        }]
      }
    })
  }

  const handleCobrarMesa = (medio) => {
    if (!orderActivo) {
      mostrarNotif('No hay un pedido activo para cobrar', 'error')
      return
    }
    if (cobrando) return
    if (!usuario || !usuario.id) {
      mostrarNotif('Debes iniciar sesión para registrar un cobro', 'error')
      return
    }
    registrarCobro({
      variables: {
        pedidoId: parseInt(orderActivo.id),
        medio,
        cajeraId: parseInt(usuario.id)
      }
    })
  }

  const mesasLibres = (mesas ?? []).filter(m => m.estado === 'libre' && m.id !== mesa?.id)

  const filteredProducts = dataMenu?.menu?.filter(p =>
    (p.nombre.toLowerCase().includes(productQuery.toLowerCase()) ||
    (p.codigoBarras && p.codigoBarras.includes(productQuery))) &&
    (activeCategory === 'todos' || p.categoria?.id === activeCategory)
  ) ?? []

  return (
    <>
      {/* Toast Notificación */}
      {notif && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-semibold text-white animate-fade-up ${notif.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <span>{notif.tipo === 'ok' ? '✓' : '✕'}</span>{notif.msg}
        </div>
      )}

      {/* ── PANEL DETALLE/PEDIDO DE MESA REDISEÑADO ── */}
      <div className="fixed inset-0 z-40 flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-tinta/45 backdrop-blur-sm" onClick={onClose} />

        {/* Panel content (Split-screen) */}
        <div className="relative bg-white w-full max-w-6xl h-full shadow-2xl flex flex-col border-l border-linea animate-fade-left overflow-hidden">
          
          {/* Mobile Tab Selector */}
          <div className="flex md:hidden border-b border-linea bg-crema/20 p-1.5 gap-1.5 flex-shrink-0">
            <button
              onClick={() => setMobileTab('menu')}
              className={`flex-1 py-2 text-center rounded-xl text-xs font-outfit font-bold transition-all ${
                mobileTab === 'menu'
                  ? 'bg-vino text-white shadow-sm'
                  : 'text-tinta hover:bg-crema/50 bg-white border border-linea'
              }`}
            >
              🍽️ Catálogo
            </button>
            <button
              onClick={() => setMobileTab('cuenta')}
              className={`flex-1 py-2 text-center rounded-xl text-xs font-outfit font-bold transition-all relative ${
                mobileTab === 'cuenta'
                  ? 'bg-vino text-white shadow-sm'
                  : 'text-tinta hover:bg-crema/50 bg-white border border-linea'
              }`}
            >
              🧾 Detalle Mesa
              {/* Badge for draft cart length */}
              {!orderActivo && cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1 bg-rosa text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {cart.length}
                </span>
              )}
              {/* Badge for active order items count */}
              {orderActivo && orderActivo.detalles.length > 0 && (
                <span className="absolute -top-1.5 -right-1 bg-rosa text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {orderActivo.detalles.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
            
            {/* ══════════════════════════════════════════
                COLUMNA IZQUIERDA: CATÁLOGO DE PRODUCTOS (DIRECTO)
                ══════════════════════════════════════════ */}
            <div className={`flex-1 flex flex-col bg-[#fdfaf7] min-h-0 border-r border-linea ${mobileTab === 'menu' ? 'flex' : 'hidden md:flex'}`}>
              {/* Header del catálogo / Buscador */}
              <div className="p-4 bg-crema/20 border-b border-linea flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0">
                <span className="text-xs font-outfit font-bold uppercase tracking-wider text-vino flex items-center gap-1.5">
                  🛍️ Catálogo de Productos
                </span>
                <div className="relative w-full sm:w-[320px]">
                  <input
                    type="text"
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                    placeholder="🔍 Buscar producto..."
                    className="w-full border border-linea rounded-xl px-3.5 py-1.5 text-xs font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa transition-all"
                  />
                  {productQuery && (
                    <button onClick={() => setProductQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris hover:text-tinta text-sm font-bold">×</button>
                  )}
                </div>
              </div>

              {/* Split layout: Categorías (sidebar en desktop, row en mobile) + Grid */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                {/* Categorías Sidebar (Desktop) / Horizontal Row (Mobile) */}
                <div className="w-full md:w-[170px] bg-crema/10 border-b md:border-b-0 md:border-r border-linea overflow-x-auto md:overflow-y-auto p-3 flex md:flex-col gap-1.5 flex-shrink-0 whitespace-nowrap scrollbar-none">
                  <button
                    onClick={() => setActiveCategory('todos')}
                    className={`px-3 py-2 rounded-xl text-[11px] font-outfit font-bold transition-all flex items-center gap-1.5 flex-shrink-0 md:w-full text-left ${
                      activeCategory === 'todos'
                        ? 'bg-vino text-white shadow-sm'
                        : 'text-tinta hover:bg-crema/40 bg-white md:bg-transparent border border-linea md:border-0'
                    }`}
                  >
                    <span>🍽️</span>
                    <span className="truncate">Todos</span>
                  </button>
                  {dataMenu?.categorias?.map(cat => {
                    const activa = activeCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-outfit font-bold transition-all flex items-center gap-1.5 flex-shrink-0 md:w-full text-left ${
                          activa
                            ? 'bg-vino text-white shadow-sm'
                            : 'text-tinta hover:bg-crema/40 bg-white md:bg-transparent border border-linea md:border-0'
                        }`}
                      >
                        <span>{getEmojiCat(cat.nombre)}</span>
                        <span className="truncate">{cat.nombre}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Grid de productos */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-2 opacity-30">🔍</p>
                      <p className="text-gris text-xs font-outfit italic">No se encontraron productos.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAddProduct(p)}
                          className="bg-white rounded-2xl border border-linea overflow-hidden flex flex-col hover:shadow-md hover:border-rosa-claro transition-all active:scale-[0.97] cursor-pointer group relative"
                        >
                          {/* Foto / Emoji */}
                          <div className="relative h-20 bg-rosa-niebla/25 overflow-hidden flex-shrink-0 flex items-center justify-center border-b border-linea/40">
                            {p.fotoUrl ? (
                              <img src={p.fotoUrl} alt={p.nombre} className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <span className="text-2xl opacity-40">{getEmojiCat(p.categoria?.nombre || '')}</span>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-2.5 flex flex-col justify-between flex-1">
                            <p className="font-outfit font-bold text-tinta text-[11px] leading-snug line-clamp-2 h-[32px] overflow-hidden" title={p.nombre}>
                              {p.nombre}
                            </p>
                            <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-linea/40">
                              <span className="font-outfit font-extrabold text-rosa text-[11px]">{bs(p.precio)}</span>
                              <span className="w-5.5 h-5.5 flex items-center justify-center rounded-lg bg-rosa-niebla text-rosa font-bold text-xs flex-shrink-0 group-hover:bg-rosa group-hover:text-white transition-colors">
                                +
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════
                COLUMNA DERECHA: COMANDA / CONSUMO DE MESA
                ══════════════════════════════════════════ */}
            <div className={`w-full md:w-[400px] h-full flex flex-col bg-white overflow-hidden flex-shrink-0 ${mobileTab === 'cuenta' ? 'flex' : 'hidden md:flex'}`}>
              {/* Header del panel */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-linea bg-crema/40 flex-shrink-0">
                <div>
                  <h3 className="font-fraunces font-bold text-tinta text-lg">{mesa.nombre}</h3>
                  <p className="text-[10px] text-gris font-outfit mt-0.5">
                    Salón: <span className="font-bold text-tinta">{mesa.area?.nombre ?? 'Ninguno'}</span> · Capacidad: <span className="font-bold text-tinta">{mesa.seats || 4}</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-gris hover:text-tinta hover:bg-linea transition-all text-xl"
                >
                  ×
                </button>
              </div>

              {/* Cuerpo de la comanda */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Acciones de administración de la mesa (QR, Editar, Eliminar) */}
                {headerActions && (
                  <div className="bg-crema/50 border border-linea/70 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                    {headerActions}
                  </div>
                )}

                {/* Detalle del consumo */}
                <div>
                  <h4 className="text-[10px] font-outfit font-bold text-gris uppercase tracking-wider mb-2.5">Detalle del consumo</h4>
                  
                  {orderActivo ? (
                    /* --- MESA OCUPADA --- */
                    <div className="space-y-4">
                      {/* Tarjeta de consumo activo */}
                      <div className="bg-white rounded-2xl border border-linea overflow-hidden shadow-sm">
                        <div className="bg-rosa-niebla/40 px-4 py-2 border-b border-linea flex justify-between items-center">
                          <span className="text-[11px] font-outfit font-bold text-vino">Pedido #{orderActivo.numeroPedido || orderActivo.id}</span>
                          <span className="text-[9px] bg-rosa text-white font-outfit font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {orderActivo.estado}
                          </span>
                        </div>

                        <div className="p-3 divide-y divide-linea/60 space-y-2">
                          <div className="space-y-2.5 pb-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {orderActivo.detalles.map(d => (
                              <div key={d.id} className="flex justify-between items-center text-[11px] font-outfit py-1.5 border-b border-slate-100 last:border-0">
                                <div className="flex flex-col flex-1 pr-2">
                                  <span className="text-tinta leading-tight font-medium">
                                    {d.nombreItem}
                                  </span>
                                  {d.nota && <span className="text-gris italic text-[9px]">({d.nota})</span>}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {/* Quantity Controls */}
                                  <div className="flex items-center border border-linea rounded-lg overflow-hidden bg-white shadow-xs">
                                    <button
                                      onClick={() => actualizarCantidadDetalle({ variables: { detalleId: parseInt(d.id), cantidad: d.cantidad - 1 } })}
                                      disabled={actualizandoCantidad}
                                      className="w-5 h-5 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 text-[10px] font-bold"
                                      title="Disminuir cantidad"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 text-[10px] font-bold text-tinta">{d.cantidad}</span>
                                    <button
                                      onClick={() => actualizarCantidadDetalle({ variables: { detalleId: parseInt(d.id), cantidad: d.cantidad + 1 } })}
                                      disabled={actualizandoCantidad}
                                      className="w-5 h-5 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 text-[10px] font-bold"
                                      title="Incrementar cantidad"
                                    >
                                      +
                                    </button>
                                  </div>
                                  
                                  <span className="font-semibold text-tinta w-[60px] text-right">{bs(d.subtotal)}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desglose de totales */}
                          <div className="pt-2 space-y-1 text-[11px] font-outfit text-gris">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span className="text-tinta font-semibold">{bs(orderActivo.detalles.reduce((s,d)=>s+Number(d.subtotal),0))}</span>
                            </div>
                            {Number(orderActivo.descuento) > 0 && (
                              <div className="flex justify-between text-red-500 font-medium">
                                <span>Descuento</span>
                                <span>-{bs(orderActivo.descuento)}</span>
                              </div>
                            )}
                            {Number(orderActivo.propina) > 0 && (
                              <div className="flex justify-between text-emerald-600 font-medium">
                                <span>Propina</span>
                                <span>+{bs(orderActivo.propina)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-fraunces font-bold text-tinta pt-2 border-t border-dashed border-linea">
                              <span>Total General</span>
                              <span className="text-rosa text-sm">{bs(orderActivo.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Acciones del pedido */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            setNuevaMesaId('')
                            setShowTransferModal(true)
                          }}
                          className="py-2.5 bg-white border border-linea hover:border-gris text-tinta rounded-xl text-[10px] font-outfit font-semibold transition-all flex flex-col items-center justify-center gap-1"
                        >
                          <span>🔀</span> Trasladar
                        </button>
                        <button
                          onClick={() => setShowSplitModal(true)}
                          className="py-2.5 bg-white border border-linea hover:border-gris text-tinta rounded-xl text-[10px] font-outfit font-semibold transition-all flex flex-col items-center justify-center gap-1"
                        >
                          <span>✂️</span> Dividir
                        </button>
                        <button
                          onClick={() => {
                            setDescuentoVal(orderActivo.descuento || '0')
                            setPropinaVal(orderActivo.propina || '0')
                            setShowDiscountModal(true)
                          }}
                          className="py-2.5 bg-white border border-linea hover:border-gris text-tinta rounded-xl text-[10px] font-outfit font-semibold transition-all flex flex-col items-center justify-center gap-1"
                        >
                          <span>🏷️</span> Descuento
                        </button>
                      </div>

                      {/* Botones de cobro */}
                      <div className="pt-3 border-t border-linea/60">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCobrarMesa('efectivo')}
                            disabled={cobrando}
                            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gris disabled:cursor-not-allowed text-white rounded-xl text-xs font-outfit font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            {cobrando ? '⏳...' : '💵 Efectivo'}
                          </button>
                          <button
                            onClick={() => handleCobrarMesa('qr')}
                            disabled={cobrando}
                            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gris disabled:cursor-not-allowed text-white rounded-xl text-xs font-outfit font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            {cobrando ? '⏳...' : '📱 QR'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : mesa.estado === 'libre' ? (
                    /* --- MESA DISPONIBLE / LIBRE --- */
                    <div className="space-y-4">
                      {cart.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-linea rounded-2xl bg-white">
                          <p className="text-2xl mb-1.5">🟢</p>
                          <h5 className="font-fraunces font-bold text-tinta text-xs">Mesa Disponible</h5>
                          <p className="text-[10px] text-gris font-outfit mt-1 px-6 leading-relaxed">
                            Haz clic en los productos del catálogo de la izquierda para comenzar el pedido.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Carrito borrador */}
                          <div className="bg-white rounded-2xl border border-linea overflow-hidden shadow-sm animate-fade-up">
                            <div className="bg-amber-50 px-4 py-2 border-b border-linea flex justify-between items-center">
                              <span className="text-[10px] font-outfit font-bold text-amber-700">📝 Comanda Borrador</span>
                              <span className="text-[9px] bg-amber-500 text-white font-outfit font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Borrador
                              </span>
                            </div>

                            <div className="p-3 divide-y divide-linea/60 space-y-2.5">
                              <div className="space-y-3 pb-1.5 max-h-[200px] overflow-y-auto pr-1">
                                {cart.map((item, idx) => (
                                  <div key={idx} className="space-y-1.5 py-1 border-b border-slate-100 last:border-0">
                                    <div className="flex justify-between items-center text-[11px] font-outfit">
                                      <span className="text-tinta leading-tight font-medium flex-1 pr-2">{item.nombre}</span>
                                      
                                      <div className="flex items-center gap-2">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center border border-linea rounded-lg overflow-hidden bg-white shadow-xs">
                                          <button
                                            onClick={() => {
                                              if (item.cantidad <= 1) {
                                                handleRemoveFromCart(idx)
                                              } else {
                                                handleUpdateCartItem(idx, 'cantidad', item.cantidad - 1)
                                              }
                                            }}
                                            className="w-5 h-5 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                                            title="Disminuir cantidad"
                                          >
                                            -
                                          </button>
                                          <span className="px-2 text-[10px] font-bold text-tinta">{item.cantidad}</span>
                                          <button
                                            onClick={() => handleUpdateCartItem(idx, 'cantidad', item.cantidad + 1)}
                                            className="w-5 h-5 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                                            title="Incrementar cantidad"
                                          >
                                            +
                                          </button>
                                        </div>
                                        
                                        <span className="font-semibold text-tinta w-[60px] text-right">{bs(item.precio * item.cantidad)}</span>
                                        <button onClick={() => handleRemoveFromCart(idx)} className="text-red-400 hover:text-red-600 font-bold text-xs" title="Eliminar del borrador">✕</button>
                                      </div>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.nota}
                                      onChange={e => handleUpdateCartItem(idx, 'nota', e.target.value)}
                                      placeholder="Nota de cocina..."
                                      className="w-full border border-linea rounded-lg px-2 py-1 text-[9px] font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none"
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="pt-2 text-[11px] font-outfit text-gris">
                                <div className="flex justify-between text-xs font-fraunces font-bold text-tinta">
                                  <span>Total Estimado</span>
                                  <span className="text-rosa text-sm">{bs(cart.reduce((s,i)=>s+(i.precio*i.cantidad), 0))}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Botones de acción del borrador */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setCart([])}
                              className="py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-[11px] font-outfit font-semibold transition-all flex items-center justify-center gap-1"
                            >
                              🗑️ Cancelar
                            </button>
                            <button
                              onClick={handleConfirmarPedido}
                              disabled={creandoPedido}
                              className="py-2 bg-vino hover:bg-rosa disabled:bg-gris text-white rounded-xl text-[11px] font-outfit font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                            >
                              {creandoPedido ? '⏳...' : '🔥 Mandar a Cocina'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-2xl animate-pulse">⏳</p>
                      <p className="text-xs text-gris font-outfit mt-1">Cargando comanda...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Modal Aplicar Descuento / Propina ── */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-sm overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
              <h3 className="font-fraunces font-bold text-tinta text-base">Descuento & Propina</h3>
              <button onClick={() => setShowDiscountModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-gris hover:text-tinta hover:bg-linea transition-all text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleDescuentoSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Descuento (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={descuentoVal}
                  onChange={e => setDescuentoVal(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Propina Sugerida (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={propinaVal}
                  onChange={e => setPropinaVal(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDiscountModal(false)} className="flex-1 py-2.5 border border-linea rounded-xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={aplicandoDescPropina} className="flex-1 py-2.5 bg-vino hover:bg-rosa disabled:bg-gris text-white rounded-xl font-outfit font-semibold text-sm transition-all shadow-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Trasladar Mesa ── */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-sm overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
              <h3 className="font-fraunces font-bold text-tinta text-base">Trasladar Mesa</h3>
              <button onClick={() => setShowTransferModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-gris hover:text-tinta hover:bg-linea transition-all text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gris font-outfit leading-relaxed">
                Seleccioná una mesa libre a la cual trasladar todos los consumos activos de la mesa <strong className="text-tinta">{mesa.nombre}</strong>.
              </p>
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Mesa Destino</label>
                <select value={nuevaMesaId} onChange={e => setNuevaMesaId(e.target.value)} className={inputCls}>
                  <option value="">Seleccionar mesa...</option>
                  {mesasLibres.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} ({m.area?.nombre ?? 'Sin salón'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-2.5 border border-linea rounded-xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={trasladando || !nuevaMesaId}
                  onClick={handleTrasladar}
                  className="flex-1 py-2.5 bg-vino hover:bg-rosa disabled:bg-gris text-white rounded-xl font-outfit font-semibold text-sm transition-all shadow-sm"
                >
                  {trasladando ? 'Trasladando...' : 'Confirmar traslado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Split Bill (División de Cuenta) ── */}
      {showSplitModal && orderActivo && (
        <SplitBillModal
          pedido={orderActivo}
          cajeraId={usuario.id}
          onClose={() => setShowSplitModal(false)}
          onCompleted={() => {
            refetchPedidos()
            mostrarNotif('Cuenta dividida con éxito', 'ok')
          }}
        />
      )}
    </>
  )
}
