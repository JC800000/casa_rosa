import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  GET_ROLES, GET_PERMISOS_DISPONIBLES,
  CREAR_ROL, ACTUALIZAR_ROL, ELIMINAR_ROL, SET_PERMISOS_ROL,
} from '../../graphql/usuarios'

const PERMISO_LABELS = {
  ver_cocina:          { icon: '👨‍🍳', label: 'Ver cocina (KDS)' },
  ver_caja:            { icon: '💰', label: 'Acceder a caja' },
  gestionar_productos: { icon: '🍰', label: 'Gestionar productos' },
  gestionar_mesas:     { icon: '🪑', label: 'Gestionar mesas' },
  gestionar_usuarios:  { icon: '👥', label: 'Gestionar usuarios y roles' },
}

/* Ícono del rol según su nombre, con fallback genérico */
const ROL_ICONOS = [
  [/cajer/i, '💰'],
  [/cocin|chef|reposter|pasteler/i, '👨‍🍳'],
  [/mozo|meser|garzon|garzón|salon|salón/i, '🤵'],
  [/admin|gerent|dueñ|encargad/i, '👑'],
  [/repart|deliver|moto/i, '🛵'],
  [/limpi/i, '🧹'],
]

function getIconoRol(nombre) {
  for (const [re, icono] of ROL_ICONOS) if (re.test(nombre)) return icono
  return '🔑'
}

function ModalRol({ inicial, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const opts = { refetchQueries: [{ query: GET_ROLES }] }
  const [crear, { loading: creando }] = useMutation(CREAR_ROL, { ...opts, onCompleted: (d) => { onGuardado(d.crearRol); onClose() } })
  const [actualizar, { loading: actualizando }] = useMutation(ACTUALIZAR_ROL, { ...opts, onCompleted: () => onClose() })
  const loading = creando || actualizando
  const submit = () => {
    if (!nombre.trim()) return
    if (inicial) actualizar({ variables: { id: parseInt(inicial.id), nombre } })
    else crear({ variables: { nombre } })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[18px] shadow-2xl w-full max-w-sm overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
          <h3 className="font-fraunces font-semibold text-tinta text-base">{inicial ? 'Editar rol' : 'Nuevo rol'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-colors text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* Vista previa del ícono en vivo */}
          <div className="flex flex-col items-center gap-2 pb-1">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rosa-niebla to-rosa-claro/50 border border-rosa-claro/50 shadow-inner flex items-center justify-center text-[40px] leading-none select-none transition-all">
              {getIconoRol(nombre)}
            </div>
            <p className="text-[10px] text-gris/70 font-outfit uppercase tracking-wider">El ícono se elige según el nombre</p>
          </div>

          <div>
            <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">Nombre del rol</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ej: Cajera, Cocinero..."
              className="w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla transition-all"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-linea text-gris py-2.5 rounded-xl text-sm font-outfit font-medium hover:bg-crema transition-colors">Cancelar</button>
            <button onClick={submit} disabled={loading || !nombre.trim()} className="flex-1 bg-vino hover:bg-rosa disabled:bg-gris text-white py-2.5 rounded-xl text-sm font-outfit font-semibold transition-all shadow-sm hover:shadow-md">
              {loading ? 'Guardando...' : inicial ? 'Guardar' : 'Crear rol'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Roles() {
  const [rolSeleccionado, setRolSeleccionado] = useState(null)
  const [permisosActivos, setPermisosActivos] = useState(new Set())
  const [modal, setModal] = useState(null)
  const [notif, setNotif] = useState(null)

  const { data: dataRoles, loading } = useQuery(GET_ROLES, {
    onCompleted: (d) => {
      if (rolSeleccionado) {
        const actualizado = d.roles.find(r => r.id === rolSeleccionado.id)
        if (actualizado) seleccionarRol(actualizado)
      }
    },
  })
  const { data: dataPermisos } = useQuery(GET_PERMISOS_DISPONIBLES)

  const [eliminarRol] = useMutation(ELIMINAR_ROL, {
    refetchQueries: [{ query: GET_ROLES }],
    onCompleted: () => { setRolSeleccionado(null); setPermisosActivos(new Set()) },
  })

  const [setPermisosRol, { loading: guardando }] = useMutation(SET_PERMISOS_ROL, {
    refetchQueries: [{ query: GET_ROLES }],
    onCompleted: () => mostrarNotif('Permisos guardados'),
  })

  const mostrarNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 2500) }

  const seleccionarRol = (rol) => {
    setRolSeleccionado(rol)
    setPermisosActivos(new Set(rol.permisos.map(p => parseInt(p.id))))
  }

  const togglePermiso = (permisoId) => {
    setPermisosActivos(prev => {
      const next = new Set(prev)
      next.has(permisoId) ? next.delete(permisoId) : next.add(permisoId)
      return next
    })
  }

  const guardarPermisos = () => {
    if (!rolSeleccionado) return
    setPermisosRol({ variables: { rolId: parseInt(rolSeleccionado.id), permisoIds: [...permisosActivos] } })
  }

  const roles = dataRoles?.roles ?? []
  const permisos = dataPermisos?.permisosDisponibles ?? []

  return (
    <AdminLayout titulo="Roles y Permisos">
      {/* Toast */}
      {notif && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-outfit font-semibold text-white bg-emerald-500 animate-fade-up">
          <span>✓</span>{notif}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 h-full">

        {/* ── Panel izquierdo: lista de roles ── */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-outfit font-semibold text-gris uppercase tracking-widest">Roles</p>
            <button
              onClick={() => setModal('crear')}
              className="flex items-center gap-1.5 text-xs bg-vino hover:bg-rosa text-white px-3 py-1.5 rounded-lg font-outfit font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nuevo
            </button>
          </div>

          {loading && [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-[18px] border border-linea p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-crema rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-crema rounded-full w-2/3" />
                  <div className="h-2.5 bg-crema rounded-full w-1/3" />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <div className="h-5 bg-crema rounded-full w-20" />
                <div className="h-5 bg-crema rounded-full w-16" />
              </div>
            </div>
          ))}

          {roles.map((rol, i) => {
            const sel = rolSeleccionado?.id === rol.id
            return (
              <div
                key={rol.id}
                onClick={() => seleccionarRol(rol)}
                className={`group bg-white rounded-[18px] p-4 cursor-pointer transition-all duration-200 border-2 animate-fade-up ${
                  sel ? 'border-rosa shadow-card' : 'border-transparent shadow-sm hover:border-rosa-claro hover:shadow-card'
                }`}
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 flex-shrink-0 rounded-2xl border flex items-center justify-center text-xl leading-none select-none transition-all duration-200 ${
                    sel
                      ? 'bg-gradient-to-br from-rosa-niebla to-rosa-claro/60 border-rosa-claro'
                      : 'bg-crema border-linea group-hover:bg-rosa-niebla/50'
                  }`}>
                    {getIconoRol(rol.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-outfit font-semibold text-tinta truncate">{rol.nombre}</p>
                    <p className="text-[11px] text-gris font-outfit">{rol.cantUsuarios} usuario{rol.cantUsuarios !== 1 ? 's' : ''}</p>
                  </div>
                  {sel && (
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-rosa text-white flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {rol.permisos.length === 0 ? (
                    <span className="text-[11px] text-gris/50 font-outfit italic">Sin permisos</span>
                  ) : rol.permisos.map(p => (
                    <span key={p.id} className="text-[10px] bg-rosa-niebla text-rosa px-2 py-0.5 rounded-full font-outfit font-medium">
                      {PERMISO_LABELS[p.codigo]?.icon} {PERMISO_LABELS[p.codigo]?.label ?? p.codigo}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-linea">
                  <button
                    onClick={e => { e.stopPropagation(); setModal(rol) }}
                    className="flex items-center gap-1 text-[11px] text-gris hover:text-rosa font-outfit font-medium transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Editar nombre
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`¿Eliminar el rol "${rol.nombre}"?`)) eliminarRol({ variables: { id: parseInt(rol.id) } })
                    }}
                    className="flex items-center gap-1 text-[11px] text-gris hover:text-red-500 font-outfit font-medium transition-colors ml-auto"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}

          {!loading && roles.length === 0 && (
            <div className="text-center py-10 bg-white rounded-[18px] border-2 border-dashed border-linea">
              <div className="w-12 h-12 bg-rosa-niebla rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🔑</div>
              <p className="text-gris text-sm font-outfit">No hay roles. Creá el primero.</p>
            </div>
          )}
        </div>

        {/* ── Panel derecho: permisos del rol ── */}
        <div className="flex-1 min-w-0">
          {!rolSeleccionado ? (
            <div className="flex flex-col items-center justify-center min-h-72 h-full text-center bg-white rounded-[18px] border-2 border-dashed border-linea p-10 animate-fade-up">
              <div className="w-16 h-16 bg-rosa-niebla rounded-2xl flex items-center justify-center text-3xl mb-4">🔑</div>
              <p className="font-fraunces font-semibold text-tinta text-base mb-1">Elegí un rol</p>
              <p className="text-gris text-sm font-outfit">Seleccioná un rol de la lista para editar sus permisos.</p>
            </div>
          ) : (
            <div key={rolSeleccionado.id} className="bg-white rounded-[18px] border border-linea shadow-card overflow-hidden animate-fade-up">

              {/* Cabecera con banda */}
              <div className="relative bg-gradient-to-br from-rosa-niebla via-rosa-niebla/60 to-rosa-claro/50 px-6 py-5 overflow-hidden">
                <span className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/40" />
                <span className="absolute -bottom-8 left-1/3 w-24 h-24 rounded-full bg-white/25" />
                <div className="relative flex flex-wrap items-center gap-4">
                  <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-white shadow-md border border-linea flex items-center justify-center text-3xl leading-none select-none">
                    {getIconoRol(rolSeleccionado.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-fraunces font-bold text-tinta text-xl truncate">{rolSeleccionado.nombre}</h3>
                    <p className="text-xs text-tinta/60 font-outfit mt-0.5">Elegí qué puede hacer este rol</p>
                  </div>
                  <button
                    onClick={guardarPermisos}
                    disabled={guardando}
                    className="flex items-center gap-2 bg-vino hover:bg-rosa disabled:bg-gris text-white font-outfit font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    {guardando ? 'Guardando...' : 'Guardar permisos'}
                  </button>
                </div>
              </div>

              {/* Switches de permisos */}
              <div className="p-6 space-y-3">
                {permisos.map((p, i) => {
                  const activo = permisosActivos.has(parseInt(p.id))
                  const meta = PERMISO_LABELS[p.codigo]
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 animate-fade-up ${
                        activo ? 'border-rosa bg-rosa-niebla/50' : 'border-linea bg-white hover:border-rosa-claro'
                      }`}
                      style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                    >
                      <span className={`w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl leading-none select-none transition-colors duration-200 ${activo ? 'bg-white shadow-sm' : 'bg-crema'}`}>
                        {meta?.icon ?? '🔧'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-outfit font-semibold transition-colors ${activo ? 'text-rosa' : 'text-tinta'}`}>{meta?.label ?? p.codigo}</p>
                        <p className="text-xs text-gris mt-0.5 font-outfit">{p.descripcion}</p>
                      </div>
                      <input type="checkbox" checked={activo} onChange={() => togglePermiso(parseInt(p.id))} className="sr-only peer" />
                      <span className="relative w-10 h-6 flex-shrink-0 rounded-full bg-linea peer-checked:bg-rosa transition-colors duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-4" />
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ModalRol
          inicial={modal === 'crear' ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={seleccionarRol}
        />
      )}
    </AdminLayout>
  )
}
