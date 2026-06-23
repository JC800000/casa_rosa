import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  GET_PRODUCTOS, GET_CATEGORIAS,
  CREAR_PRODUCTO, ACTUALIZAR_PRODUCTO, TOGGLE_DISPONIBLE, ELIMINAR_PRODUCTO,
} from '../../graphql/productos'

const FORM_VACIO = { nombre: '', descripcion: '', precio: '', categoriaId: '', disponible: true }
const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all'

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
  const key = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return CAT_EMOJIS[key] ?? '🍽️'
}

export default function Productos() {
  const [showModal, setShowModal]           = useState(false)
  const [editando, setEditando]             = useState(null)
  const [form, setForm]                     = useState(FORM_VACIO)
  const [notif, setNotif]                   = useState(null)
  const [archivoFoto, setArchivoFoto]       = useState(null)
  const [previewUrl, setPreviewUrl]         = useState('')
  const [quitarFotoActiva, setQuitarFotoActiva] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro]   = useState(null)
  const [busqueda, setBusqueda]             = useState('')

  const { data, loading } = useQuery(GET_PRODUCTOS)
  const { data: dataCat }  = useQuery(GET_CATEGORIAS)
  const opts = { refetchQueries: [{ query: GET_PRODUCTOS }] }

  const [crear,    { loading: creando }]    = useMutation(CREAR_PRODUCTO,    { ...opts, onCompleted: () => { cerrarModal(); mostrarNotif('Producto creado', 'ok') } })
  const [actualizar, { loading: actualizando }] = useMutation(ACTUALIZAR_PRODUCTO, { ...opts, onCompleted: () => { cerrarModal(); mostrarNotif('Producto actualizado', 'ok') } })
  const [toggleDisp] = useMutation(TOGGLE_DISPONIBLE, { ...opts })
  const [eliminar]   = useMutation(ELIMINAR_PRODUCTO,  { ...opts, onCompleted: () => mostrarNotif('Producto eliminado', 'ok') })

  const mostrarNotif = (msg, tipo) => { setNotif({ msg, tipo }); setTimeout(() => setNotif(null), 3000) }

  const abrirNuevo = () => {
    setEditando(null); setForm(FORM_VACIO); setArchivoFoto(null); setPreviewUrl(''); setQuitarFotoActiva(false); setShowModal(true)
  }
  const abrirEditar = (p) => {
    setEditando(p)
    setForm({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, categoriaId: p.categoria.id, disponible: p.disponible })
    setArchivoFoto(null); setPreviewUrl(p.fotoUrl || ''); setQuitarFotoActiva(false); setShowModal(true)
  }
  const cerrarModal = () => { setShowModal(false); setArchivoFoto(null); setPreviewUrl(''); setQuitarFotoActiva(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let fotoPath = undefined
    if (quitarFotoActiva) fotoPath = ''
    if (archivoFoto) {
      try {
        const fd = new FormData(); fd.append('foto', archivoFoto)
        const res = await fetch('/api/upload-foto/', { method: 'POST', body: fd })
        if (!res.ok) { const err = await res.json(); mostrarNotif(err.error || 'Error al subir foto', 'err'); return }
        fotoPath = (await res.json()).fotoPath
      } catch { mostrarNotif('Error de conexión al subir foto', 'err'); return }
    }
    const vars = { nombre: form.nombre, descripcion: form.descripcion, precio: parseFloat(form.precio), categoriaId: parseInt(form.categoriaId), disponible: form.disponible, fotoPath }
    if (editando) actualizar({ variables: { id: parseInt(editando.id), ...vars } })
    else          crear({ variables: vars })
  }

  const handleEliminar = (p) => { if (confirm(`¿Eliminar "${p.nombre}"?`)) eliminar({ variables: { id: parseInt(p.id) } }) }

  const guardando  = creando || actualizando
  const categorias = dataCat?.categorias ?? []
  const productosFiltrados = (data?.productos ?? []).filter(p =>
    (categoriaFiltro === null || p.categoria.id === categoriaFiltro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  /* ── Search bar para el header ── */
  const searchBar = (
    <div className="relative w-64">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gris/60 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="text"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full pl-10 pr-8 py-2 border border-linea rounded-xl text-sm font-outfit text-tinta bg-crema/60 placeholder:text-gris/60 focus:outline-none focus:border-rosa focus:bg-white focus:ring-2 focus:ring-rosa-niebla transition-all"
      />
      {busqueda && (
        <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris hover:text-tinta transition-colors text-lg leading-none">×</button>
      )}
    </div>
  )

  return (
    <AdminLayout titulo="Productos" headerExtra={searchBar}>

      {/* Toast */}
      {notif && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-semibold text-white animate-fade-up ${notif.tipo === 'ok' ? 'bg-[#1E8E52]' : 'bg-red-500'}`}>
          <span>{notif.tipo === 'ok' ? '✓' : '✕'}</span>{notif.msg}
        </div>
      )}

      {/* ── Barra superior ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-gris text-sm font-outfit">
            {busqueda || categoriaFiltro
              ? <><span className="font-semibold text-tinta">{productosFiltrados.length}</span> resultado{productosFiltrados.length !== 1 ? 's' : ''}</>
              : <><span className="font-semibold text-tinta">{data?.productos?.length ?? 0}</span> productos</>
            }
          </span>
          {(busqueda || categoriaFiltro) && (
            <button onClick={() => { setBusqueda(''); setCategoriaFiltro(null) }} className="text-xs text-rosa hover:text-rosa-vivo font-outfit font-semibold underline underline-offset-2 transition-colors">
              Limpiar filtros
            </button>
          )}
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 bg-vino hover:bg-rosa text-white px-5 py-2.5 rounded-xl text-sm font-outfit font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nuevo producto
        </button>
      </div>

      {/* ── Filtro por categorías horizontal ── */}
      {categorias.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 mb-7" style={{ scrollbarWidth: 'none' }}>
          {/* Todos */}
          <button
            onClick={() => setCategoriaFiltro(null)}
            className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-28 h-16 rounded-2xl border transition-all duration-200 ${
              categoriaFiltro === null
                ? 'bg-vino border-vino shadow-md'
                : 'bg-white border-linea hover:border-rosa/40 hover:shadow-sm'
            }`}
          >
            <span className="text-2xl leading-none">🍽️</span>
            <span className={`text-[10px] font-outfit font-semibold leading-none ${categoriaFiltro === null ? 'text-white' : 'text-gris'}`}>
              Todos
            </span>
          </button>

          {categorias.map(cat => {
            const activa = categoriaFiltro === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(activa ? null : cat.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-28 h-16 rounded-2xl border transition-all duration-200 ${
                  activa
                    ? 'bg-rosa border-rosa shadow-md'
                    : 'bg-white border-linea hover:border-rosa/40 hover:shadow-sm'
                }`}
              >
                <span className="text-2xl leading-none">{getEmojiCat(cat.nombre)}</span>
                <span className={`text-[10px] font-outfit font-semibold leading-none text-center px-1 truncate w-full ${activa ? 'text-white' : 'text-gris'}`}>
                  {cat.nombre}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Grid de productos ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-linea overflow-hidden animate-pulse">
              <div className="h-36 bg-crema/50" />
              <div className="p-3.5 space-y-2.5">
                <div className="h-4 bg-crema/70 rounded-full w-3/4" />
                <div className="h-3 bg-crema/50 rounded-full w-1/2" />
                <div className="h-px bg-linea mt-3" />
                <div className="flex justify-between pt-1">
                  <div className="h-5 bg-crema/60 rounded-full w-16" />
                  <div className="h-4 bg-crema/60 rounded-full w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-linea shadow-sm max-w-md mx-auto my-4 animate-fade-up">
          <div className="w-12 h-12 bg-crema rounded-xl flex items-center justify-center text-gris/40 mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="font-fraunces font-semibold text-tinta text-base mb-1">
            {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos aquí'}
          </p>
          <p className="text-gris text-xs font-outfit">
            {busqueda || categoriaFiltro ? 'Probá con otro término de búsqueda o categoría.' : 'Primero creá una categoría y luego agregá productos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-up">
          {productosFiltrados.map(p => (
            <div key={p.id} className="bg-white rounded-[18px] shadow-sm border border-linea overflow-hidden flex flex-col card-hover">

              {/* Imagen del Producto */}
              <div className="relative h-36 bg-rosa-niebla/20 overflow-hidden flex-shrink-0 flex items-center justify-center border-b border-linea/40">
                {p.fotoUrl ? (
                  <img src={p.fotoUrl} alt={p.nombre} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex items-center justify-center text-gris/25">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
                      <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
                    </svg>
                  </div>
                )}
                <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-rosa text-[9px] px-2 py-0.5 rounded-full font-outfit font-bold shadow-sm border border-rosa-claro/50 uppercase tracking-wide">
                  {p.categoria.nombre}
                </span>
              </div>

              {/* Detalle / Información del Producto */}
              <div className="p-3.5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h4 className="font-outfit font-bold text-tinta text-[13px] leading-snug line-clamp-1" title={p.nombre}>{p.nombre}</h4>
                  <button
                    onClick={() => toggleDisp({ variables: { productoId: parseInt(p.id) } })}
                    className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-outfit font-semibold border transition-all duration-150 ${
                      p.disponible
                        ? 'bg-emerald-50 text-emerald-650 border-emerald-200 hover:bg-emerald-100/70'
                        : 'bg-crema text-gris border-linea hover:border-gris'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.disponible ? 'bg-emerald-500' : 'bg-gris/50'}`} />
                    {p.disponible ? 'Disponible' : 'Oculto'}
                  </button>
                </div>
                {p.descripcion && (
                  <p className="text-[11px] text-gris line-clamp-2 font-outfit font-medium mb-3 leading-relaxed">{p.descripcion}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-linea/60">
                  <span className="font-fraunces font-bold text-tinta text-[15px]">Bs {Number(p.precio ?? 0).toFixed(2)}</span>
                  <div className="flex gap-2.5">
                    <button onClick={() => abrirEditar(p)} className="text-[11px] text-rosa hover:text-rosa-vivo font-outfit font-bold transition-colors">Editar</button>
                    <button onClick={() => handleEliminar(p)} className="text-[11px] text-gris hover:text-red-500 font-outfit font-bold transition-colors">Eliminar</button>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Modal de Producto ── */}
      {showModal && (
        <div className="fixed inset-0 bg-tinta/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
              <div>
                <h3 className="font-fraunces font-semibold text-tinta text-base">
                  {editando ? 'Editar producto' : 'Nuevo producto'}
                </h3>
                {editando && <p className="text-[11px] text-gris font-outfit mt-0.5">{editando.nombre}</p>}
              </div>
              <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-colors text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Nombre</label>
                <input type="text" required autoFocus value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inputCls} placeholder="Ej: Café americano" />
              </div>
              <div>
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className={inputCls + ' resize-none'} placeholder="Descripción opcional" />
              </div>

              {/* Carga de Foto */}
              <div className="bg-crema/40 p-4 rounded-xl border border-linea">
                <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-3">Foto del producto</label>
                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-linea bg-white flex-shrink-0">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                      <button type="button" onClick={() => { setPreviewUrl(''); setArchivoFoto(null); setQuitarFotoActiva(true) }}
                        className="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold shadow">×</button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-linea flex flex-col items-center justify-center text-gris/30 bg-white flex-shrink-0 gap-1">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span className="text-[9px] font-outfit">Sin foto</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input type="file" accept="image/*" id="foto-file-input" className="hidden" onChange={e => { const file = e.target.files[0]; if (file) { setArchivoFoto(file); setPreviewUrl(URL.createObjectURL(file)); setQuitarFotoActiva(false) } }} />
                    <label htmlFor="foto-file-input" className="cursor-pointer inline-flex items-center gap-2 text-xs bg-white border border-linea hover:border-rosa hover:text-rosa px-3 py-2 rounded-xl font-outfit font-semibold transition-all shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                      {previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
                    </label>
                    <p className="text-[10px] text-gris mt-2 font-outfit">JPG, PNG · Recomendado cuadrada</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Precio (Bs)</label>
                  <input type="number" required min="0" step="0.5" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Categoría</label>
                  <select required value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))} className={inputCls}>
                    <option value="">Elegir...</option>
                    {dataCat?.categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-crema/45 px-4 py-3 rounded-xl border border-linea hover:bg-rosa-niebla/40 transition-colors">
                <input type="checkbox" checked={form.disponible} onChange={e => setForm(f => ({ ...f, disponible: e.target.checked }))} className="w-4 h-4 accent-rosa" />
                <div>
                  <span className="text-sm text-tinta font-outfit font-medium">Disponible en el menú</span>
                  <p className="text-[11px] text-gris font-outfit">Los clientes podrán verlo y pedirlo</p>
                </div>
              </label>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={cerrarModal} className="flex-1 py-2.5 border border-linea rounded-xl text-gris hover:bg-crema font-outfit text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-vino hover:bg-rosa disabled:bg-gris text-white rounded-xl font-outfit font-semibold text-sm transition-all shadow-sm hover:shadow-md">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
