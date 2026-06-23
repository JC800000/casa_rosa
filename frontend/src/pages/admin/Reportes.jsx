import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { GET_REPORTE_VENTAS } from '../../graphql/reportes'

function hoy() { return new Date().toLocaleDateString('sv') }
function hace(dias) { const d = new Date(); d.setDate(d.getDate() - dias); return d.toLocaleDateString('sv') }
function primerDiaMes(offset = 0) { const d = new Date(); d.setMonth(d.getMonth() + offset, 1); return d.toLocaleDateString('sv') }
function ultimoDiaMes(offset = 0) { const d = new Date(); d.setMonth(d.getMonth() + offset + 1, 0); return d.toLocaleDateString('sv') }

const RANGOS = [
  { label: 'Hoy',            fi: () => hoy(),            ff: () => hoy() },
  { label: 'Últimos 7 días', fi: () => hace(6),          ff: () => hoy() },
  { label: 'Este mes',       fi: () => primerDiaMes(0),  ff: () => ultimoDiaMes(0) },
  { label: 'Mes anterior',   fi: () => primerDiaMes(-1), ff: () => ultimoDiaMes(-1) },
]

function bs(n) { return `Bs ${Number(n ?? 0).toFixed(2)}` }

function exportarCSV(reporte, fi, ff) {
  const rows = [
    ['Reporte de ventas', `${fi} al ${ff}`],
    [],
    ['RESUMEN'],
    ['Ventas brutas', reporte.totalBruto],
    ['Efectivo', reporte.totalEfectivo],
    ['QR', reporte.totalQr],
    ['Gastos', reporte.totalGastos],
    ['Neto', reporte.totalNeto],
    [],
    ['VENTAS POR DÍA'],
    ['Fecha', 'Total', 'Efectivo', 'QR'],
    ...reporte.ventasPorDia.map(v => [v.fecha, v.total, v.efectivo, v.qr]),
    [],
    ['TOP PRODUCTOS'],
    ['Producto', 'Cantidad', 'Total'],
    ...reporte.topProductos.map(p => [p.nombre, p.cantidad, p.total]),
    [],
    ['TOP COMBOS'],
    ['Combo', 'Cantidad', 'Total'],
    ...reporte.topCombos.map(c => [c.nombre, c.cantidad, c.total]),
    [],
    ['HISTORIAL DE CAJAS'],
    ['Fecha', 'Apertura', 'Cierre', 'Fondo', 'V.Efectivo', 'V.QR', 'Gastos', 'Esp.Efectivo', 'Real Efectivo', 'Dif.Efectivo', 'Esperado QR', 'Real QR', 'Dif.QR', 'Observación', 'Cajera apertura', 'Cajera cierre'],
    ...reporte.cajas.map(c => [
      c.fecha, c.horaApertura, c.horaCierre ?? '—',
      c.fondoInicial, c.ventasEfectivo, c.ventasQr, c.totalGastos,
      c.esperadoEfectivo, c.realEfectivo ?? '—', c.diferenciaEfectivo ?? '—',
      c.esperadoQr, c.realQr ?? '—', c.diferenciaQr ?? '—',
      c.observacion ?? '', c.cajeraAperturaNombre ?? '', c.cajeraCierreNombre ?? '',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte_${fi}_${ff}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const inputDate = 'border border-linea rounded-xl px-3 py-2 text-sm font-outfit text-tinta bg-white focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

export default function Reportes() {
  const { usuario } = useAuth()
  const [fi, setFi] = useState(primerDiaMes(0))
  const [ff, setFf] = useState(hoy())
  const [rangoActivo, setRangoActivo] = useState(null)
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const { data, loading, error } = useQuery(GET_REPORTE_VENTAS, {
    variables: { fechaInicio: fi, fechaFin: ff },
    fetchPolicy: 'cache-and-network',
  })

  const r = data?.reporteVentas
  const pctQr = r && r.totalBruto > 0 ? Math.round((r.totalQr / r.totalBruto) * 100) : 0
  const pctEfectivo = 100 - pctQr

  const seleccionarRango = (rango) => {
    setRangoActivo(rango.label)
    setFi(rango.fi())
    setFf(rango.ff())
  }

  // Preparar datos para el gráfico de líneas (ordenados por fecha ascendente)
  const salesData = r?.ventasPorDia ?? []
  const sortedSalesData = [...salesData].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const maxSale = Math.max(...sortedSalesData.map(d => d.total), 1)

  const graphWidth = 720
  const graphHeight = 200
  const paddingX = 75
  const paddingY = 25
  const canvasWidth = graphWidth - paddingX * 2
  const canvasHeight = graphHeight - paddingY * 2

  const graphPoints = sortedSalesData.map((d, index) => {
    const x = sortedSalesData.length > 1
      ? paddingX + (index * (canvasWidth / (sortedSalesData.length - 1)))
      : paddingX + canvasWidth / 2
    const y = graphHeight - paddingY - (d.total / maxSale) * canvasHeight
    return { x, y, total: d.total, fecha: d.fecha, efectivo: d.efectivo, qr: d.qr }
  })

  const linePath = graphPoints.reduce((acc, p, i) => {
    return acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `
  }, '')

  const areaPath = graphPoints.length > 0
    ? `${linePath} L ${graphPoints[graphPoints.length - 1].x} ${graphHeight - paddingY} L ${graphPoints[0].x} ${graphHeight - paddingY} Z`
    : ''

  return (
    <AdminLayout titulo="Reportes Históricos">
      <div className="print:p-0 space-y-6">

        {/* ── Encabezado Oficial Exclusivo para Impresión ── */}
        <div className="hidden print:block border-b-2 border-tinta pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-outfit font-black text-2xl text-tinta uppercase tracking-tight">CASA ROSA</h1>
              <p className="text-[10px] font-outfit uppercase tracking-wider text-gris">Cafetería · Pastelería</p>
            </div>
            <div className="text-right">
              <h2 className="font-fraunces font-bold text-base text-tinta">Reporte Consolidado de Ventas</h2>
              <p className="text-xs font-outfit text-gris mt-0.5">
                Generado por: <span className="font-semibold text-tinta">{usuario?.username || 'Administrador'}</span>
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-linea text-xs font-outfit text-gris font-medium">
            <span>Rango analizado: <strong className="text-tinta">{fi}</strong> al <strong className="text-tinta">{ff}</strong></span>
            <span>Fecha emisión: {new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-[18px] shadow-card border border-linea p-5 print:hidden">
          <div className="flex flex-wrap gap-2 mb-4">
            {RANGOS.map(rango => (
              <button
                key={rango.label}
                onClick={() => seleccionarRango(rango)}
                className={`text-sm px-4 py-2 rounded-full font-outfit font-medium transition-all ${rangoActivo === rango.label ? 'bg-vino text-white shadow-sm' : 'bg-crema text-gris hover:bg-rosa-niebla hover:text-rosa'}`}
              >
                {rango.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gris font-outfit font-semibold uppercase tracking-wider">Desde</label>
              <input type="date" value={fi} onChange={e => { setFi(e.target.value); setRangoActivo(null) }} className={inputDate} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gris font-outfit font-semibold uppercase tracking-wider">Hasta</label>
              <input type="date" value={ff} onChange={e => { setFf(e.target.value); setRangoActivo(null) }} className={inputDate} />
            </div>
            <div className="ml-auto flex gap-2">
              {r && (
                <button onClick={() => exportarCSV(r, fi, ff)} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-outfit font-medium transition shadow-sm">
                  Exportar CSV
                </button>
              )}
              <button onClick={() => window.print()} className="text-sm bg-tinta hover:bg-vino text-white px-4 py-2 rounded-xl font-outfit font-medium transition shadow-sm">
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {loading && <p className="text-center text-gris py-16 font-outfit animate-pulse">Cargando reporte...</p>}
        {error && <p className="text-center text-red-400 py-8 font-outfit">Error al cargar el reporte.</p>}

        {r && (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-up">
              {[
                { label: 'Ventas brutas',  value: bs(r.totalBruto),    color: 'text-rosa' },
                { label: 'Efectivo',       value: bs(r.totalEfectivo), color: 'text-emerald-600 font-bold' },
                { label: 'QR',             value: bs(r.totalQr),       color: 'text-blue-600 font-bold' },
                { label: 'Gastos',         value: bs(r.totalGastos),   color: 'text-red-500' },
                { label: 'Neto',           value: bs(r.totalNeto),     color: 'text-tinta font-bold' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-[18px] shadow-card border border-linea p-4 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rosa/60 to-rosa-vivo/20 print:hidden" />
                  <p className="text-[10px] font-outfit font-semibold text-gris uppercase tracking-widest mb-1">{label}</p>
                  <p className={`font-fraunces text-lg font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Mix de cobro */}
            {r.totalBruto > 0 && (
              <div className="bg-white rounded-[18px] shadow-card border border-linea p-5 animate-fade-up">
                <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-3">Método de pago</p>
                <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-linea">
                  <div className="bg-emerald-400 transition-all rounded-l-full" style={{ width: `${pctEfectivo}%` }} />
                  <div className="bg-blue-400 transition-all rounded-r-full" style={{ width: `${pctQr}%` }} />
                </div>
                <div className="flex gap-6 text-xs font-outfit text-gris">
                  <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5" />Efectivo {pctEfectivo}%</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 mr-1.5" />QR {pctQr}%</span>
                </div>
              </div>
            )}

            {/* Fila del Gráfico Lineal (Oculto en Impresión física) */}
            <div className="bg-white rounded-[18px] shadow-card border border-linea p-5 print:hidden animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider">Tendencia de Facturación Diaria</p>
                  <p className="text-[10px] text-gris font-outfit mt-0.5">Ventas totales acumuladas por día en el período</p>
                </div>
                <span className="hidden sm:inline-block text-[9px] text-gris/70 font-outfit uppercase tracking-wider">Pasa el cursor para ver detalles</span>
              </div>
              
              {sortedSalesData.length === 0 ? (
                <p className="text-sm text-gris text-center py-12 font-outfit italic">Sin transacciones registradas en este rango</p>
              ) : (
                <div className="w-full relative overflow-visible h-[210px] select-none">
                  <svg width="100%" height="100%" viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="overflow-visible">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BD2C58" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#BD2C58" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#BD2C58" />
                        <stop offset="100%" stopColor="#F472B6" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Guías horizontales y escala en Y */}
                    {[0, 0.5, 1].map((pct) => {
                      const y = paddingY + pct * canvasHeight
                      const val = maxSale * (1 - pct)
                      return (
                        <g key={pct}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={graphWidth - paddingX}
                            y2={y}
                            stroke="#F3F4F6"
                            strokeWidth="1.25"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={paddingX - 10}
                            y={y + 3.5}
                            textAnchor="end"
                            className="text-[9px] fill-gris font-outfit font-semibold"
                          >
                            {bs(val)}
                          </text>
                        </g>
                      )
                    })}

                    {/* Área sombreada */}
                    {areaPath && (
                      <path d={areaPath} fill="url(#areaGrad)" className="transition-all duration-300" />
                    )}

                    {/* Línea principal */}
                    {linePath && (
                      <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" className="transition-all duration-300" />
                    )}

                    {/* Nodos de vértice */}
                    {graphPoints.map((p, idx) => {
                      const isHovered = hoveredIdx === idx
                      return (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered ? 5.5 : p.total > 0 ? 3.5 : 2.5}
                            fill={isHovered || p.total > 0 ? '#BD2C58' : '#D1D5DB'}
                            stroke={isHovered || p.total > 0 ? '#FFFFFF' : 'transparent'}
                            strokeWidth={isHovered || p.total > 0 ? 1.5 : 0}
                            className="transition-all duration-150"
                          />
                          {/* Fechas en el Eje X */}
                          {(() => {
                            const step = Math.max(Math.ceil(sortedSalesData.length / 6), 1)
                            if (idx % step !== 0 && idx !== sortedSalesData.length - 1) return null
                            const partes = p.fecha.split('-')
                            const lbl = partes.length === 3 ? `${partes[2]}/${partes[1]}` : p.fecha
                            return (
                              <text
                                x={p.x}
                                y={graphHeight - 6}
                                textAnchor="middle"
                                className="text-[9px] fill-gris/85 font-outfit font-bold"
                              >
                                {lbl}
                              </text>
                            )
                          })()}
                        </g>
                      )
                    })}

                    {/* Línea guía vertical y Tooltip flotante al hacer Hover */}
                    {hoveredIdx !== null && graphPoints[hoveredIdx] && (() => {
                      const hp = graphPoints[hoveredIdx]
                      const tooltipW = 120
                      const tooltipH = 58
                      const tx = Math.max(Math.min(hp.x - tooltipW / 2, graphWidth - tooltipW - 10), 10)
                      const ty = Math.max(hp.y - tooltipH - 12, 5)

                      return (
                        <g>
                          <line
                            x1={hp.x}
                            y1={paddingY}
                            x2={hp.x}
                            y2={graphHeight - paddingY}
                            stroke="#BD2C58"
                            strokeWidth="1.25"
                            strokeDasharray="3 3"
                          />
                          <rect
                            x={tx}
                            y={ty}
                            width={tooltipW}
                            height={tooltipH}
                            rx={8}
                            fill="#1F2937"
                            className="shadow-xl"
                          />
                          <text x={tx + 10} y={ty + 15} fill="#9CA3AF" className="text-[9px] font-bold font-outfit uppercase tracking-wide">{hp.fecha}</text>
                          <text x={tx + 10} y={ty + 28} fill="#FFFFFF" className="text-[11px] font-black font-outfit">Total: {bs(hp.total)}</text>
                          <text x={tx + 10} y={ty + 40} fill="#34D399" className="text-[9px] font-bold font-outfit">Ef: {bs(hp.efectivo)}</text>
                          <text x={tx + 10} y={ty + 50} fill="#60A5FA" className="text-[9px] font-bold font-outfit">QR: {bs(hp.qr)}</text>
                        </g>
                      )
                    })()}

                    {/* Rects transparentes para capturar el Hover sobre la columna */}
                    {graphPoints.map((p, idx) => {
                      const colWidth = sortedSalesData.length > 1 ? canvasWidth / (sortedSalesData.length - 1) : canvasWidth
                      const x = p.x - colWidth / 2
                      return (
                        <rect
                          key={`hover-col-${idx}`}
                          x={x}
                          y={paddingY}
                          width={colWidth}
                          height={canvasHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        />
                      )
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Dos columnas para Top Productos y Combos */}
            <div className="grid lg:grid-cols-2 gap-6 animate-fade-up">
              
              {/* Top 5 productos */}
              <div className="bg-white rounded-[18px] shadow-card border border-linea p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-4 rounded-full bg-rosa print:hidden" />
                  <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider">Top 5 productos más vendidos</p>
                </div>
                {r.topProductos.length === 0 ? (
                  <p className="text-sm text-gris text-center py-6 font-outfit italic">Sin ventas en este rango</p>
                ) : (
                  <div className="divide-y divide-linea/65">
                    {r.topProductos.map((p, i) => (
                      <div key={p.nombre} className="flex items-center justify-between py-3 first:pt-1 last:pb-1">
                        <span className="flex items-center gap-3 font-outfit text-tinta text-sm font-semibold">
                          <span className="text-[11px] font-black text-rosa/85 w-5 h-5 rounded-lg bg-rosa/10 flex items-center justify-center print:bg-transparent print:text-tinta print:border print:border-gris/35">
                            #{i + 1}
                          </span>
                          {p.nombre}
                        </span>
                        <div className="text-right">
                          <p className="font-fraunces font-bold text-tinta text-sm">{bs(p.total)}</p>
                          <p className="text-[10px] text-gris font-outfit mt-0.5 font-medium">{p.cantidad} unidades vendidas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top 5 combos */}
              <div className="bg-white rounded-[18px] shadow-card border border-linea p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-4 rounded-full bg-blue-500 print:hidden" />
                  <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider">Top 5 combos populares</p>
                </div>
                {r.topCombos.length === 0 ? (
                  <p className="text-sm text-gris text-center py-6 font-outfit italic">Sin combos vendidos en este rango</p>
                ) : (
                  <div className="divide-y divide-linea/65">
                    {r.topCombos.map((c, i) => (
                      <div key={c.nombre} className="flex items-center justify-between py-3 first:pt-1 last:pb-1">
                        <span className="flex items-center gap-3 font-outfit text-tinta text-sm font-semibold">
                          <span className="text-[11px] font-black text-blue-500/85 w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center print:bg-transparent print:text-tinta print:border print:border-gris/35">
                            #{i + 1}
                          </span>
                          {c.nombre}
                        </span>
                        <div className="text-right">
                          <p className="font-fraunces font-bold text-tinta text-sm">{bs(c.total)}</p>
                          <p className="text-[10px] text-gris font-outfit mt-0.5 font-medium">{c.cantidad} combos vendidos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Historial de cajas (Rediseño Premium Stripe-style) */}
            <div className="bg-white rounded-[18px] shadow-card border border-linea overflow-hidden page-break-before-print animate-fade-up">
              <div className="px-5 py-4 border-b border-linea bg-crema/10 flex items-center justify-between print:bg-transparent">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4 rounded-full bg-vino print:hidden" />
                  <p className="text-[11px] font-outfit font-bold text-tinta uppercase tracking-wider">Historial de arqueo de cajas</p>
                </div>
                <span className="text-[10px] font-outfit font-bold text-gris bg-crema px-2.5 py-1 rounded-lg print:border print:border-linea">
                  {r.cajas.length} sesión{r.cajas.length !== 1 ? 'es' : ''}
                </span>
              </div>
              {r.cajas.length === 0 ? (
                <p className="text-sm text-gris text-center py-12 font-outfit italic">Sin sesiones de caja registradas en este rango</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px] print:min-w-0 print:text-[9pt]">
                    <thead>
                      <tr className="bg-crema/5 border-b border-linea text-[10px] font-outfit font-extrabold text-gris/70 uppercase tracking-[0.08em] print:bg-gray-100">
                        <th className="px-5 py-4">Fecha / Sesión</th>
                        <th className="px-5 py-4">Cajero / Observación</th>
                        <th className="px-5 py-4">Horarios</th>
                        <th className="px-5 py-4 text-right">Fondo Apertura</th>
                        <th className="px-5 py-4 text-right">Ventas Ef.</th>
                        <th className="px-5 py-4 text-right">Ventas QR</th>
                        <th className="px-5 py-4 text-right">Gastos</th>
                        <th className="px-5 py-4 text-right">Efectivo Real</th>
                        <th className="px-5 py-4 text-right">Cierre / Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-linea/45">
                      {r.cajas.map(c => {
                        const dif = c.diferenciaEfectivo
                        const abierta = !c.horaCierre
                        
                        const formatoHora = (h) => h ? new Date(h).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '—'

                        return (
                          <tr key={c.id} className={`hover:bg-crema/10 transition-colors duration-150 ${abierta ? 'bg-amber-50/40 hover:bg-amber-50/60 print:bg-yellow-50' : ''}`}>
                            
                            {/* Fecha y Estado Badge */}
                            <td className="px-5 py-4 align-middle whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="font-outfit font-bold text-tinta text-xs">{c.fecha}</span>
                                <div>
                                  {abierta ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-outfit font-bold text-amber-700 bg-amber-50 border border-amber-250/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse print:hidden" />
                                      Abierta
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-outfit font-bold text-emerald-700 bg-emerald-50 border border-emerald-250/30">
                                      Cerrada
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Cajero y Notas stacked */}
                            <td className="px-5 py-4 align-middle">
                              <div className="flex flex-col">
                                <span className="font-outfit font-bold text-tinta text-xs">
                                  {c.cajeraCierreNombre || c.cajeraAperturaNombre || 'Sin asignar'}
                                </span>
                                {c.observacion && (
                                  <span className="text-[10px] text-gris/70 italic mt-0.5 max-w-[150px] truncate block print:max-w-none print:whitespace-normal" title={c.observacion}>
                                    {c.observacion}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Horas stacked */}
                            <td className="px-5 py-4 align-middle whitespace-nowrap">
                              <div className="flex flex-col text-[10px] text-gris font-outfit font-medium">
                                <span>Apertura: {formatoHora(c.horaApertura)}</span>
                                {c.horaCierre && <span>Cierre: {formatoHora(c.horaCierre)}</span>}
                              </div>
                            </td>

                            {/* Fondo Inicial */}
                            <td className="px-5 py-4 align-middle text-right font-outfit text-xs text-gris whitespace-nowrap">{bs(c.fondoInicial)}</td>

                            {/* Ventas Efectivo */}
                            <td className="px-5 py-4 align-middle text-right font-outfit text-xs text-emerald-700 font-semibold whitespace-nowrap">{bs(c.ventasEfectivo)}</td>

                            {/* Ventas QR */}
                            <td className="px-5 py-4 align-middle text-right font-outfit text-xs text-blue-700 font-semibold whitespace-nowrap">{bs(c.ventasQr)}</td>

                            {/* Gastos */}
                            <td className="px-5 py-4 align-middle text-right font-outfit text-xs text-red-500 font-medium whitespace-nowrap">{bs(c.totalGastos)}</td>

                            {/* Efectivo Real */}
                            <td className="px-5 py-4 align-middle text-right font-outfit text-xs text-tinta font-semibold whitespace-nowrap">
                              {c.realEfectivo != null ? bs(c.realEfectivo) : <span className="text-gris/40">—</span>}
                            </td>

                            {/* Diferencia con Visual Highlights en badges */}
                            <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                              {(() => {
                                if (dif === null) return <span className="text-gris/40 text-xs font-outfit">—</span>
                                
                                if (dif < 0) return (
                                  <span className="inline-block px-2.5 py-1 rounded-[6px] text-[10px] font-outfit font-extrabold text-red-700 bg-red-50 border border-red-200/50">
                                    {bs(dif)} (Faltante)
                                  </span>
                                )
                                if (dif > 0) return (
                                  <span className="inline-block px-2.5 py-1 rounded-[6px] text-[10px] font-outfit font-extrabold text-blue-700 bg-blue-50 border border-blue-200/50">
                                    +{bs(dif)} (Sobrante)
                                  </span>
                                )
                                return (
                                  <span className="inline-block px-2.5 py-1 rounded-[6px] text-[10px] font-outfit font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/50">
                                    {bs(dif)} (Cuadrada)
                                  </span>
                                )
                              })()}
                            </td>

                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Firmas de Control de Auditoría (Exclusivo para Impresión Física) ── */}
            <div className="hidden print:block mt-16 pt-8 border-t border-linea">
              <div className="flex justify-around text-center text-xs font-outfit text-tinta">
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-tinta/80 mb-2" />
                  <span className="font-bold">Firma Administrador / Cajero</span>
                  <span className="text-[10px] text-gris mt-0.5">Responsable de Caja</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-tinta/80 mb-2" />
                  <span className="font-bold">Firma Propietario / Auditor</span>
                  <span className="text-[10px] text-gris mt-0.5">Revisado por</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            margin: 15mm 12mm 15mm 12mm !important;
          }

          /* Asegurar que la jerarquía de contenedores principales sea totalmente visible y expandible */
          html, body, #root, 
          div[class*="h-screen"], 
          main, 
          div[class*="p-8"] {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            background-color: #ffffff !important;
            visibility: visible !important;
          }

          /* Desactivar contenedores restrictivos de altura o scroll de la estructura del admin */
          div[class*="overflow-y-auto"],
          div[class*="overflow-x-auto"],
          .bg-white,
          .page-break-before-print {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }

          /* Ocultar barra lateral, cabeceras web y filtros */
          aside, header, nav, .print\\:hidden, button {
            display: none !important;
          }

          /* Ajustar el contenedor de impresión principal */
          .print\\:p-0 {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            visibility: visible !important;
          }

          /* Asegurar visibilidad de todo el contenido del reporte */
          .print\\:p-0, .print\\:p-0 * {
            visibility: visible !important;
          }

          /* Resetear contenedores tipo tarjeta para que se expandan y no floten */
          .bg-white {
            background-color: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin-bottom: 24px !important;
            display: block !important;
            overflow: visible !important;
          }

          /* Forzar a las grillas a apilarse verticalmente (evita compresión horizontal) */
          .grid, .grid-cols-1, .grid-cols-2, .lg\\:grid-cols-2 {
            display: block !important;
          }
          .grid > *, .grid-cols-1 > *, .grid-cols-2 > *, .lg\\:grid-cols-2 > * {
            margin-bottom: 24px !important;
            width: 100% !important;
            display: block !important;
          }

          /* Flexbox para mantener las 5 tarjetas de resumen alineadas en el ancho */
          .grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-5 {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
          }
          .grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-5 > * {
            flex: 1 1 18% !important;
            min-width: 110px !important;
            margin-bottom: 0 !important;
            border: 1px solid #D1D5DB !important;
            padding: 10px !important;
            background-color: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }
          .grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-5 p {
            margin: 0 !important;
            white-space: nowrap !important;
          }

          /* Reglas específicas de envoltura de texto en impresión */
          th, td {
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }

          /* Forzar no envoltura en elementos marcados */
          .whitespace-nowrap,
          .whitespace-nowrap *,
          td.whitespace-nowrap,
          td.whitespace-nowrap * {
            white-space: nowrap !important;
          }

          /* Quitar el truncado por CSS y mostrar texto completo */
          .truncate {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            display: block !important;
          }

          /* Salto de página para el arqueo de cajas */
          .page-break-before-print {
            page-break-before: always !important;
            margin-top: 30px !important;
            overflow: visible !important;
          }

          /* Formatear tabla de arqueos contables para que entre en la hoja */
          table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            border: 1px solid #D1D5DB !important;
            padding: 5px 6px !important;
            font-size: 7.5pt !important;
            line-height: 1.2 !important;
            color: #1F2937 !important;
            vertical-align: middle !important;
          }
          thead {
            background-color: #F3F4F6 !important;
          }
          thead th {
            color: #111827 !important;
            font-weight: 700 !important;
          }

          /* Resaltar contornos y colores de badges en impresión */
          .bg-emerald-50 {
            background-color: #ECFDF5 !important;
            border: 1px solid #10B981 !important;
            color: #047857 !important;
            font-weight: bold !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .bg-red-50 {
            background-color: #FEF2F2 !important;
            border: 1px solid #EF4444 !important;
            color: #B91C1C !important;
            font-weight: bold !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .bg-blue-50 {
            background-color: #EFF6FF !important;
            border: 1px solid #3B82F6 !important;
            color: #1D4ED8 !important;
            font-weight: bold !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .bg-amber-50 {
            background-color: #FFFBEB !important;
            border: 1px solid #F59E0B !important;
            color: #B45309 !important;
            font-weight: bold !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
        }
      `}</style>
    </AdminLayout>
  )
}
