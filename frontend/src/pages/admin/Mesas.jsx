import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import MesaPedidoPanel from '../../components/MesaPedidoPanel'
import { useCajaWS } from '../../hooks/useCajaWS'
import {
  GET_MESAS,
  CREAR_MESA,
  ACTUALIZAR_MESA,
  ELIMINAR_MESA,
  GET_AREAS,
  CREAR_AREA,
  ACTUALIZAR_AREA,
  ELIMINAR_AREA,
  GUARDAR_POSICIONES_MESAS
} from '../../graphql/mesas'

const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

const ESTADO_CFG = {
  libre: {
    label: 'Libre',
    color: '#22c55e',
    banda: 'from-emerald-50 via-emerald-50/70 to-emerald-100/60',
    numero: 'text-emerald-600 border-emerald-200',
    icono: 'text-emerald-300',
    dot: 'bg-emerald-500',
    pillTexto: 'text-emerald-600',
    pulso: false,
  },
  ocupada: {
    label: 'Ocupada',
    color: '#F05A8C',
    banda: 'from-rosa-niebla via-rosa-niebla/70 to-rosa-claro/60',
    numero: 'text-rosa border-rosa-claro',
    icono: 'text-rosa-claro',
    dot: 'bg-rosa',
    pillTexto: 'text-rosa',
    pulso: true,
  },
  reservada: {
    label: 'Reservada',
    color: '#eab308',
    banda: 'from-amber-50 via-amber-50/70 to-amber-100/60',
    numero: 'text-amber-600 border-amber-200',
    icono: 'text-amber-300',
    dot: 'bg-amber-500',
    pillTexto: 'text-amber-700',
    pulso: false,
  }
}

const CFG_FALLBACK = {
  label: '—',
  color: '#9ca3af',
  banda: 'from-crema via-crema/70 to-linea/60',
  numero: 'text-gris border-linea',
  icono: 'text-linea',
  dot: 'bg-gris',
  pillTexto: 'text-gris',
  pulso: false,
}

function MesaIcon() {
  return (
    <svg viewBox="0 0 100 54" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-16 h-[32px]">
      <rect x="22" y="17" width="56" height="20" rx="5"/>
      <rect x="27" y="37" width="5" height="12" rx="2.5"/>
      <rect x="68" y="37" width="5" height="12" rx="2.5"/>
      <rect x="27" y="5" width="5" height="12" rx="2.5"/>
      <rect x="68" y="5" width="5" height="12" rx="2.5"/>
    </svg>
  )
}

function QrIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <path strokeLinecap="round" d="M14 14h3M21 14v3M14 18v3M18 21h3"/>
    </svg>
  )
}

export default function Mesas() {
  const [viewMode, setViewMode] = useState('map') // 'map' or 'list'
  const [editLayoutMode, setEditLayoutMode] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState('todos')
  
  // Modals y Sidebars
  const [showMesaModal, setShowMesaModal] = useState(false)
  const [mesaEditando, setMesaEditando] = useState(null)
  const [mesaNombre, setMesaNombre] = useState('')
  const [mesaSeats, setMesaSeats] = useState(4)
  const [mesaAreaId, setMesaAreaId] = useState('')

  const [showAreaModal, setShowAreaModal] = useState(false)
  const [areaNombre, setAreaNombre] = useState('')
  const [areaEditando, setAreaEditando] = useState(null)

  const [selectedMesa, setSelectedMesa] = useState(null)
  const [mesaQR, setMesaQR] = useState(null)
  const [notif, setNotif] = useState(null)

  // Drag positions temporales
  const [positionsTemp, setPositionsTemp] = useState({})
  const canvasRef = useRef(null)

  // Queries
  const { data: dataMesas, loading: loadingMesas, refetch: refetchMesas } = useQuery(GET_MESAS, {
    pollInterval: 5000,
    fetchPolicy: 'network-only'
  })
  const { data: dataAreas, loading: loadingAreas, refetch: refetchAreas } = useQuery(GET_AREAS)

  // Refetch Queries Setup
  const refetchOpts = { refetchQueries: [{ query: GET_MESAS }] }

  // Mutations
  const [crearMesa, { loading: creandoMesa }] = useMutation(CREAR_MESA, { 
    ...refetchOpts, 
    onCompleted: (d) => { cerrarMesaModal(); mostrarNotif('Mesa creada', 'ok'); setMesaQR(d.crearMesa) } 
  })
  
  const [actualizarMesa, { loading: actualizandoMesa }] = useMutation(ACTUALIZAR_MESA, { 
    ...refetchOpts, 
    onCompleted: () => { cerrarMesaModal(); mostrarNotif('Mesa actualizada', 'ok') } 
  })
  
  const [eliminarMesa] = useMutation(ELIMINAR_MESA, { 
    ...refetchOpts, 
    onCompleted: () => { setSelectedMesa(null); mostrarNotif('Mesa eliminada', 'ok') } 
  })

  const [crearArea] = useMutation(CREAR_AREA, {
    refetchQueries: [{ query: GET_AREAS }],
    onCompleted: () => { setAreaNombre(''); mostrarNotif('Área creada', 'ok') }
  })

  const [actualizarArea] = useMutation(ACTUALIZAR_AREA, {
    refetchQueries: [{ query: GET_AREAS }],
    onCompleted: () => { setAreaNombre(''); setAreaEditando(null); mostrarNotif('Área actualizada', 'ok') }
  })

  const [eliminarArea] = useMutation(ELIMINAR_AREA, {
    refetchQueries: [{ query: GET_AREAS }, { query: GET_MESAS }],
    onCompleted: () => { mostrarNotif('Área eliminada', 'ok') }
  })

  const [guardarPosiciones, { loading: guardandoPosiciones }] = useMutation(GUARDAR_POSICIONES_MESAS, {
    ...refetchOpts,
    onCompleted: () => {
      setEditLayoutMode(false)
      mostrarNotif('Distribución del plano guardada', 'ok')
    }
  })

  // Sincronizar positionsTemp con coordenadas de la BD
  useEffect(() => {
    if (dataMesas?.mesas) {
      const posMap = {}
      dataMesas.mesas.forEach(m => {
        posMap[m.id] = { x: m.xPos, y: m.yPos }
      })
      setPositionsTemp(posMap)
    }
  }, [dataMesas])

  // Seleccionar la primera zona por defecto
  useEffect(() => {
    if (dataAreas?.areas?.length > 0 && selectedAreaId === 'todos') {
      setSelectedAreaId(dataAreas.areas[0].id)
    }
  }, [dataAreas, selectedAreaId])

  // Helpers
  const mostrarNotif = (msg, tipo) => { setNotif({ msg, tipo }); setTimeout(() => setNotif(null), 3000) }

  // WebSocket: recibir avisos cuando un cliente pide la cuenta desde su celular
  useCajaWS((msg) => {
    if (msg.tipo === 'aviso_cobrar') {
      refetchMesas()
      mostrarNotif(`🔔 ${msg.mesa} pide la cuenta`, 'ok')
    }
  })
  const abrirNuevaMesa = () => { 
    setMesaEditando(null)
    setMesaNombre('')
    setMesaSeats(4)
    setMesaAreaId(selectedAreaId !== 'todos' ? selectedAreaId : (dataAreas?.areas?.[0]?.id ?? ''))
    setShowMesaModal(true) 
  }
  const abrirEditarMesa = (m) => { 
    setMesaEditando(m)
    setMesaNombre(m.nombre)
    setMesaSeats(m.seats || 4)
    setMesaAreaId(m.area?.id ?? '')
    setShowMesaModal(true) 
  }
  const cerrarMesaModal = () => setShowMesaModal(false)

  const handleMesaSubmit = (e) => {
    e.preventDefault()
    const vars = {
      nombre: mesaNombre,
      areaId: mesaAreaId ? parseInt(mesaAreaId) : null,
      seats: parseInt(mesaSeats)
    }
    if (mesaEditando) {
      actualizarMesa({ variables: { id: parseInt(mesaEditando.id), ...vars } })
    } else {
      crearMesa({ variables: vars })
    }
  }

  const handleEliminarMesa = (m) => {
    if (confirm(`¿Eliminar "${m.nombre}"?`)) eliminarMesa({ variables: { id: parseInt(m.id) } })
  }

  const descargarQR = (mesa) => {
    const a = document.createElement('a')
    a.href = mesa.qrUrl
    a.download = `qr-${mesa.nombre.replace(/\s+/g, '-')}.png`
    a.click()
  }

  // Lógica de drag & drop
  const handleDragStart = (e, id) => {
    if (!editLayoutMode) return
    e.dataTransfer.setData('text/plain', id)
    // Efecto visual de drag
    e.currentTarget.style.opacity = '0.6'
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const w = 110
    const h = 140

    let x = e.clientX - rect.left - (w / 2)
    let y = e.clientY - rect.top - (h / 2)

    // Límites del canvas
    x = Math.max(10, Math.min(x, rect.width - w - 10))
    y = Math.max(10, Math.min(y, rect.height - h - 10))

    setPositionsTemp(prev => ({
      ...prev,
      [id]: { x: Math.round(x), y: Math.round(y) }
    }))
  }

  const handleGuardarPosiciones = () => {
    const posiciones = Object.entries(positionsTemp).map(([id, pos]) => ({
      id: parseInt(id),
      xPos: pos.x,
      yPos: pos.y,
    }))
    guardarPosiciones({ variables: { posiciones } })
  }

  // CRUD de Areas
  const handleAreaSubmit = (e) => {
    e.preventDefault()
    if (!areaNombre.trim()) return
    if (areaEditando) {
      actualizarArea({ variables: { id: parseInt(areaEditando.id), nombre: areaNombre } })
    } else {
      crearArea({ variables: { nombre: areaNombre } })
    }
  }

  const handleEliminarArea = (id) => {
    if (confirm('¿Eliminar esta zona? Las mesas de esta zona no se eliminarán pero quedarán huérfanas sin zona.')) {
      eliminarArea({ variables: { id: parseInt(id) } })
    }
  }

  // Filtrado de mesas por area activa
  const mesas = dataMesas?.mesas ?? []
  const areas = dataAreas?.areas ?? []
  const mesasFiltradas = selectedAreaId === 'todos'
    ? mesas
    : mesas.filter(m => m.area?.id === selectedAreaId)

  return (
    <AdminLayout titulo="Punto de Venta">
      {/* Toast Notificación */}
      {notif && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-semibold text-white animate-fade-up ${notif.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <span>{notif.tipo === 'ok' ? '✓' : '✕'}</span>{notif.msg}
        </div>
      )}

      {/* ── Encabezado: subtítulo + leyenda de estados ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 animate-fade-up">
        <div>
          <h2 className="font-fraunces font-bold text-tinta text-2xl leading-tight">Punto de Venta</h2>
          <p className="text-sm text-gris font-outfit mt-0.5">Selecciona una mesa para comenzar</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-outfit font-semibold text-gris">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#198754]" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc3545]" /> Ocupada
          </span>
        </div>
      </div>

      {/* ── Fila de Zonas (Pestañas) ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {areas.map(a => {
            const isActive = selectedAreaId === a.id
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAreaId(a.id)}
                className={`px-6 py-2.5 rounded-lg text-xs font-outfit font-bold uppercase transition-all whitespace-nowrap shadow-sm ${
                  isActive
                    ? 'bg-[#007bff] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {a.nombre}
              </button>
            )
          })}

          <button
            onClick={() => { setAreaNombre(''); setAreaEditando(null); setShowAreaModal(true) }}
            title="Gestionar zonas"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-linea text-gris hover:text-rosa hover:bg-rosa-niebla/40 transition-colors shadow-sm flex-shrink-0"
          >
            ⚙️
          </button>
        </div>

        {/* ── Controles de Vista & Layout ── */}
        <div className="flex items-center gap-2.5 flex-wrap md:flex-nowrap">
          <div className="flex border border-linea rounded-xl overflow-hidden shadow-sm bg-white p-0.5">
            <button
              onClick={() => { setViewMode('map'); setEditLayoutMode(false) }}
              className={`px-3.5 py-1.5 text-xs font-outfit font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-vino/10 text-vino' : 'text-gris hover:text-tinta'
              }`}
            >
              🗺️ Mapa
            </button>
            <button
              onClick={() => { setViewMode('list'); setEditLayoutMode(false) }}
              className={`px-3.5 py-1.5 text-xs font-outfit font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-vino/10 text-vino' : 'text-gris hover:text-tinta'
              }`}
            >
              📋 Lista
            </button>
          </div>

          {viewMode === 'map' && selectedAreaId !== 'todos' && (
            editLayoutMode ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditLayoutMode(false); refetchMesas() }}
                  className="px-4 py-2 bg-crema text-gris hover:text-tinta border border-linea rounded-xl text-xs font-outfit font-semibold transition-all shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarPosiciones}
                  disabled={guardandoPosiciones}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-outfit font-semibold transition-all shadow-sm flex items-center gap-1"
                >
                  {guardandoPosiciones ? 'Guardando...' : '✓ Guardar plano'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditLayoutMode(true)}
                className="px-4 py-2 bg-white hover:bg-crema border border-linea text-gris hover:text-tinta rounded-xl text-xs font-outfit font-semibold transition-all shadow-sm flex items-center gap-1.5"
              >
                📐 Editar diseño
              </button>
            )
          )}

          <button
            onClick={abrirNuevaMesa}
            className="flex items-center gap-2 bg-vino hover:bg-rosa text-white px-5 py-2.5 rounded-xl text-sm font-outfit font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap ml-auto md:ml-0"
          >
            + Nueva mesa
          </button>
        </div>
      </div>

      {/* ── Vista Canvas Mapa ── */}
      {viewMode === 'map' ? (
        selectedAreaId === 'todos' ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-linea shadow-card max-w-lg mx-auto">
            <div className="text-5xl mb-4">🗺️</div>
            <h4 className="font-fraunces font-bold text-lg text-tinta mb-1.5">Vista global del plano</h4>
            <p className="text-xs text-gris font-outfit max-w-sm mx-auto leading-relaxed px-6">
              Para usar el plano interactivo y acomodar las mesas, selecciona una zona específica (como Salón Principal o Terraza) en las pestañas superiores.
            </p>
          </div>
        ) : (
          <div className="relative">
            {editLayoutMode && (
              <div className="absolute top-4 left-4 z-10 bg-vino text-white text-[11px] px-3.5 py-1.5 rounded-full font-outfit font-semibold shadow-md border border-white/20 animate-pulse">
                📐 Modo Edición: Arrastrá las mesas para diseñar el salón.
              </div>
            )}
            
            <div 
              ref={canvasRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative w-full h-[620px] bg-[#fdfaf7] rounded-3xl overflow-hidden border border-linea/80 shadow-inner"
              style={{
                backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
              }}
            >
              {mesasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="text-4xl mb-3">🛋️</div>
                  <h5 className="font-fraunces font-bold text-tinta text-base">Salón vacío</h5>
                  <p className="text-xs text-gris font-outfit mt-1 max-w-xs leading-relaxed">
                    Aún no hay mesas asignadas a esta zona. Haz clic en "+ Nueva mesa" para agregar una.
                  </p>
                </div>
              ) : (
                mesasFiltradas.map(m => {
                  const pos = positionsTemp[m.id] || { x: m.xPos, y: m.yPos }
                  const estadoMesa = m.estado === 'ocupada' ? 'ocupada' : 'libre'
                  const w = 110
                  const h = 140

                  return (
                    <div
                      key={m.id}
                      draggable={editLayoutMode}
                      onDragStart={(e) => handleDragStart(e, m.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !editLayoutMode && setSelectedMesa(m)}
                      className={`absolute group bg-white rounded-xl border flex flex-col items-center justify-between select-none shadow-sm transition-all p-0 ${
                        editLayoutMode ? 'cursor-move hover:shadow-md' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]'
                      }`}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: `${w}px`,
                        height: `${h}px`,
                        borderColor: selectedMesa?.id === m.id && !editLayoutMode ? '#F05A8C' : '#e2e8f0',
                        borderWidth: selectedMesa?.id === m.id && !editLayoutMode ? '2.5px' : '1.5px',
                        boxShadow: selectedMesa?.id === m.id && !editLayoutMode ? '0 4px 12px rgba(240, 90, 140, 0.15)' : '',
                        transition: editLayoutMode ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      {/* Alerta de Pedir Cuenta */}
                      {m.pideCuenta && !editLayoutMode && (
                        <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-[#ffc107] text-[#343a40] font-outfit font-bold text-[9px] px-2.5 py-1 rounded-full shadow-lg border border-white animate-bounce flex items-center gap-1 z-10 whitespace-nowrap">
                          <span>🧾</span> Pide cuenta
                        </div>
                      )}

                      {/* Botón de eliminar mesa (Solo en modo edición) */}
                      {editLayoutMode && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEliminarMesa(m); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-sm text-xs leading-none z-10"
                        >
                          ×
                        </button>
                      )}

                      {/* Nombre de la mesa */}
                      <div className="w-full text-center py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                        <span className="text-[10px] font-outfit font-bold text-slate-800 uppercase tracking-wider">
                          {m.nombre}
                        </span>
                      </div>

                      {/* Icono de pantalla en el centro */}
                      <div className="flex-1 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors py-2">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="13" rx="2" />
                          <line x1="12" y1="16" x2="12" y2="20" />
                          <line x1="8" y1="20" x2="16" y2="20" />
                        </svg>
                      </div>

                      {/* Pill de estado al fondo */}
                      <div className="w-full flex justify-center pb-2.5">
                        <span className={`w-[85%] text-center py-1 rounded-md text-[9px] font-outfit font-bold tracking-wider uppercase shadow-sm text-white ${
                          estadoMesa === 'ocupada' ? 'bg-[#dc3545]' : 'bg-[#198754]'
                        }`}>
                          {estadoMesa === 'ocupada' ? 'OCUPADA' : 'LIBRE'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      ) : (
        /* ── Vista Lista Clásica ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {mesasFiltradas.map((mesa, i) => {
            const estadoMesa = mesa.estado === 'ocupada' ? 'ocupada' : 'libre'
            const cfg = ESTADO_CFG[estadoMesa]
            const num = mesa.nombre.replace(/\D/g, '') || mesa.nombre[0]?.toUpperCase() || '?'
            return (
              <div
                key={mesa.id}
                onClick={() => setSelectedMesa(mesa)}
                className="group bg-white rounded-[18px] shadow-card border border-linea overflow-hidden card-hover cursor-pointer animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                {/* Banda de estado */}
                <div className={`relative flex flex-col items-center pt-4 pb-2.5 px-3 bg-gradient-to-br ${cfg.banda} overflow-hidden`}>
                  <span className="absolute -top-8 -right-6 w-24 h-24 rounded-full bg-white/40" />
                  <span className="absolute -bottom-6 -left-5 w-20 h-20 rounded-full bg-white/30" />

                  {/* Alerta de Pedir Cuenta */}
                  {mesa.pideCuenta && (
                    <span className="absolute top-2.5 left-2.5 bg-[#ffc107] text-[#343a40] text-[9px] px-2.5 py-0.5 rounded-full font-outfit font-bold shadow-sm border border-white/60 animate-pulse uppercase tracking-wide z-10 flex items-center gap-0.5">
                      <span>🧾</span> Cuenta
                    </span>
                  )}

                  {/* Pill de estado */}
                  <span className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 bg-white/85 backdrop-blur-sm text-[10px] px-2 py-0.5 rounded-full font-outfit font-bold shadow-sm border border-white/60 uppercase tracking-wide ${cfg.pillTexto}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.pulso ? 'animate-latir' : ''}`} />
                    {cfg.label}
                  </span>

                  {/* Número */}
                  <div className={`relative w-12 h-12 rounded-2xl bg-white shadow-md border flex items-center justify-center font-fraunces font-bold text-lg mb-1.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3 ${cfg.numero}`}>
                    {num}
                  </div>

                  {/* Ícono de mesa */}
                  <div className={`relative ${cfg.icono}`}>
                    <MesaIcon />
                  </div>
                </div>

                {/* Pie de tarjeta */}
                <div className="px-3 pt-3 pb-3">
                  <p className="text-center font-fraunces font-semibold text-tinta text-[14px] leading-tight truncate" title={mesa.nombre}>
                    {mesa.nombre}
                  </p>
                  <p className="text-center text-[10px] text-gris font-outfit mt-0.5">{mesa.seats || 4} asientos · {mesa.area?.nombre ?? 'Sin Zona'}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── PANEL LATERAL (SIDEBAR DETALLE MESA) ── */}
      {selectedMesa && (
        <MesaPedidoPanel
          mesa={selectedMesa}
          mesas={mesas}
          onClose={() => setSelectedMesa(null)}
          headerActions={
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setMesaQR(selectedMesa)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rosa-niebla/70 text-rosa hover:bg-rosa hover:text-white rounded-xl text-xs font-outfit font-semibold transition-all border border-rosa-claro/30"
                >
                  <QrIcon className="w-4 h-4" /> QR
                </button>
                <button
                  onClick={() => descargarQR(selectedMesa)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white text-gris hover:text-tinta border border-linea rounded-xl text-xs font-outfit font-semibold transition-all"
                >
                  Descargar QR
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => abrirEditarMesa(selectedMesa)}
                  title="Editar mesa"
                  className="w-9 h-9 flex items-center justify-center bg-white border border-linea text-gris hover:text-tinta hover:bg-crema rounded-xl transition-all"
                >
                  📝
                </button>
                <button
                  onClick={() => handleEliminarMesa(selectedMesa)}
                  title="Eliminar mesa"
                  className="w-9 h-9 flex items-center justify-center bg-white border border-linea text-gris hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                >
                  🗑️
                </button>
              </div>
            </>
          }
        />
      )}

      {/* ── Modal QR grande ── */}
      {mesaQR && (
        <div className="fixed inset-0 bg-tinta/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setMesaQR(null)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden text-center animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="relative bg-gradient-to-br from-rosa-niebla via-rosa-niebla/70 to-rosa-claro/50 px-8 pt-8 pb-6 overflow-hidden">
              <span className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/40" />
              <span className="absolute -bottom-8 -left-6 w-24 h-24 rounded-full bg-white/30" />
              <h3 className="relative font-fraunces font-bold text-tinta text-2xl">{mesaQR.nombre}</h3>
              <p className="relative text-xs text-tinta/60 font-outfit mt-1 uppercase tracking-widest font-bold">Casa Rosa · Pedido en mesa</p>
            </div>

            <div className="px-8 pt-6 pb-8">
              {mesaQR.qrUrl ? (
                <div className="inline-block bg-gradient-to-br from-rosa-niebla to-rosa-claro/40 p-4 rounded-3xl">
                  <img src={mesaQR.qrUrl} alt="QR" className="w-52 h-52 rounded-2xl bg-white shadow-md" />
                </div>
              ) : (
                <div className="w-56 h-56 mx-auto bg-crema rounded-2xl flex items-center justify-center text-gris font-outfit">Sin QR</div>
              )}
              <p className="text-xs text-gris font-outfit mt-4">El cliente escanea este código para ver el menú y ordenar</p>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setMesaQR(null)} className="flex-1 py-2.5 border border-linea rounded-xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors">Cerrar</button>
                {mesaQR.qrUrl && (
                  <button onClick={() => descargarQR(mesaQR)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-vino hover:bg-rosa text-white rounded-xl font-outfit font-semibold text-sm transition-all shadow-sm hover:shadow-md">
                    Descargar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear/Editar Mesa ── */}
      {showMesaModal && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-sm overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
              <h3 className="font-fraunces font-bold text-tinta text-base">{mesaEditando ? 'Editar mesa' : 'Nueva mesa'}</h3>
              <button onClick={cerrarMesaModal} className="w-8 h-8 flex items-center justify-center rounded-xl text-gris hover:text-tinta hover:bg-linea transition-all text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleMesaSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Nombre</label>
                <input type="text" required autoFocus value={mesaNombre} onChange={e => setMesaNombre(e.target.value)} className={inputCls} placeholder="Ej: Mesa 1, Barra..." />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Asientos</label>
                  <input type="number" required min="1" max="15" value={mesaSeats} onChange={e => setMesaSeats(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Zona / Salón</label>
                  <select value={mesaAreaId} onChange={e => setMesaAreaId(e.target.value)} className={inputCls}>
                    <option value="">Ninguno</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>

              {!mesaEditando && (
                <div className="flex items-start gap-3 bg-rosa-niebla/50 px-4 py-3 rounded-xl border border-rosa-claro/40">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white text-rosa shadow-sm">
                    <QrIcon className="w-4 h-4" />
                  </span>
                  <p className="text-xs text-tinta/80 font-outfit leading-snug pt-1">
                    Se generará automáticamente el <span className="font-semibold text-rosa">código QR único</span> para esta mesa.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarMesaModal} className="flex-1 py-2.5 border border-linea rounded-xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={creandoMesa || actualizandoMesa} className="flex-1 py-2.5 bg-vino hover:bg-rosa disabled:bg-gris text-white rounded-xl font-outfit font-semibold text-sm transition-all shadow-sm hover:shadow-md">
                  {creandoMesa || actualizandoMesa ? 'Guardando...' : mesaEditando ? 'Guardar' : 'Crear mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Gestionar Zonas (Areas) ── */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
              <h3 className="font-fraunces font-bold text-tinta text-base">Gestionar Zonas / Salones</h3>
              <button onClick={() => setShowAreaModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-gris hover:text-tinta hover:bg-linea transition-all text-xl leading-none">×</button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Formulario rápido */}
              <form onSubmit={handleAreaSubmit} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">
                    {areaEditando ? 'Editar nombre de zona' : 'Nueva Zona'}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={areaNombre} 
                    onChange={e => setAreaNombre(e.target.value)} 
                    placeholder="Ej. Terraza, Segundo Piso..." 
                    className={inputCls} 
                  />
                </div>
                <button
                  type="submit"
                  className="bg-vino hover:bg-rosa text-white font-outfit font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                >
                  {areaEditando ? '✓' : '+'}
                </button>
                {areaEditando && (
                  <button
                    type="button"
                    onClick={() => { setAreaEditando(null); setAreaNombre('') }}
                    className="border border-linea hover:bg-crema text-gris font-outfit font-semibold px-3 py-2.5 rounded-xl text-sm"
                  >
                    ×
                  </button>
                )}
              </form>

              {/* Lista de zonas */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                <span className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider">Zonas existentes</span>
                {areas.length === 0 ? (
                  <p className="text-xs text-gris font-outfit italic py-4">No hay zonas creadas.</p>
                ) : (
                  areas.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-3 bg-crema/40 rounded-xl border border-linea/60 text-sm font-outfit">
                      <span className="font-semibold text-tinta">{a.nombre}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setAreaEditando(a); setAreaNombre(a.nombre) }}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-linea hover:border-gris rounded-lg text-xs"
                          title="Renombrar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleEliminarArea(a.id)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-linea hover:bg-red-50 hover:text-red-500 rounded-lg text-xs"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
