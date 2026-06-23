import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { useNavigate } from 'react-router-dom'
import { GET_PEDIDOS_COCINA, ACTUALIZAR_ESTADO_COCINA } from '../../graphql/cocina'
import { useCocinaWS } from '../../hooks/useCocinaWS'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../layouts/AdminLayout'

function minutosDesde(fechaStr) {
  return Math.floor((Date.now() - new Date(fechaStr)) / 60000)
}

function labelTiempo(mins) {
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

// ─── Sonido sintetizado de campana de café premium (Web Audio API) ───
function reproducirSonidoCampana() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Función para reproducir una nota cristalina y pura (ondas senoidales sin distorsión)
    const tocarNota = (time, freq, volume) => {
      // Parciales armónicos suaves para un timbre brillante, cálido y elegante
      const partials = [
        { freq: freq, gain: 0.35, decay: 1.2 },
        { freq: freq * 1.5, gain: 0.15, decay: 0.8 },
        { freq: freq * 2.0, gain: 0.1, decay: 0.5 },
      ]

      partials.forEach(p => {
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()

        osc.type = 'sine' // Onda senoidal pura
        osc.frequency.setValueAtTime(p.freq, time)

        gainNode.gain.setValueAtTime(0, time)
        gainNode.gain.linearRampToValueAtTime(p.gain * volume, time + 0.005) // Ataque suave de campana
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + p.decay) // Caída resonante y fina

        osc.connect(gainNode)
        gainNode.connect(ctx.destination)

        osc.start(time)
        osc.stop(time + p.decay)
      })
    }

    // Un hermoso y distinguido "Ding-Ding" de cafetería gourmet
    tocarNota(now, 880.00, 1.0)          // Primer Ding (La 5)
    tocarNota(now + 0.14, 1046.50, 0.8)  // Segundo Ding más agudo (Do 6)

  } catch (e) {
    console.warn('AudioContext no soportado o bloqueado por el navegador', e)
  }
}

function PedidoCard({ pedido, ahora, onAccion, onDismiss, cargando }) {
  const mins = Math.floor((ahora - new Date(pedido.creadoEn)) / 60000)
  const urgente = mins >= 15
  const estado = pedido.estado

  const enPrep = estado === 'en_preparacion' || estado === 'en_cocina'
  const listo = estado === 'listo'
  const entregado = estado === 'entregado'

  let cardClass = 'bg-white border-linea/80 shadow-sm'
  let accentBar = 'bg-orange-400'
  let statusText = 'Pendiente'
  let statusClass = 'bg-orange-50 text-orange-600 border-orange-100'

  if (enPrep) {
    cardClass = 'bg-white border-linea/80 shadow-sm'
    accentBar = 'bg-blue-400'
    statusText = 'En preparación'
    statusClass = 'bg-blue-50 text-blue-600 border-blue-100'
  } else if (listo || entregado) {
    cardClass = 'bg-white border-linea/80 shadow-sm'
    accentBar = 'bg-emerald-500'
    statusText = 'Listo'
    statusClass = 'bg-emerald-50 text-emerald-600 border-emerald-100'
  }

  const alertaUrgente = urgente && !listo && !entregado

  return (
    <div className={`rounded-2xl flex flex-col overflow-hidden border transition-all animate-fade-up ${cardClass} ${alertaUrgente ? 'ring-2 ring-red-500/50' : ''}`}>
      {/* Barra de estado */}
      <div className={`h-1.5 flex-shrink-0 ${accentBar}`} />

      {/* Cabecera */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-2 border-b border-linea/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-fraunces font-bold text-tinta text-lg leading-tight truncate">
              {pedido.nombreMesa ?? (pedido.origen === 'online' ? 'Online' : '—')}
            </p>
            {pedido.origen === 'online' && (
              <span className="flex-shrink-0 text-[9px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded-full font-outfit font-bold uppercase tracking-wider">
                En línea
              </span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-outfit font-semibold border ${
            urgente
              ? 'bg-red-50 text-red-500 border-red-100 animate-pulse'
              : 'bg-slate-50 text-gris border-linea'
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 7v5l3 2"/></svg>
            {urgente && '⚠ '}hace {labelTiempo(mins)}
          </span>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-outfit font-bold border uppercase tracking-wide ${statusClass}`}>
          {statusText}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 py-3.5 flex-1 space-y-2.5 bg-white">
        {pedido.detalles.map(d => (
          <div key={d.id}>
            <div className="flex gap-2.5 items-start">
              <span className="flex-shrink-0 min-w-[32px] text-center bg-rosa-niebla text-rosa border border-rosa-claro/20 rounded-lg px-1.5 py-0.5 text-xs font-outfit font-bold leading-normal">
                {d.cantidad}×
              </span>
              <span className="text-tinta text-[14px] font-outfit font-medium leading-normal pt-0.5">{d.nombreItem}</span>
            </div>
            {d.nota && (
              <p className="ml-[42px] mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200/40 rounded-xl px-2.5 py-1.5 font-outfit leading-normal">
                📝 {d.nota}
              </p>
            )}
          </div>
        ))}
        {(() => {
          if (!pedido.notaGeneral) return null
          try {
            const info = JSON.parse(pedido.notaGeneral)
            return (
              <div className="mt-3 bg-crema/60 border border-linea rounded-xl p-3 text-[11px] space-y-1 font-outfit text-left">
                <p className="font-bold text-tinta border-b border-linea/60 pb-1 mb-1">
                  📋 Datos del Cliente
                </p>
                {info.nombre && (
                  <p><span className="text-gris font-medium">Cliente:</span> <strong className="text-tinta font-semibold">{info.nombre}</strong></p>
                )}
                {info.telefono && (
                  <p><span className="text-gris font-medium">Teléfono:</span> <span className="text-tinta font-semibold">{info.telefono}</span></p>
                )}
                {info.direccion && (
                  <p className="flex flex-col gap-0.5">
                    <span className="text-gris font-medium">Dirección:</span>
                    {info.direccion.startsWith('http') ? (
                      <a href={info.direccion} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-0.5 mt-0.5">
                        📍 Ver en Google Maps
                      </a>
                    ) : (
                      <span className="text-tinta font-semibold">{info.direccion}</span>
                    )}
                  </p>
                )}
                {info.nota && (
                  <p className="bg-amber-50/60 border border-amber-200/40 rounded-lg p-2 mt-1.5 text-amber-900">
                    <span className="font-bold text-amber-800 block mb-0.5">📝 Nota:</span>
                    <span className="font-medium">{info.nota}</span>
                  </p>
                )}
              </div>
            )
          } catch (e) {
            return (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/40 rounded-xl px-2.5 py-1.5 font-outfit leading-normal !mt-3 text-left">
                📝 Nota: {pedido.notaGeneral}
              </p>
            )
          }
        })()}
      </div>

      {/* Botón de acción */}
      <div className="px-4 pb-4 pt-2.5 border-t border-linea/60 bg-slate-50/30">
        {listo || entregado ? (
          <button
            onClick={() => onDismiss(pedido.id)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-outfit font-bold py-3 rounded-xl text-[14px] transition active:scale-[0.98] flex items-center justify-center gap-2 border border-slate-200/60"
          >
            ✓ Entendido / Quitar
          </button>
        ) : enPrep ? (
          <button
            onClick={() => onAccion(pedido.id, 'entregado')}
            disabled={cargando}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white font-outfit font-bold py-3 rounded-xl text-[14px] transition active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
          >
            {cargando ? '...' : '✓ Marcar listo'}
          </button>
        ) : (
          <button
            onClick={() => onAccion(pedido.id, pedido.origen === 'online' ? 'en_cocina' : 'en_preparacion')}
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-outfit font-bold py-3 rounded-xl text-[14px] transition active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
          >
            {cargando ? '...' : '🍳 Iniciar preparación'}
          </button>
        )}
        <p className="text-[9px] text-gris text-center mt-2 font-outfit tracking-wider">PEDIDO #{pedido.numeroPedido || pedido.id}</p>
      </div>
    </div>
  )
}

function SeccionHeader({ color, dot, label, count, pulso }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot} ${pulso ? 'animate-pulse' : ''}`} />
      <h2 className={`text-xs font-outfit font-semibold uppercase tracking-[0.2em] ${color}`}>{label}</h2>
      <span className={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full bg-white border border-linea/85 shadow-sm ${color}`}>
        {count}
      </span>
      <div className="flex-1 h-px bg-linea/80" />
    </div>
  )
}

export default function KDS() {
  const { usuario, loading: loadingAuth } = useAuth()
  const navigate = useNavigate()
  const [ahora, setAhora] = useState(Date.now())
  const [notif, setNotif] = useState(null)
  const [cargandoId, setCargandoId] = useState(null)
  const notifTimer = useRef(null)

  // Descartados locales
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('kds_dismissed_pedidos')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  const { data, loading, refetch } = useQuery(GET_PEDIDOS_COCINA, {
    fetchPolicy: 'network-only',
    pollInterval: 8000,
  })

  const [actualizarEstado] = useMutation(ACTUALIZAR_ESTADO_COCINA, {
    onCompleted: () => {
      setCargandoId(null)
      refetch()
    },
    onError: () => setCargandoId(null),
  })

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!loadingAuth && !usuario) navigate('/login')
  }, [loadingAuth, usuario, navigate])

  // Desbloquea pedidos descartados localmente si vuelven a estar activos en cocina (nuevas rondas)
  useEffect(() => {
    const pedidosArr = data?.pedidosCocina ?? []
    if (pedidosArr.length > 0) {
      const activos = pedidosArr.filter(p => p.estado === 'abierto' || p.estado === 'en_preparacion' || p.estado === 'pago_confirmado' || p.estado === 'en_cocina')
      const activosIds = activos.map(p => parseInt(p.id))
      const nuevosDismissed = dismissedIds.filter(id => !activosIds.includes(id))
      if (nuevosDismissed.length !== dismissedIds.length) {
        setDismissedIds(nuevosDismissed)
        try {
          localStorage.setItem('kds_dismissed_pedidos', JSON.stringify(nuevosDismissed))
        } catch (e) {}
      }
    }
  }, [data?.pedidosCocina, dismissedIds])

  const wsConectado = useCocinaWS((msg) => {
    if (msg.tipo === 'pedido_nuevo') {
      refetch()
      reproducirSonidoCampana()
      clearTimeout(notifTimer.current)
      setNotif(msg.mesa ?? 'Nueva mesa')
      notifTimer.current = setTimeout(() => setNotif(null), 4000)
    } else if (msg.tipo === 'pedido_actualizado' || msg.tipo === 'pedido_listo' || msg.tipo === 'pedido_estado') {
      refetch()
    }
  })

  const handleAccion = (pedidoId, nuevoEstado) => {
    setCargandoId(pedidoId)
    actualizarEstado({ variables: { pedidoId: parseInt(pedidoId), estado: nuevoEstado } })
  }

  const handleDismiss = (pedidoId) => {
    const next = [...dismissedIds, parseInt(pedidoId)]
    setDismissedIds(next)
    try {
      localStorage.setItem('kds_dismissed_pedidos', JSON.stringify(next))
    } catch (e) {}
  }

  if (loadingAuth) return null

  const pedidos = data?.pedidosCocina ?? []
  const visiblePedidos = pedidos.filter(p => !dismissedIds.includes(parseInt(p.id)))

  const pendientes  = visiblePedidos.filter(p => p.estado === 'abierto' || p.estado === 'pago_confirmado')
  const enPrep      = visiblePedidos.filter(p => p.estado === 'en_preparacion' || p.estado === 'en_cocina')
  const listos      = visiblePedidos.filter(p => p.estado === 'listo' || p.estado === 'entregado')

  return (
    <AdminLayout
      titulo="Cocina"
      headerExtra={
        <div className="flex items-center gap-4 text-xs font-outfit">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-linea shadow-sm text-tinta font-semibold">
            <span className={`w-2 h-2 rounded-full ${wsConectado ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className={wsConectado ? 'text-emerald-600' : 'text-gris'}>
              {wsConectado ? 'Conexión En Vivo' : 'Conectando...'}
            </span>
          </div>
        </div>
      }
    >
      {/* Toast pedido nuevo */}
      {notif && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-pink-600 text-white px-6 py-3.5 rounded-2xl shadow-xl text-[14px] font-outfit font-bold flex items-center gap-2.5 animate-bounce ring-4 ring-pink-500/25">
          <span className="text-lg">🔔</span>
          <span>Nuevo pedido — {notif}</span>
        </div>
      )}

      {/* Cargando */}
      {loading && visiblePedidos.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-linea overflow-hidden animate-pulse">
              <div className="h-1 bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-100 rounded-full w-1/2" />
                <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                <div className="h-3 bg-slate-100 rounded-full w-3/4 !mt-5" />
                <div className="h-3 bg-slate-100 rounded-full w-2/3" />
                <div className="h-11 bg-slate-100 rounded-xl !mt-5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sin pedidos */}
      {!loading && visiblePedidos.length === 0 && (
        <div className="text-center py-20 select-none animate-fade-up bg-white border border-linea rounded-[22px] shadow-sm max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-pink-50 border border-pink-100 flex items-center justify-center text-4xl">
            ☕
          </div>
          <p className="text-tinta text-lg font-fraunces font-bold">Sin pedidos activos</p>
          <p className="text-gris text-xs mt-1 font-outfit">Los pedidos aparecerán aquí en tiempo real</p>
          <div className="inline-flex items-center gap-1.5 mt-5 text-[10px] text-emerald-600 font-outfit font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Escuchando nuevos pedidos
          </div>
        </div>
      )}

      {/* Pendientes de iniciar */}
      {pendientes.length > 0 && (
        <section className="mb-8">
          <SeccionHeader color="text-orange-600" dot="bg-orange-500" label="Pendientes" count={pendientes.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pendientes.map(p => (
              <PedidoCard
                key={p.id}
                pedido={p}
                ahora={ahora}
                onAccion={handleAccion}
                onDismiss={handleDismiss}
                cargando={cargandoId === p.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* En preparación */}
      {enPrep.length > 0 && (
        <section className="mb-8">
          <SeccionHeader color="text-blue-600" dot="bg-blue-500" label="En preparación" count={enPrep.length} pulso />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {enPrep.map(p => (
              <PedidoCard
                key={p.id}
                pedido={p}
                ahora={ahora}
                onAccion={handleAccion}
                onDismiss={handleDismiss}
                cargando={cargandoId === p.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Listos */}
      {listos.length > 0 && (
        <section>
          <SeccionHeader color="text-emerald-600" dot="bg-emerald-500" label="Listos" count={listos.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listos.map(p => (
              <PedidoCard
                key={p.id}
                pedido={p}
                ahora={ahora}
                onAccion={handleAccion}
                onDismiss={handleDismiss}
                cargando={cargandoId === p.id}
              />
            ))}
          </div>
        </section>
      )}
    </AdminLayout>
  )
}
