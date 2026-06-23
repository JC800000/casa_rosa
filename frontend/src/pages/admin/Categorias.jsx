import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  GET_CATEGORIAS, GET_PRODUCTOS, CREAR_CATEGORIA, ACTUALIZAR_CATEGORIA, ELIMINAR_CATEGORIA,
} from '../../graphql/productos'

const FORM_VACIO = { nombre: '', orden: 0 }
const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

export default function Categorias() {
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [notif, setNotif] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const { data, loading } = useQuery(GET_CATEGORIAS)
  const { data: dataProd } = useQuery(GET_PRODUCTOS)
  const opts = { refetchQueries: [{ query: GET_CATEGORIAS }] }

  const [crear, { loading: creando }] = useMutation(CREAR_CATEGORIA, { ...opts, onCompleted: () => { cerrarModal(); mostrarNotif('Categoría creada', 'ok') } })
  const [actualizar, { loading: actualizando }] = useMutation(ACTUALIZAR_CATEGORIA, { ...opts, onCompleted: () => { cerrarModal(); mostrarNotif('Categoría actualizada', 'ok') } })
  const [eliminar] = useMutation(ELIMINAR_CATEGORIA, { ...opts, onCompleted: () => mostrarNotif('Categoría eliminada', 'ok'), onError: (err) => mostrarNotif(err.message, 'error') })

  const mostrarNotif = (msg, tipo) => { setNotif({ msg, tipo }); setTimeout(() => setNotif(null), 3000) }
  const abrirNueva = () => { setEditando(null); setForm(FORM_VACIO); setShowModal(true) }
  const abrirEditar = (cat) => { setEditando(cat); setForm({ nombre: cat.nombre, orden: cat.orden }); setShowModal(true) }
  const cerrarModal = () => setShowModal(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const vars = { nombre: form.nombre, orden: Number(form.orden) }
    if (editando) actualizar({ variables: { id: Number(editando.id), ...vars } })
    else          crear({ variables: vars })
  }

  const handleEliminar = (cat) => {
    if (confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) eliminar({ variables: { id: Number(cat.id) } })
  }

  const guardando = creando || actualizando

  const categorias = [...(data?.categorias ?? [])].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  
  const conteoPorCat = {}
  for (const p of dataProd?.productos ?? []) {
    conteoPorCat[p.categoria.id] = (conteoPorCat[p.categoria.id] ?? 0) + 1
  }

  // Filtrar categorías en tiempo real según la búsqueda
  const categoriasFiltradas = categorias.filter(cat =>
    cat.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <AdminLayout titulo="Gestión de Categorías">

      {/* Notificaciones flotantes */}
      {notif && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-semibold text-white animate-fade-up ${notif.tipo === 'ok' ? 'bg-[#1E8E52]' : 'bg-red-500'}`}>
          <span>{notif.tipo === 'ok' ? '✓' : '✕'}</span>{notif.msg}
        </div>
      )}

      {/* ── Barra superior principal ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-gris text-sm font-outfit mt-0.5">
            Configurá las secciones de tu menú y su orden de aparición.
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center justify-center gap-2 bg-vino hover:bg-rosa text-white px-5 py-2.5 rounded-xl text-sm font-outfit font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva categoría
        </button>
      </div>

      {/* ── Contenedor principal de la tabla ── */}
      <div className="bg-white rounded-[20px] border border-linea shadow-card overflow-hidden">
        
        {/* Barra de control y búsqueda interna */}
        <div className="p-4 border-b border-linea/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-crema/10">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gris/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full pl-9 pr-4 py-2 border border-linea rounded-xl text-xs font-outfit text-tinta bg-white placeholder:text-gris/70 focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-outfit text-gris font-medium">
            {busqueda ? (
              <span>Encontradas: {categoriasFiltradas.length} de {categorias.length}</span>
            ) : (
              <span>Total: {categorias.length} categorías</span>
            )}
          </div>
        </div>

        {/* ── Tabla de categorías ── */}
        {loading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-crema/20 border-b border-linea" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-6 border-b border-linea/45">
                <div className="space-y-2 w-1/3">
                  <div className="h-4 bg-crema/70 rounded-full w-2/3" />
                  <div className="h-3 bg-crema/50 rounded-full w-1/3" />
                </div>
                <div className="h-4 bg-crema/60 rounded-full w-12" />
                <div className="h-6 bg-crema/60 rounded-md w-16" />
                <div className="flex gap-2">
                  <div className="h-8 bg-crema/60 rounded-lg w-8" />
                  <div className="h-8 bg-crema/60 rounded-lg w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-crema rounded-xl flex items-center justify-center text-xl text-gris/60 mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="font-fraunces font-semibold text-tinta text-sm mb-0.5">No se encontraron categorías</p>
            <p className="text-gris text-xs font-outfit">Intenta buscar con otros términos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-crema/10 border-b border-linea text-[11px] font-outfit font-extrabold text-gris/70 uppercase tracking-[0.08em]">
                  <th className="px-6 py-4 w-[50%]">Nombre</th>
                  <th className="px-6 py-4 w-[20%]">Orden en menú</th>
                  <th className="px-6 py-4 w-[15%]">Estado</th>
                  <th className="px-6 py-4 w-[15%] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea/50">
                {categoriasFiltradas.map((cat) => {
                  const nProductos = conteoPorCat[cat.id] ?? 0
                  const iniciales = cat.nombre.substring(0, 2).toUpperCase()
                  
                  return (
                    <tr key={cat.id} className="hover:bg-crema/15 transition-colors duration-150">
                      
                      {/* Nombre y productos asociados */}
                      <td className="px-6 py-4.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-vino/5 text-vino flex items-center justify-center font-outfit font-extrabold text-[11px] select-none tracking-tighter">
                            {iniciales}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-outfit font-bold text-tinta text-[13px] tracking-wide uppercase">
                              {cat.nombre}
                            </span>
                            <span className="text-[10px] text-gris font-outfit mt-0.5 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3 text-gris/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              {nProductos} producto{nProductos !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Orden de prioridad en menú */}
                      <td className="px-6 py-4.5 align-middle">
                        <span className="inline-flex items-center gap-1 bg-crema/60 border border-linea/80 text-tinta text-xs font-outfit font-bold px-2.5 py-1 rounded-lg">
                          <span className="text-rosa">#</span>{cat.orden}
                        </span>
                      </td>

                      {/* Estado activo con indicador pulsante */}
                      <td className="px-6 py-4.5 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-outfit font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Activo
                        </span>
                      </td>

                      {/* Acciones de edición y borrado */}
                      <td className="px-6 py-4.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEditar(cat)}
                            title="Editar categoría"
                            className="w-8.5 h-8.5 flex items-center justify-center rounded-lg text-gris hover:text-vino hover:bg-rosa-niebla/40 transition-all duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEliminar(cat)}
                            title="Eliminar categoría"
                            className="w-8.5 h-8.5 flex items-center justify-center rounded-lg text-red-400 hover:text-red-650 hover:bg-red-50 transition-all duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Creación/Edición ── */}
      {showModal && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/25">
              <div>
                <h3 className="font-fraunces font-semibold text-tinta text-base">{editando ? 'Editar categoría' : 'Nueva categoría'}</h3>
                {editando && <p className="text-[11px] text-gris font-outfit mt-0.5">{editando.nombre}</p>}
              </div>
              <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-colors text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Nombre</label>
                <input type="text" required autoFocus value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inputCls} placeholder="Ej: Cafés, Pastelería..." />
              </div>

              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Orden en el menú</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={0} value={form.orden} onChange={e => setForm(f => ({ ...f, orden: e.target.value }))} className={inputCls + ' max-w-[110px]'} />
                  <p className="text-[11px] text-gris font-outfit leading-snug">El número más bajo aparece primero en el menú del cliente.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal} className="flex-1 py-2.5 border border-linea rounded-xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-vino hover:bg-rosa disabled:bg-gris text-white rounded-xl font-outfit font-semibold text-sm transition-all shadow-sm hover:shadow-md">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
