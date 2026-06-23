import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  GET_COMBOS, CREAR_COMBO, ACTUALIZAR_COMBO, ELIMINAR_COMBO,
} from '../../graphql/combos'
import { GET_PRODUCTOS } from '../../graphql/productos'

const FORM_VACIO = { nombre: '', precio: '', activo: true, fechaInicio: '', fechaFin: '', productosIds: [] }

const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'
const inputDate = 'w-full border border-linea rounded-xl px-3 py-2.5 text-sm font-outfit text-tinta bg-white focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

function vigencia(combo) {
  const hoy = new Date().toLocaleDateString('sv')
  if (!combo.activo) return { label: 'Inactivo', cls: 'bg-crema text-gris border-linea' }
  if (combo.fechaInicio && combo.fechaInicio > hoy) return { label: 'Programado', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
  if (combo.fechaFin && combo.fechaFin < hoy) return { label: 'Vencido', cls: 'bg-red-50 text-red-600 border-red-200' }
  return { label: 'Vigente', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

export default function Combos() {
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [busqueda, setBusqueda] = useState('')
  const [notif, setNotif] = useState(null)
  const [archivoFoto, setArchivoFoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const { data, loading } = useQuery(GET_COMBOS)
  const { data: dataProds } = useQuery(GET_PRODUCTOS)
  const opts = { refetchQueries: [{ query: GET_COMBOS }] }

  const [crear, { loading: creando }] = useMutation(CREAR_COMBO, {
    ...opts,
    onCompleted: () => { cerrarModal(); notificar('Combo creado', 'ok') },
    onError: (e) => notificar(e.message, 'err'),
  })
  const [actualizar, { loading: actualizando }] = useMutation(ACTUALIZAR_COMBO, {
    ...opts,
    onCompleted: () => { cerrarModal(); notificar('Combo actualizado', 'ok') },
    onError: (e) => notificar(e.message, 'err'),
  })
  const [eliminar] = useMutation(ELIMINAR_COMBO, {
    ...opts,
    onCompleted: () => notificar('Combo desactivado', 'ok'),
  })

  const notificar = (msg, tipo) => { setNotif({ msg, tipo }); setTimeout(() => setNotif(null), 3000) }

  const abrirNuevo = () => { setEditando(null); setForm(FORM_VACIO); setArchivoFoto(null); setPreviewUrl(''); setShowModal(true) }
  const abrirEditar = (c) => {
    setEditando(c)
    setForm({ nombre: c.nombre, precio: c.precio, activo: c.activo, fechaInicio: c.fechaInicio || '', fechaFin: c.fechaFin || '', productosIds: c.productos.map(p => p.id) })
    setArchivoFoto(null)
    setPreviewUrl(c.fotoUrl || '')
    setShowModal(true)
  }
  const cerrarModal = () => { setShowModal(false); setArchivoFoto(null); setPreviewUrl('') }

  const toggleProducto = (id) => {
    setForm(prev => {
      const ids = prev.productosIds.includes(id) ? prev.productosIds.filter(x => x !== id) : [...prev.productosIds, id]
      return { ...prev, productosIds: ids }
    })
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivoFoto(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.precio) return notificar('Nombre y precio son obligatorios', 'err')
    let fotoPath = undefined
    if (archivoFoto) {
      try {
        const fd = new FormData()
        fd.append('foto', archivoFoto)
        const res = await fetch('/api/upload-foto/', { method: 'POST', body: fd })
        if (!res.ok) { notificar('Error al subir foto', 'err'); return }
        const d = await res.json()
        fotoPath = d.fotoPath
      } catch { notificar('Error de conexión al subir foto', 'err'); return }
    }
    const vars = {
      nombre: form.nombre, precio: parseFloat(form.precio), productosIds: form.productosIds.map(Number), activo: form.activo,
      fechaInicio: editando ? (form.fechaInicio || '') : (form.fechaInicio || null),
      fechaFin: editando ? (form.fechaFin || '') : (form.fechaFin || null),
      fotoPath,
    }
    if (editando) actualizar({ variables: { id: parseInt(editando.id), ...vars } })
    else crear({ variables: vars })
  }

  const combos = (data?.combos ?? []).filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  const productos = dataProds?.productos ?? []
  const guardando = creando || actualizando

  return (
    <AdminLayout titulo="Combos y Promociones">
      {notif && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-medium text-white ${notif.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <span>{notif.tipo === 'ok' ? '✓' : '✕'}</span>{notif.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar combo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className={inputCls + ' flex-1'}
        />
        <button onClick={abrirNuevo} className="bg-vino hover:bg-rosa text-white text-sm font-outfit font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm whitespace-nowrap">
          + Nuevo combo
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gris py-12 font-outfit animate-pulse">Cargando combos...</p>
      ) : combos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[18px] border-2 border-dashed border-linea">
          <p className="text-5xl mb-3">🎁</p>
          <p className="text-gris font-outfit italic text-sm">No hay combos todavía. ¡Creá el primero!</p>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] shadow-card border border-linea overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-linea">
              <tr>
                {['Foto', 'Nombre', 'Precio', 'Productos', 'Vigencia', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-linea/60">
              {combos.map(c => {
                const v = vigencia(c)
                return (
                  <tr key={c.id} className="hover:bg-crema/60 transition-colors">
                    <td className="px-5 py-3">
                      {c.fotoUrl
                        ? <img src={c.fotoUrl} alt={c.nombre} className="w-12 h-12 rounded-xl object-cover border border-linea" />
                        : <div className="w-12 h-12 rounded-xl bg-rosa-niebla border border-linea flex items-center justify-center text-xl">🎁</div>
                      }
                    </td>
                    <td className="px-5 py-3 font-outfit font-semibold text-tinta">{c.nombre}</td>
                    <td className="px-5 py-3 font-fraunces font-bold text-rosa">Bs {Number(c.precio).toFixed(2)}</td>
                    <td className="px-5 py-3 text-gris max-w-[180px] font-outfit">
                      <span className="truncate block text-xs">{c.productos.map(p => p.nombre).join(', ') || '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-outfit font-medium border ${v.cls}`}>{v.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-outfit font-medium border ${c.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-crema text-gris border-linea'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(c)} className="text-xs text-rosa hover:text-rosa-vivo font-outfit font-medium transition-colors">Editar</button>
                        <button onClick={() => confirm(`¿Desactivar "${c.nombre}"?`) && eliminar({ variables: { id: parseInt(c.id) } })} className="text-xs text-gris hover:text-red-600 font-outfit font-medium transition-colors">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
              <h3 className="font-fraunces font-semibold text-tinta text-base">{editando ? 'Editar combo' : 'Nuevo combo'}</h3>
              <button onClick={cerrarModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-colors text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Foto */}
              <div className="bg-crema/60 p-4 rounded-xl border border-linea">
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-2">Foto del combo</label>
                {previewUrl && <img src={previewUrl} alt="preview" className="w-full h-40 object-cover rounded-xl mb-3 border border-linea" />}
                <input type="file" accept="image/*" onChange={handleFoto} className="text-sm text-gris font-outfit file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-rosa-niebla file:text-rosa hover:file:bg-rosa-claro file:font-outfit file:font-medium" />
              </div>

              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={inputCls} placeholder="Ej: Combo Desayuno Rosa" required />
              </div>

              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Precio (Bs) *</label>
                <input type="number" step="0.5" min="0" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} className={inputCls} placeholder="0.00" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Fecha inicio</label>
                  <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className={inputDate} />
                </div>
                <div>
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Fecha fin</label>
                  <input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} className={inputDate} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input id="activo" type="checkbox" checked={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} className="accent-rosa" />
                <span className="text-sm text-tinta font-outfit">Combo activo</span>
              </label>

              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-2">
                  Productos incluidos <span className="normal-case font-normal text-gris/60">({form.productosIds.length} seleccionados)</span>
                </label>
                <div className="border border-linea rounded-xl p-3 max-h-52 overflow-y-auto space-y-1">
                  {productos.length === 0 ? (
                    <p className="text-xs text-gris text-center py-2 font-outfit italic">No hay productos disponibles</p>
                  ) : productos.map(p => (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-rosa-niebla rounded-lg px-2.5 py-1.5 transition-colors">
                      <input type="checkbox" checked={form.productosIds.includes(p.id)} onChange={() => toggleProducto(p.id)} className="accent-rosa" />
                      <span className="text-sm text-tinta font-outfit flex-1">{p.nombre}</span>
                      <span className="text-xs text-gris font-outfit">Bs {Number(p.precio).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal} className="flex-1 py-2.5 border border-linea rounded-xl text-sm text-gris font-outfit hover:bg-crema transition-colors">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-vino hover:bg-rosa disabled:bg-gris text-white font-outfit font-semibold rounded-xl text-sm transition-colors shadow-sm">
                  {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
