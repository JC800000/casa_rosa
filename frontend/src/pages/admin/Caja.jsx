import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import {
  GET_CAJA_HOY,
  ABRIR_CAJA, REGISTRAR_GASTO, CERRAR_CAJA, GET_HISTORIAL_CAJAS,
  GET_MOVIMIENTOS_CAJA,
} from '../../graphql/caja'

const bs = (n) => `Bs ${Number(n ?? 0).toFixed(2)}`
const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-base font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'
const inputLg  = inputCls + ' text-2xl font-outfit font-semibold py-3'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function formatHora(isoStr) {
  try { return new Date(isoStr).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '--:--' }
}

/* ── Tarjeta de resumen con color de fondo sólido (Grande y legible) ── */
function StatCard({ label, value, sub, bgClass }) {
  const formattedValue = Number(value ?? 0).toFixed(2)
  return (
    <div className={`rounded-2xl p-7 text-white shadow-md flex flex-col justify-between h-[140px] ${bgClass}`}>
      <div>
        <p className="text-[11px] font-outfit font-extrabold uppercase tracking-wider opacity-90 mb-2">{label}</p>
        <p className="font-outfit text-4xl font-black tracking-tight">{formattedValue}</p>
      </div>
      {sub && <p className="text-xs font-outfit font-medium opacity-85 mt-2">{sub}</p>}
    </div>
  )
}

/* ── Modal genérico ── */
function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[18px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
          <h3 className="font-outfit font-bold text-lg text-tinta">{titulo}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-all text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ── Modal Abrir Caja ── */
function ModalAbrirCaja({ cajeraId, onClose, onOpened }) {
  const [fondo, setFondo] = useState('')
  const [abrirCaja, { loading }] = useMutation(ABRIR_CAJA, { onCompleted: () => { onOpened(); onClose() } })
  const submit = () => { const f = parseFloat(fondo); if (isNaN(f) || f < 0) return; abrirCaja({ variables: { fondoInicial: f, cajeraId } }) }
  return (
    <Modal titulo="Abrir caja del día" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Fondo inicial (Bs)</label>
          <input type="number" value={fondo} onChange={e => setFondo(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="0.00" min="0" className={inputLg} autoFocus />
          <p className="text-xs text-gris mt-1 font-outfit">Dinero con el que arrancás el día</p>
        </div>
        <button onClick={submit} disabled={loading || fondo === ''} className="w-full bg-vino hover:bg-rosa disabled:bg-gris text-white font-outfit font-semibold py-3 rounded-xl transition-colors shadow-sm">
          {loading ? 'Abriendo...' : 'Abrir caja'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Modal Registrar Gasto ── */
function ModalGasto({ cajeraId, onClose, onGuardado }) {
  const [monto, setMonto] = useState('')
  const [desc, setDesc] = useState('')
  const [via, setVia] = useState('efectivo')
  const [registrarGasto, { loading }] = useMutation(REGISTRAR_GASTO, { onCompleted: () => { onGuardado(); onClose() } })
  const submit = () => { const m = parseFloat(monto); if (!desc.trim() || isNaN(m) || m <= 0) return; registrarGasto({ variables: { monto: m, descripcion: desc.trim(), via, registradoPorId: cajeraId } }) }
  return (
    <Modal titulo="Registrar gasto / salida" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Monto (Bs)</label>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" min="0" className={inputLg} autoFocus />
        </div>
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Descripción</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Ej: Limpieza, insumos, delivery..." maxLength={255} className={inputCls} />
        </div>
        <div>
          <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-2">Pagado con</p>
          <div className="grid grid-cols-2 gap-2">
            {['efectivo', 'qr'].map(v => (
              <button key={v} onClick={() => setVia(v)} className={`py-2.5 rounded-xl text-base font-outfit font-semibold border-2 transition-all ${via === v ? 'border-rosa bg-rosa-niebla text-rosa' : 'border-linea text-gris hover:border-gris'}`}>
                {v === 'efectivo' ? '💵 Efectivo' : '📱 QR'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={submit} disabled={loading || !desc || !monto} className="w-full bg-vino hover:bg-rosa disabled:bg-gris text-white font-outfit font-semibold py-3 rounded-xl transition-colors shadow-sm">
          {loading ? 'Guardando...' : 'Registrar gasto'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Modal Cerrar Caja (Arqueo) ── */
function ModalCerrarCaja({ caja, onClose, onCerrado }) {
  const [realEfectivo, setRealEfectivo] = useState('')
  const [realQr, setRealQr] = useState('')
  const [obs, setObs] = useState('')
  const [cerrarCaja, { loading }] = useMutation(CERRAR_CAJA, { onCompleted: () => { onCerrado(); onClose() } })
  const re = parseFloat(realEfectivo) || 0
  const rq = parseFloat(realQr) || 0
  const diffE = realEfectivo !== '' ? re - Number(caja.esperadoEfectivo) : null
  const diffQ = realQr !== '' ? rq - Number(caja.esperadoQr) : null
  const submit = () => { if (realEfectivo === '' || realQr === '') return; cerrarCaja({ variables: { cajaId: parseInt(caja.id), realEfectivo: re, realQr: rq, observacion: obs } }) }
  return (
    <Modal titulo="Cerrar caja · Arqueo" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-crema/60 rounded-xl p-4 space-y-2 text-base border border-linea">
          <p className="font-outfit font-semibold text-gris text-[11px] uppercase tracking-wider mb-2">Resumen del día</p>
          {[{ l: 'Fondo inicial', v: caja.fondoInicial, c: 'text-gris' }, { l: '+ Ventas efectivo', v: caja.ventasEfectivo, c: 'text-emerald-600' }, { l: '+ Ventas QR', v: caja.ventasQr, c: 'text-blue-500' }, { l: '− Gastos', v: caja.totalGastos, c: 'text-red-500' }].map(i => (
            <div key={i.l} className="flex justify-between font-outfit"><span className="text-gris">{i.l}</span><span className={`font-medium ${i.c}`}>{bs(i.v)}</span></div>
          ))}
          <div className="border-t border-linea pt-2 flex justify-between font-outfit font-bold"><span className="text-tinta">Esperado efectivo</span><span className="text-rosa">{bs(caja.esperadoEfectivo)}</span></div>
          <div className="flex justify-between font-outfit font-bold"><span className="text-tinta">Esperado QR</span><span className="text-blue-500">{bs(caja.esperadoQr)}</span></div>
        </div>
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">💵 Real en caja (efectivo)</label>
          <input type="number" value={realEfectivo} onChange={e => setRealEfectivo(e.target.value)} placeholder={Number(caja.esperadoEfectivo).toFixed(2)} min="0" className={inputLg} autoFocus />
          {diffE !== null && <p className={`text-base font-outfit font-bold mt-1.5 ${diffE >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{diffE >= 0 ? `Sobrante: +${bs(diffE)}` : `Faltante: ${bs(diffE)}`}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">📱 Real cobrado (QR)</label>
          <input type="number" value={realQr} onChange={e => setRealQr(e.target.value)} placeholder={Number(caja.esperadoQr).toFixed(2)} min="0" className={inputLg} />
          {diffQ !== null && <p className={`text-base font-outfit font-bold mt-1.5 ${diffQ >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{diffQ >= 0 ? `Sobrante: +${bs(diffQ)}` : `Faltante: ${bs(diffQ)}`}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Observación (opcional)</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Novedades del día..." className={inputCls + ' resize-none'} />
        </div>
        <button onClick={submit} disabled={loading || realEfectivo === '' || realQr === ''} className="w-full bg-tinta hover:bg-vino disabled:bg-gris text-white font-outfit font-semibold py-3 rounded-xl transition-colors shadow-sm">
          {loading ? 'Cerrando...' : 'Cerrar caja'}
        </button>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL: CAJA Y MOVIMIENTOS
   ══════════════════════════════════════════════════════════════ */
export default function Caja() {
  const { usuario } = useAuth()
  const cajeraId = parseInt(usuario?.id)
  const [modal, setModal] = useState(null)
  const [notif, setNotif] = useState(null)
  const notifTimer = useRef(null)

  // Filtro de fechas
  const hoy = todayStr()
  const [fechaInicio, setFechaInicio] = useState(hoy)
  const [fechaFin, setFechaFin] = useState(hoy)

  // Tab activa
  const [tab, setTab] = useState('ventas') // 'ventas' | 'gastos' | 'cierres'

  const showNotif = (msg) => { clearTimeout(notifTimer.current); setNotif(msg); notifTimer.current = setTimeout(() => setNotif(null), 4000) }

  // Queries
  const { data: dataCaja, refetch: refetchCaja } = useQuery(GET_CAJA_HOY, { fetchPolicy: 'network-only', pollInterval: 15000 })
  const { data: dataHistorial, refetch: refetchHistorial } = useQuery(GET_HISTORIAL_CAJAS, { fetchPolicy: 'network-only' })
  const { data: dataMov, refetch: refetchMov } = useQuery(GET_MOVIMIENTOS_CAJA, {
    variables: { fechaInicio, fechaFin },
    fetchPolicy: 'network-only',
    pollInterval: 15000,
  })

  const historial = dataHistorial?.historialCajas?.filter(c => !!c.horaCierre) ?? []
  const caja = dataCaja?.cajaHoy ?? null
  const cajaAbierta = caja && !caja.horaCierre
  const mov = dataMov?.movimientosCaja ?? null

  // Sincronizar fechas con la caja abierta si cambia o se inicia el panel
  const [activeCajaId, setActiveCajaId] = useState(null)

  useEffect(() => {
    if (dataCaja?.cajaHoy && !dataCaja.cajaHoy.horaCierre) {
      if (dataCaja.cajaHoy.id !== activeCajaId) {
        setFechaInicio(dataCaja.cajaHoy.fecha)
        setFechaFin(dataCaja.cajaHoy.fecha)
        setActiveCajaId(dataCaja.cajaHoy.id)
      }
    } else {
      setActiveCajaId(null)
    }
  }, [dataCaja, activeCajaId])

  const refetchAll = () => { refetchCaja(); refetchHistorial(); refetchMov() }

  return (
    <AdminLayout titulo="Caja">
      {/* Toast */}
      {notif && (
        <div className="fixed top-6 right-6 z-50 bg-rosa text-white px-5 py-3 rounded-xl shadow-lg text-base font-outfit font-semibold animate-fade-up">
          {notif}
        </div>
      )}

      {/* ── Header con título, fechas y acciones (Más grande y espaciado) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 animate-fade-up">
        <div>
          <h2 className="font-outfit font-extrabold text-tinta text-3xl leading-tight flex items-center gap-2.5">
            💰 Caja y Movimientos
          </h2>
          <p className="text-base text-gris font-outfit mt-1">Control de Ingresos y Egresos</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Selector de fechas */}
          <div className="flex items-center gap-2 bg-white border border-linea rounded-xl px-4 py-2.5 shadow-sm">
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="text-base font-outfit text-tinta bg-transparent outline-none w-[140px]"
            />
            <span className="text-gris text-sm font-outfit">—</span>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="text-base font-outfit text-tinta bg-transparent outline-none w-[140px]"
            />
            <button
              onClick={() => refetchMov()}
              className="w-10 h-10 flex items-center justify-center bg-rosa hover:bg-vino text-white rounded-lg transition-colors text-base"
              title="Buscar"
            >
              🔍
            </button>
          </div>

          {/* Acciones de caja */}
          {!caja && (
            <button onClick={() => setModal('abrir')} className="flex items-center gap-2 bg-vino hover:bg-rosa text-white font-outfit font-semibold px-6 py-3 rounded-xl text-base transition-all shadow-sm">
              💰 Abrir Caja
            </button>
          )}
          {cajaAbierta && (
            <>
              <button onClick={() => setModal('cerrar')} className="flex items-center gap-2 bg-tinta hover:bg-vino text-white font-outfit font-semibold px-6 py-3 rounded-xl text-base transition-all shadow-sm">
                🔒 Cerrar Caja
              </button>
              <button onClick={() => setModal('gasto')} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-outfit font-semibold px-6 py-3 rounded-xl text-base transition-all shadow-sm">
                ➖ Registrar Salida
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Banner caja cerrada ── */}
      {caja && !!caja.horaCierre && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-3 mb-6 animate-fade-up">
          <span className="text-3xl">✅</span>
          <div>
            <p className="font-outfit font-extrabold text-lg text-emerald-700">Caja cerrada hoy</p>
            <p className="text-sm text-emerald-500 font-outfit">Cerrada a las {formatHora(caja.horaCierre)}</p>
          </div>
        </div>
      )}

      {/* ── Tarjetas de resumen (Solid color, taller and larger text) ── */}
      {mov && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <StatCard
            label="Venta Total"
            value={mov.totalVentas}
            sub={`${mov.numVentas} operaciones`}
            bgClass="bg-[#1E75FF]"
          />
          <StatCard
            label="Entrada Efectivo"
            value={mov.totalEfectivo}
            sub="Dinero Físico Ingresado"
            bgClass="bg-[#1E8E52]"
          />
          <StatCard
            label="Gastos / Salidas"
            value={mov.totalGastos}
            sub={`${mov.numGastos} movimientos`}
            bgClass="bg-[#e13a48]"
          />
          <StatCard
            label="Dinero en Caja (Balance)"
            value={mov.balance}
            sub="Efectivo - Gastos"
            bgClass="bg-[#23272a]"
          />
        </div>
      )}

      {/* ── Tabs: Ventas / Gastos / Cierres (Larger size) ── */}
      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-8 border-b border-linea mb-8">
          {[
            { val: 'ventas', label: '📋 Historial de Ventas', count: mov?.numVentas ?? 0 },
            { val: 'gastos', label: '💸 Historial de Gastos', count: mov?.numGastos ?? 0 },
            { val: 'cierres', label: '🔒 Cierres de Caja', count: historial.length },
          ].map(t => (
            <button
              key={t.val}
              onClick={() => setTab(t.val)}
              className={`pb-4 text-base font-outfit font-extrabold transition-all relative ${
                tab === t.val ? 'text-tinta border-b-2 border-rosa' : 'text-gris hover:text-tinta'
              }`}
            >
              <span className="flex items-center gap-2">
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    tab === t.val ? 'bg-rosa text-white' : 'bg-linea text-gris'
                  }`}>
                    {t.count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tabla de Ventas (Taller rows, larger text) ── */}
        {tab === 'ventas' && (
          <div className="bg-white rounded-2xl border border-linea shadow-sm overflow-hidden">
            {(!mov || mov.pagos.length === 0) ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4 opacity-30">🧾</p>
                <p className="text-gris text-base font-outfit italic">No hay ventas registradas en el rango seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-linea bg-crema/10">
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Hora</th>
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Folio</th>
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Mesa</th>
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Método</th>
                      <th className="text-right px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Total</th>
                      <th className="text-center px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea/50">
                    {mov.pagos.map(p => (
                      <tr key={p.id} className="hover:bg-crema/20 transition-colors">
                        <td className="px-6 py-5 text-base font-outfit text-tinta">{formatHora(p.registradoEn)}</td>
                        <td className="px-6 py-5 text-base font-outfit font-bold text-tinta">
                          #{String(p.pedidoId).padStart(6, '0')}
                          {p.pedidoNumeroPedido && (
                            <span className="text-[10px] text-gris font-normal block font-outfit leading-none mt-0.5">
                              Pedido #{p.pedidoNumeroPedido}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 font-outfit">
                          <p className="text-base font-semibold text-tinta">Público</p>
                          <p className="text-xs text-gris">Ticket</p>
                        </td>
                        <td className="px-6 py-5 font-outfit">
                          <span className="inline-flex px-3 py-1 rounded border border-linea bg-white text-xs font-bold text-tinta">
                            {p.mesaNombre ?? 'Online'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex px-3 py-1 rounded border text-xs font-bold ${
                            p.medio === 'efectivo'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-blue-200 bg-blue-50 text-blue-600'
                          }`}>
                            {p.medio === 'efectivo' ? 'Efectivo' : 'QR'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-base font-outfit font-bold text-tinta text-right">{Number(p.monto).toFixed(2)}</td>
                        <td className="px-6 py-5 text-center">
                          <button 
                            onClick={() => window.print()} 
                            className="p-2 hover:bg-crema rounded-lg text-lg transition-colors"
                            title="Imprimir copia"
                          >
                            🖨️
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

        {/* ── Tabla de Gastos ── */}
        {tab === 'gastos' && (
          <div className="bg-white rounded-2xl border border-linea shadow-sm overflow-hidden">
            {(!mov || mov.gastos.length === 0) ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4 opacity-30">💸</p>
                <p className="text-gris text-base font-outfit italic">No hay gastos registrados en el rango seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-linea bg-crema/10">
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Hora</th>
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Descripción</th>
                      <th className="text-left px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Vía</th>
                      <th className="text-right px-6 py-5 text-sm font-outfit font-extrabold text-gris uppercase tracking-wider">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea/50">
                    {mov.gastos.map(g => (
                      <tr key={g.id} className="hover:bg-crema/20 transition-colors">
                        <td className="px-6 py-5 text-base font-outfit text-tinta">{formatHora(g.registradoEn)}</td>
                        <td className="px-6 py-5 text-base font-outfit font-medium text-tinta">{g.descripcion}</td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex px-3 py-1 rounded border text-xs font-bold ${
                            g.via === 'efectivo'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-blue-200 bg-blue-50 text-blue-600'
                          }`}>
                            {g.via === 'efectivo' ? 'Efectivo' : 'QR'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-base font-outfit font-bold text-red-500 text-right">−{Number(g.monto).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tabla de Cierres de Caja (Larger details) ── */}
        {tab === 'cierres' && (
          <div className="bg-white rounded-2xl border border-linea shadow-sm overflow-hidden">
            {historial.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4 opacity-30">🔒</p>
                <p className="text-gris text-base font-outfit italic">No hay registros históricos de cajas cerradas aún.</p>
              </div>
            ) : (
              <div className="divide-y divide-linea/60">
                {historial.map(c => {
                  const totalBruto = Number(c.ventasEfectivo) + Number(c.ventasQr)
                  const totalNeto = totalBruto - Number(c.totalGastos)
                  return (
                    <div key={c.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-crema/40 transition-colors animate-fade-up">
                      <div>
                        <p className="font-outfit font-extrabold text-tinta text-lg">
                          Caja del {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gris mt-1.5 font-outfit">
                          <span>🚪 {formatHora(c.horaApertura)} ({c.cajeraAperturaNombre || 'Sin usuario'})</span>
                          <span>🔒 {formatHora(c.horaCierre)} ({c.cajeraCierreNombre || 'Sin usuario'})</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 mt-3">
                          {c.diferenciaEfectivo !== null && (
                            <span className={`text-[11px] px-3 py-1 rounded-md font-outfit font-bold uppercase tracking-wide ${Number(c.diferenciaEfectivo) === 0 ? 'bg-crema text-gris' : Number(c.diferenciaEfectivo) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {Number(c.diferenciaEfectivo) === 0 ? '💵 Efectivo: Cuadrado ✓' : Number(c.diferenciaEfectivo) > 0 ? `💵 Sobrante: +${bs(c.diferenciaEfectivo)}` : `💵 Faltante: ${bs(c.diferenciaEfectivo)}`}
                            </span>
                          )}
                          {c.diferenciaQr !== null && (
                            <span className={`text-[11px] px-3 py-1 rounded-md font-outfit font-bold uppercase tracking-wide ${Number(c.diferenciaQr) === 0 ? 'bg-crema text-gris' : Number(c.diferenciaQr) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {Number(c.diferenciaQr) === 0 ? '📱 QR: Cuadrado ✓' : Number(c.diferenciaQr) > 0 ? `📱 Sobrante: +${bs(c.diferenciaQr)}` : `📱 Faltante: ${bs(c.diferenciaQr)}`}
                            </span>
                          )}
                        </div>
                        {c.observacion && <p className="text-sm text-rosa font-outfit font-medium mt-2.5 italic">📝 "{c.observacion}"</p>}
                      </div>
                      <div className="flex flex-wrap gap-2.5 text-xs font-outfit">
                        <span className="bg-crema text-gris px-3 py-1.5 rounded-full font-bold">Fondo: {bs(c.fondoInicial)}</span>
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-bold">Ef: {bs(c.ventasEfectivo)}</span>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold">QR: {bs(c.ventasQr)}</span>
                        <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-bold">Gastos: {bs(c.totalGastos)}</span>
                        <span className="bg-rosa-niebla text-rosa px-3 py-1.5 rounded-full font-extrabold text-sm">Neto: {bs(totalNeto)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {modal === 'abrir' && <ModalAbrirCaja cajeraId={cajeraId} onClose={() => setModal(null)} onOpened={refetchAll} />}
      {modal === 'gasto' && <ModalGasto cajeraId={cajeraId} onClose={() => setModal(null)} onGuardado={refetchAll} />}
      {modal === 'cerrar' && caja && <ModalCerrarCaja caja={caja} onClose={() => setModal(null)} onCerrado={refetchAll} />}
    </AdminLayout>
  )
}
