import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  GET_USUARIOS, GET_ROLES,
  CREAR_USUARIO, ACTUALIZAR_USUARIO, ASIGNAR_ROL, CAMBIAR_PASSWORD,
} from '../../graphql/usuarios'

const refetch = [{ query: GET_USUARIOS }]
const inputCls = 'w-full border border-linea rounded-xl px-4 py-2.5 text-sm font-outfit text-tinta bg-white placeholder:text-gris focus:outline-none focus:border-rosa focus:ring-2 focus:ring-rosa-niebla disabled:bg-crema disabled:text-gris transition-all'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-outfit font-semibold text-gris uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Btns({ onClose, onSubmit, loading, disabled, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onClose} className="flex-1 border border-linea text-gris py-2.5 rounded-xl text-sm font-outfit font-medium hover:bg-crema transition-colors">
        Cancelar
      </button>
      <button onClick={onSubmit} disabled={loading || disabled} className="flex-1 bg-vino hover:bg-rosa disabled:bg-gris text-white py-2.5 rounded-xl text-sm font-outfit font-semibold transition-all shadow-sm hover:shadow-md">
        {loading ? 'Guardando...' : label}
      </button>
    </div>
  )
}

function Modal({ titulo, subtitulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[18px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linea bg-crema/50">
          <div>
            <h3 className="font-fraunces font-semibold text-tinta text-base">{titulo}</h3>
            {subtitulo && <p className="text-[11px] text-gris font-outfit mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gris hover:text-tinta hover:bg-linea transition-colors text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function ModalCrear({ roles, onClose }) {
  const [form, setForm] = useState({ username: '', password: '', email: '', rolId: '' })
  const [crear, { loading }] = useMutation(CREAR_USUARIO, { refetchQueries: refetch, onCompleted: onClose })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = () => {
    if (!form.username || !form.password) return
    crear({ variables: { username: form.username, password: form.password, email: form.email || null, rolId: form.rolId ? parseInt(form.rolId) : null } })
  }
  return (
    <Modal titulo="Crear usuario" onClose={onClose}>
      <div className="space-y-3">

        {/* Vista previa del avatar en vivo */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rosa-niebla to-rosa-claro/50 border border-rosa-claro/50 shadow-inner flex items-center justify-center font-fraunces font-bold text-3xl text-rosa select-none transition-all">
            {form.username ? form.username[0].toUpperCase() : '?'}
          </div>
          <p className="text-[10px] text-gris/70 font-outfit uppercase tracking-wider">Avatar del nuevo usuario</p>
        </div>

        <Field label="Usuario *">
          <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="nombre de usuario" className={inputCls} autoFocus />
        </Field>
        <Field label="Contraseña *">
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="opcional" className={inputCls} />
        </Field>
        <Field label="Rol">
          <select value={form.rolId} onChange={e => set('rolId', e.target.value)} className={inputCls}>
            <option value="">Sin rol</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </Field>
        <Btns onClose={onClose} onSubmit={submit} loading={loading} disabled={!form.username || !form.password} label="Crear usuario" />
      </div>
    </Modal>
  )
}

function ModalEditar({ usuario, roles, onClose }) {
  const [form, setForm] = useState({ username: usuario.username, email: usuario.email ?? '', rolId: usuario.rol?.id ?? '', isActive: usuario.isActive })
  const [nuevaPass, setNuevaPass] = useState('')
  const [tab, setTab] = useState('datos')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [actualizar, { loading: actualizando }] = useMutation(ACTUALIZAR_USUARIO, { refetchQueries: refetch })
  const [asignarRol, { loading: asignando }] = useMutation(ASIGNAR_ROL, { refetchQueries: refetch })
  const [cambiarPass, { loading: cambiando }] = useMutation(CAMBIAR_PASSWORD, { onCompleted: () => { setNuevaPass(''); setTab('datos') } })

  const submitDatos = async () => {
    await actualizar({ variables: { id: parseInt(usuario.id), username: form.username, email: form.email || null, isActive: form.isActive } })
    await asignarRol({ variables: { usuarioId: parseInt(usuario.id), rolId: form.rolId ? parseInt(form.rolId) : null } })
    onClose()
  }
  const submitPass = () => {
    if (!nuevaPass || nuevaPass.length < 6) return
    cambiarPass({ variables: { usuarioId: parseInt(usuario.id), nuevaPassword: nuevaPass } })
  }

  return (
    <Modal titulo={`Editar: ${usuario.username}`} subtitulo={usuario.rolNombre} onClose={onClose}>
      {/* Tabs segmentados */}
      <div className="flex bg-crema rounded-xl p-1 mb-4">
        {['datos', 'password'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-outfit font-semibold transition-all duration-200 ${
              tab === t ? 'bg-white text-tinta shadow-sm' : 'text-gris hover:text-tinta'
            }`}
          >
            {t === 'datos' ? 'Datos' : 'Contraseña'}
          </button>
        ))}
      </div>

      {tab === 'datos' ? (
        <div className="space-y-3">
          <Field label="Usuario">
            <input value={form.username} onChange={e => set('username', e.target.value)} className={inputCls} disabled={usuario.isSuperuser} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="opcional" className={inputCls} disabled={usuario.isSuperuser} />
          </Field>
          <Field label="Rol">
            <select value={form.rolId} onChange={e => set('rolId', e.target.value)} className={inputCls} disabled={usuario.isSuperuser}>
              <option value="">{usuario.isSuperuser ? 'Administrador (superusuario)' : 'Sin rol'}</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </Field>
          {!usuario.isSuperuser && (
            <label className="flex items-center gap-3 cursor-pointer bg-crema/40 px-4 py-3 rounded-xl border border-linea hover:bg-rosa-niebla/40 transition-colors">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 accent-rosa" />
              <div>
                <span className="text-sm text-tinta font-outfit font-medium">Usuario activo</span>
                <p className="text-[11px] text-gris font-outfit">Puede iniciar sesión en el sistema</p>
              </div>
            </label>
          )}
          <Btns onClose={onClose} onSubmit={submitDatos} loading={actualizando || asignando} disabled={!form.username || usuario.isSuperuser} label="Guardar" />
          {usuario.isSuperuser && <p className="text-xs text-gris text-center font-outfit italic">El superusuario no se puede modificar desde aquí</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Nueva contraseña (mín. 6 caracteres)">
            <input type="password" value={nuevaPass} onChange={e => setNuevaPass(e.target.value)} placeholder="••••••••" className={inputCls} autoFocus />
          </Field>
          <Btns onClose={onClose} onSubmit={submitPass} loading={cambiando} disabled={nuevaPass.length < 6} label="Cambiar contraseña" />
        </div>
      )}
    </Modal>
  )
}

export default function Usuarios() {
  const [modal, setModal] = useState(null)
  const { data, loading } = useQuery(GET_USUARIOS)
  const { data: dataRoles } = useQuery(GET_ROLES)
  const usuarios = data?.usuarios ?? []
  const roles = dataRoles?.roles ?? []

  return (
    <AdminLayout titulo="Usuarios">

      {/* ── Barra superior ── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gris font-outfit">
          <span className="font-semibold text-tinta">{usuarios.length}</span> usuario{usuarios.length !== 1 ? 's' : ''}
          <span className="hidden sm:inline text-gris/70"> · acceden al sistema</span>
        </p>
        <button
          onClick={() => setModal('crear')}
          className="flex items-center gap-2 bg-vino hover:bg-rosa text-white font-outfit font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Crear usuario
        </button>
      </div>

      {/* ── Grilla de usuarios ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-[18px] border border-linea overflow-hidden animate-pulse">
              <div className="h-16 bg-crema" />
              <div className="px-5">
                <div className="-mt-7 w-14 h-14 bg-crema rounded-2xl border-4 border-white" />
              </div>
              <div className="px-5 pt-2.5 pb-4 space-y-2">
                <div className="h-4 bg-crema rounded-full w-1/2" />
                <div className="h-3 bg-crema rounded-full w-3/4" />
                <div className="h-3 bg-crema rounded-full w-2/5" />
                <div className="h-px bg-linea !mt-4" />
                <div className="h-9 bg-crema rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-linea animate-fade-up">
          <div className="w-16 h-16 bg-rosa-niebla rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">👥</div>
          <p className="font-fraunces font-semibold text-tinta text-base mb-1">No hay usuarios</p>
          <p className="text-gris text-sm font-outfit mb-6">Creá cuentas para tu equipo: caja, cocina, salón...</p>
          <button
            onClick={() => setModal('crear')}
            className="inline-flex items-center gap-2 bg-rosa hover:bg-rosa-vivo text-white px-5 py-2.5 rounded-xl text-sm font-outfit font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Crear usuario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {usuarios.map((u, i) => (
            <div
              key={u.id}
              className="group bg-white rounded-[18px] shadow-card border border-linea overflow-hidden card-hover animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
            >
              {/* Banda decorativa */}
              <div className={`relative h-16 bg-gradient-to-br overflow-hidden ${
                u.isSuperuser
                  ? 'from-vino via-vino-2 to-rosa/70'
                  : 'from-rosa-niebla via-rosa-niebla/60 to-rosa-claro/50'
              }`}>
                <span className="absolute -top-8 -right-6 w-24 h-24 rounded-full bg-white/25" />
                <span className="absolute top-8 right-16 w-9 h-9 rounded-full bg-white/20" />
                <span className={`absolute top-3 right-3 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-[10px] px-2 py-0.5 rounded-full font-outfit font-bold shadow-sm border border-white/60 uppercase tracking-wide ${
                  u.isActive ? 'text-emerald-600' : 'text-gris'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${u.isActive ? 'bg-emerald-500' : 'bg-gris/60'}`} />
                  {u.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Avatar superpuesto */}
              <div className="px-5">
                <div className={`-mt-7 w-14 h-14 rounded-2xl bg-white shadow-md border border-linea flex items-center justify-center font-fraunces font-bold text-xl select-none transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3 ${
                  u.isSuperuser ? 'text-vino' : 'text-rosa'
                }`}>
                  {u.username[0].toUpperCase()}
                </div>
              </div>

              {/* Cuerpo */}
              <div className="px-5 pt-2.5 pb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="font-fraunces font-semibold text-tinta text-lg leading-tight truncate" title={u.username}>
                    {u.username}
                  </h4>
                  {u.isSuperuser && (
                    <span className="flex-shrink-0 text-[10px] bg-vino/10 text-vino px-2 py-0.5 rounded-full font-outfit font-bold uppercase tracking-wide">
                      👑 Súper
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-1.5">
                  <p className="flex items-center gap-2 text-xs text-gris font-outfit min-w-0">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    <span className="truncate">{u.email || 'Sin email'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-gris font-outfit">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    <span className="bg-crema text-tinta/70 px-2 py-0.5 rounded-full font-outfit font-medium">{u.rolNombre || 'Sin rol'}</span>
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-linea">
                  <button
                    onClick={() => setModal(u)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-outfit font-semibold text-rosa bg-rosa-niebla/70 hover:bg-rosa hover:text-white transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'crear' && <ModalCrear roles={roles} onClose={() => setModal(null)} />}
      {modal && modal !== 'crear' && <ModalEditar usuario={modal} roles={roles} onClose={() => setModal(null)} />}
    </AdminLayout>
  )
}
