import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { GET_DASHBOARD } from '../../graphql/dashboard'

const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`

function tiempoDesde(fechaStr) {
  const mins = Math.floor((Date.now() - new Date(fechaStr)) / 60000)
  if (mins < 1) return 'ahora'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

/* ─── Íconos SVG Personalizados ─── */
const DashboardIcon = ({ name, className = "w-[21px] h-[21px] flex-shrink-0" }) => {
  const paths = {
    ventas: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M6 9h.01M18 15h.01" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
        <path d="M6 6h12M6 10h12M6 14h8" />
      </>
    ),
    pedidos: (
      <>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
    ocupacion: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </>
    ),
    reloj: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    top: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
    caja: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9v6M9 12h6" />
      </>
    ),
    chef: (
      <>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </>
    ),
    producto: (
      <>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1" />
      </>
    ),
    grafico: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M3 20h18" />
      </>
    ),
    flechaDerecha: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
    sol: (
      <>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </>
    ),
    luna: (
      <>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </>
    ),
    tarde: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name] || null}
    </svg>
  )
}

function StatCard({ label, valor, sub, iconName, bgClass, delay = '' }) {
  return (
    <div className={`rounded-2xl p-6 text-white shadow-md flex flex-col justify-between h-[145px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden ${bgClass} ${delay}`}>
      {/* Círculo decorativo translúcido */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-outfit font-extrabold uppercase tracking-wider opacity-90">{label}</p>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
            <DashboardIcon name={iconName} className="w-[18px] h-[18px]" />
          </div>
        </div>
        <p className="font-outfit text-3xl font-black tracking-tight leading-none">{valor}</p>
      </div>
      {sub && <p className="text-xs font-outfit font-medium opacity-85 mt-2 truncate">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const { data, loading } = useQuery(GET_DASHBOARD, {
    fetchPolicy: 'network-only',
    pollInterval: 30000,
  })

  const mesas         = data?.mesas ?? []
  const productos     = data?.productos ?? []
  const pedidosCocina = data?.pedidosCocina ?? []
  const caja          = data?.cajaHoy ?? null
  const statsHoy      = data?.statsHoy ?? null
  const pedidosHoy    = statsHoy?.pedidosHoy ?? 0
  const topProductos  = statsHoy?.topProductos ?? []

  const mesasOcupadas = mesas.filter(m => m.estado === 'ocupada').length
  const mesasReservadas = mesas.filter(m => m.estado === 'reservada').length
  const mesasLibres   = mesas.length - mesasOcupadas - mesasReservadas
  const ventasBruto   = Number(caja?.ventasEfectivo ?? 0) + Number(caja?.ventasQr ?? 0)
  const ventasNeto    = ventasBruto - Number(caja?.totalGastos ?? 0)

  // Distribución de cobro de hoy
  const pctEfectivo = caja && (caja.ventasEfectivo > 0 || caja.ventasQr > 0)
    ? Math.round((caja.ventasEfectivo / (caja.ventasEfectivo + caja.ventasQr)) * 100)
    : 0
  const pctQr = caja && (caja.ventasEfectivo > 0 || caja.ventasQr > 0)
    ? 100 - pctEfectivo
    : 0

  // Saludo adaptativo
  const hrs = new Date().getHours()
  let saludo = "Buenos días"
  let saludoIcon = "sol"
  let saludoColor = "text-orange-400"
  if (hrs >= 12 && hrs < 19) {
    saludo = "Buenas tardes"
    saludoIcon = "tarde"
    saludoColor = "text-amber-500"
  } else if (hrs >= 19 || hrs < 6) {
    saludo = "Buenas noches"
    saludoIcon = "luna"
    saludoColor = "text-indigo-400"
  }

  const fecha = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const tienePermiso = (cod) =>
    usuario?.isSuperuser || usuario?.permisos?.includes(cod)

  const mesasOcupadasList = mesas.filter(m => m.estado === 'ocupada')

  // Obtener límites para el mapa
  const xCoordinates = mesas.map(m => m.xPos).filter(x => x !== null && x !== undefined)
  const yCoordinates = mesas.map(m => m.yPos).filter(y => y !== null && y !== undefined)
  const maxX = xCoordinates.length > 0 ? Math.max(...xCoordinates, 100) : 100
  const maxY = yCoordinates.length > 0 ? Math.max(...yCoordinates, 100) : 100

  // Datos para el gráfico de líneas (Horas Pico)
  const hourlyData = statsHoy?.pedidosPorHora ?? []
  const activeHours = hourlyData.filter(d => d.hora >= 8 && d.hora <= 22)
  const maxQty = Math.max(...activeHours.map(d => d.cantidad), 1)

  const graphWidth = 540
  const graphHeight = 135
  const paddingX = 40
  const paddingY = 25
  const canvasWidth = graphWidth - paddingX * 2
  const canvasHeight = graphHeight - paddingY * 2

  // Generar puntos del gráfico
  const graphPoints = activeHours.map((d, index) => {
    const x = paddingX + (index * (canvasWidth / (activeHours.length - 1)))
    const y = graphHeight - paddingY - (d.cantidad / maxQty) * canvasHeight
    return { x, y, qty: d.cantidad, hora: d.hora }
  })

  // Generar strings de paths SVG
  const linePath = graphPoints.reduce((acc, p, i) => {
    return acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `
  }, '')

  const areaPath = graphPoints.length > 0
    ? `${linePath} L ${graphPoints[graphPoints.length - 1].x} ${graphHeight - paddingY} L ${graphPoints[0].x} ${graphHeight - paddingY} Z`
    : ''

  return (
    <AdminLayout titulo="Dashboard">

      {/* ── Header personalizado ── */}
      <div className="mb-8 flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-gris text-sm font-outfit capitalize mb-1">{fecha}</p>
          <h3 className="font-fraunces text-2xl font-semibold text-tinta flex items-center gap-2.5">
            {saludo},{' '}
            <em className="text-rosa not-italic">{usuario?.username}</em>
            <DashboardIcon name={saludoIcon} className={`w-6 h-6 ${saludoColor}`} />
          </h3>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Ventas hoy"
          valor={loading ? '—' : (caja ? bs(statsHoy?.ventasTotales) : 'Sin caja')}
          sub={caja
            ? `Efectivo ${bs(caja.ventasEfectivo)} · QR ${bs(caja.ventasQr)}`
            : 'Abrí la caja para registrar'}
          iconName="ventas"
          bgClass="bg-[#1E8E52]"
          delay="card-1"
        />
        <StatCard
          label="Pedidos pendientes"
          valor={loading ? '—' : (statsHoy?.pedidosPendientes ?? 0)}
          sub="En preparación / en espera"
          iconName="chef"
          bgClass="bg-[#BD2C58]"
          delay="card-2"
        />
        <StatCard
          label="Pedidos hoy"
          valor={loading ? '—' : (pedidosHoy ?? '—')}
          sub="Total de órdenes del día"
          iconName="pedidos"
          bgClass="bg-[#7C3AED]"
          delay="card-3"
        />
      </div>

      {/* ── Sección Gráficos en Tiempo Real ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Gráfico 1: Ocupación de Mesas (Mini plano interactivo) */}
        <div className="bg-white rounded-[18px] border border-linea p-5 shadow-card flex flex-col justify-between col-span-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-4 rounded-full bg-rosa" />
              <h4 className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-widest">
                Ocupación del Salón
              </h4>
            </div>
            
            <div className="flex items-center gap-4 py-1">
              {/* Circular progress wheel */}
              <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="30" stroke="#F3F3F2" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="url(#roseGrad)"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={188.5}
                    strokeDashoffset={188.5 - (188.5 * Math.min(Math.round(statsHoy?.ocupacionMesasPorcentaje ?? 0), 100)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-outfit">
                  <span className="text-base font-black text-tinta leading-none">{Math.round(statsHoy?.ocupacionMesasPorcentaje ?? 0)}%</span>
                  <span className="text-[7px] text-gris uppercase tracking-wider font-bold mt-0.5">Ocupado</span>
                </div>
              </div>

              {/* Status details */}
              <div className="flex-1 space-y-1.5 text-xs font-outfit">
                <div className="flex justify-between items-center">
                  <span className="text-gris flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rosa" />
                    Ocupadas
                  </span>
                  <span className="font-bold text-tinta">{mesasOcupadas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gris flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Libres
                  </span>
                  <span className="font-bold text-tinta">{mesasLibres}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gris flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Capacidad
                  </span>
                  <span className="font-bold text-tinta">{mesas.length} mesas</span>
                </div>
              </div>
            </div>

            {/* Mini Plano Layout de las mesas */}
            <div className="relative w-full h-[140px] bg-[#FAF8F5] rounded-xl border border-linea/60 overflow-hidden shadow-inner mt-3"
                 style={{
                   backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
                   backgroundSize: '16px 16px',
                 }}>
              {mesas.map(m => {
                const left = maxX > 0 ? (m.xPos / maxX) * 78 + 6 : 10;
                const top = maxY > 0 ? (m.yPos / maxY) * 65 + 8 : 10;
                const estadoColor = m.estado === 'ocupada' 
                  ? 'bg-gradient-to-br from-rosa to-rosa-vivo text-white border-rosa-claro shadow-[0_2px_6px_rgba(240,90,140,0.25)] animate-pulse' 
                  : m.estado === 'reservada'
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white border-amber-300'
                    : 'bg-white text-gris border-linea hover:border-gris-obscuro';
                return (
                  <div 
                    key={m.id}
                    className={`absolute w-6.5 h-6.5 rounded-lg flex items-center justify-center font-outfit font-black text-[9px] border shadow-sm transition-all duration-300 ${estadoColor}`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    title={`${m.nombre} (${m.estado})`}
                  >
                    {m.nombre.match(/\d+/) ? m.nombre.match(/\d+/)[0] : m.nombre.slice(0, 2)}
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="border-t border-linea/60 pt-3 mt-3">
            <p className="text-[9px] text-gris font-outfit font-bold uppercase tracking-wider mb-2">Lista de Ocupadas</p>
            {mesasOcupadasList.length === 0 ? (
              <p className="text-xs text-gris italic font-outfit">Todo el salón disponible ahora</p>
            ) : (
              <div className="flex flex-wrap gap-1 max-h-[36px] overflow-y-auto pr-1">
                {mesasOcupadasList.map(m => (
                  <span key={m.id} className="text-[9px] bg-rosa-niebla border border-rosa/20 text-rosa px-2.5 py-0.5 rounded-full font-bold font-outfit">
                    {m.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Distribución de Medios de Pago */}
        <div className="bg-white rounded-[18px] border border-linea p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-4 rounded-full bg-rosa" />
              <h4 className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-widest">
                Distribución de Cobros hoy
              </h4>
            </div>

            {loading ? (
              <div className="h-32 flex items-center justify-center text-gris text-xs font-outfit">Cargando distribución...</div>
            ) : !caja || (Number(caja.ventasEfectivo) === 0 && Number(caja.ventasQr) === 0) ? (
              <div className="h-32 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-lg bg-crema flex items-center justify-center mb-2">
                  <DashboardIcon name="ventas" className="w-4 h-4 text-gris" />
                </div>
                <p className="text-gris text-xs font-outfit italic">Sin ventas cobradas hoy aún</p>
              </div>
            ) : (
              <div className="py-1">
                {/* Total Recaudado at the Top */}
                <div className="flex justify-between items-baseline mb-3">
                  <p className="text-2xl font-fraunces font-black text-tinta">{bs(ventasBruto)}</p>
                  <p className="text-[9px] font-outfit font-bold text-gris uppercase tracking-wider">Total Recaudado</p>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="flex h-5 rounded-full overflow-hidden mb-4 bg-linea/40 shadow-inner p-1 border border-linea/10">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 rounded-l-full relative group" 
                    style={{ width: `${pctEfectivo}%` }} 
                  />
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 rounded-r-full relative group" 
                    style={{ width: `${pctQr}%` }} 
                  />
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-2 gap-2 font-outfit">
                  <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">Efectivo</p>
                      <p className="text-base font-fraunces font-black text-emerald-800 mt-0.5">{bs(caja.ventasEfectivo)}</p>
                    </div>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5">{pctEfectivo}% de cobros</p>
                  </div>
                  <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-extrabold text-blue-700 uppercase tracking-wider">Pago por QR</p>
                      <p className="text-base font-fraunces font-black text-blue-800 mt-0.5">{bs(caja.ventasQr)}</p>
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold mt-1.5">{pctQr}% de cobros</p>
                  </div>
                </div>
              </div>
            )}
          </div>          
        </div>

        {/* Gráfico 3: Top Productos Hoy */}
        <div className="bg-white rounded-[18px] border border-linea p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-4 rounded-full bg-rosa" />
              <h4 className="text-[12px] font-outfit font-extrabold text-tinta uppercase tracking-widest flex items-center gap-1.5">
                🏆 Más Vendidos hoy
              </h4>
            </div>

            {loading ? (
              <div className="h-36 flex items-center justify-center text-gris text-xs font-outfit">Cargando ranking...</div>
            ) : topProductos.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-lg bg-crema flex items-center justify-center mb-2">
                  <DashboardIcon name="top" className="w-4 h-4 text-gris" />
                </div>
                <p className="text-gris text-xs font-outfit italic">Sin ventas registradas hoy</p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {topProductos.map((prod, index) => {
                  return (
                    <div key={prod.nombre} className="flex items-center justify-between p-3 bg-white border border-slate-100/80 rounded-2xl hover:bg-crema/10 hover:shadow-xs transition-all duration-200 group">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Wrapper for image & overlapping badge */}
                        <div className="relative w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-xs">
                          {/* Overlapping blue badge */}
                          <span className="absolute -top-1.5 -left-1.5 bg-blue-600 text-white font-outfit font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-sm z-10">
                            #{index + 1}
                          </span>
                          {prod.fotoUrl ? (
                            <img src={prod.fotoUrl} alt={prod.nombre} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
                            </svg>
                          )}
                        </div>

                        {/* Name and Units */}
                        <div className="flex-1 min-w-0">
                          <p className="font-outfit font-extrabold text-tinta text-xs uppercase tracking-wide truncate group-hover:text-rosa transition-colors">
                            {prod.nombre}
                          </p>
                          <p className="text-[11px] text-gris font-outfit mt-0.5 font-semibold">
                            {prod.cantidad} unidades
                          </p>
                        </div>
                      </div>

                      {/* Golden Trophy on the right */}
                      <span className="text-base text-amber-400 opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all flex-shrink-0 ml-2" title="Más vendido">
                        🏆
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-linea/60 pt-3 mt-2">
            <Link 
              to="/panel/reportes" 
              className="text-[11px] font-outfit font-semibold text-rosa hover:text-rosa-vivo flex items-center gap-1.5 transition-colors"
            >
              Ver reporte de ventas histórico <DashboardIcon name="flechaDerecha" className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

      {/* ── Flujo + Caja ── */}
      <div className="mb-8">

        {/* Gráfico: Horas Pico (Flujo interactivo con Área y Curva) */}
        <div className="w-full bg-white rounded-[18px] border border-linea p-5 shadow-card flex flex-col justify-between min-h-[305px]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 rounded-full bg-rosa" />
              <h4 className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-widest">
                Pedidos por Hora (Horas Pico)
              </h4>
            </div>
            <p className="text-xs text-gris font-outfit pl-3.5 mb-1">
              Frecuencia de comandas en tiempo real durante el día. Desliza el mouse sobre los puntos para más detalles.
            </p>
            
            {loading ? (
              <div className="h-36 flex items-center justify-center text-gris text-xs font-outfit">Cargando gráfico de flujo...</div>
            ) : (
              <div className="relative w-full overflow-hidden">
                <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-auto mt-2">
                  <defs>
                    {/* Gradiente para el área del gráfico */}
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#BD2C58" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#BD2C58" stopOpacity="0.00" />
                    </linearGradient>
                    
                    {/* Gradiente para la línea del gráfico */}
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F08CA5" />
                      <stop offset="50%" stopColor="#BD2C58" />
                      <stop offset="100%" stopColor="#BD2C58" />
                    </linearGradient>

                    {/* Sombra de brillo para el trazado */}
                    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#BD2C58" floodOpacity="0.22" />
                    </filter>
                  </defs>

                  {/* Rejilla de fondo */}
                  <line x1={paddingX} y1={graphHeight - paddingY} x2={graphWidth - paddingX} y2={graphHeight - paddingY} stroke="#E6E6E5" strokeWidth="1" />
                  <line x1={paddingX} y1={graphHeight - paddingY - canvasHeight/2} x2={graphWidth - paddingX} y2={graphHeight - paddingY - canvasHeight/2} stroke="#F8F8F7" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={paddingX} y1={paddingY} x2={graphWidth - paddingX} y2={paddingY} stroke="#F8F8F7" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Área degradada debajo del trazado */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#areaGrad)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Línea de trazado principal con brillo */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#glow)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Marcadores / Nodos en los vértices */}
                  {graphPoints.map((p, index) => {
                    const isHovered = hoveredIdx === index
                    return (
                      <g key={index}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 5.5 : p.qty > 0 ? 3.5 : 2.5}
                          fill={isHovered || p.qty > 0 ? '#BD2C58' : '#D1D5DB'}
                          stroke={isHovered || p.qty > 0 ? '#FFFFFF' : 'transparent'}
                          strokeWidth={isHovered || p.qty > 0 ? 1.5 : 0}
                          className="transition-all duration-150"
                        />
                        {/* Etiqueta de la hora (Eje X) */}
                        {index % 2 === 0 && (
                          <text
                            x={p.x}
                            y={graphHeight - 8}
                            textAnchor="middle"
                            className="text-[9px] fill-gris font-outfit font-semibold"
                          >
                            {`${p.hora}h`}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* Guía vertical interactiva y Tooltip */}
                  {hoveredIdx !== null && graphPoints[hoveredIdx] && (() => {
                    const hp = graphPoints[hoveredIdx]
                    const tooltipWidth = 65
                    const tooltipHeight = 22
                    const tx = Math.max(Math.min(hp.x - tooltipWidth / 2, graphWidth - tooltipWidth - 10), 10)
                    const ty = Math.max(hp.y - tooltipHeight - 8, 5)

                    return (
                      <g>
                        {/* Línea guía punteada */}
                        <line
                          x1={hp.x}
                          y1={paddingY}
                          x2={hp.x}
                          y2={graphHeight - paddingY}
                          stroke="#BD2C58"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        
                        {/* Tooltip flotante */}
                        <rect
                          x={tx}
                          y={ty}
                          width={tooltipWidth}
                          height={tooltipHeight}
                          rx={6}
                          fill="#23272a"
                          className="shadow-md"
                        />
                        <text
                          x={tx + tooltipWidth / 2}
                           y={ty + 14}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          className="text-[9px] font-black font-outfit"
                        >
                          {`${hp.qty} pedido${hp.qty !== 1 ? 's' : ''}`}
                        </text>
                      </g>
                    )
                  })()}

                  {/* Rects transparentes para capturar el hover de las columnas */}
                  {graphPoints.map((p, index) => {
                    const colWidth = canvasWidth / (activeHours.length - 1)
                    const x = p.x - colWidth / 2
                    return (
                      <rect
                        key={`target-${index}`}
                        x={x}
                        y={5}
                        width={colWidth}
                        height={graphHeight - 10}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(index)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          {tienePermiso('ver_cocina') && (
            <div className="border-t border-linea/60 pt-3.5 mt-2 flex justify-between items-center text-xs font-outfit">
              <span className="text-gris">Para ver comandas en preparación de cocina:</span>
              <Link
                to="/cocina"
                className="inline-flex items-center gap-1.5 text-xs text-rosa hover:text-rosa-vivo font-semibold transition-colors"
              >
                Pantalla de Cocina (KDS) <DashboardIcon name="flechaDerecha" className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Accesos rápidos ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-rosa" />
          <h4 className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-widest">
            Accesos rápidos
          </h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { 
              to: '/panel/productos', 
              label: 'Productos',  
              iconName: 'producto',  
              sub: 'Gestionar carta',   
              permiso: 'gestionar_productos',
              colorClass: 'text-tinta group-hover:text-orange-600',
              bgIconClass: 'bg-orange-50 text-orange-500 group-hover:bg-orange-100/80',
              borderHoverClass: 'hover:border-orange-200'
            },
            { 
              to: '/panel/mesas',     
              label: 'Punto de Venta', 
              iconName: 'ocupacion', 
              sub: 'Control de mesas',  
              permiso: 'gestionar_mesas',
              colorClass: 'text-tinta group-hover:text-slate-900',
              bgIconClass: 'bg-slate-100 text-slate-700 group-hover:bg-slate-200/60',
              borderHoverClass: 'hover:border-slate-300'
            },
            { 
              to: '/cocina',          
              label: 'Cocina',     
              iconName: 'chef',      
              sub: 'Pantalla KDS',       
              permiso: 'ver_cocina',
              colorClass: 'text-tinta group-hover:text-purple-700',
              bgIconClass: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100/80',
              borderHoverClass: 'hover:border-purple-200'
            },
            { 
              to: '/panel/caja',      
              label: 'Caja',       
              iconName: 'caja',      
              sub: 'Cobros y arqueo',   
              permiso: 'ver_caja',
              colorClass: 'text-tinta group-hover:text-emerald-700',
              bgIconClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100/80',
              borderHoverClass: 'hover:border-emerald-200'
            },
          ]
            .filter(a => tienePermiso(a.permiso))
            .map(a => (
              <Link
                key={a.to}
                to={a.to}
                className={`group bg-white hover:shadow-card border border-linea rounded-[18px] p-4 flex flex-col gap-2.5 transition-all duration-200 hover:-translate-y-1 ${a.borderHoverClass}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${a.bgIconClass}`}>
                  <DashboardIcon name={a.iconName} className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-fraunces font-semibold text-sm transition-colors ${a.colorClass}`}>
                    {a.label}
                  </p>
                  <p className="text-[11px] text-gris font-outfit mt-0.5">{a.sub}</p>
                </div>
                <div className="flex items-center justify-between mt-1 text-gris group-hover:text-tinta transition-all duration-200">
                  <span className="text-[10px] font-outfit font-semibold uppercase tracking-wider">Ir ahora</span>
                  <DashboardIcon name="flechaDerecha" className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
        </div>
      </div>

    </AdminLayout>
  )
}
