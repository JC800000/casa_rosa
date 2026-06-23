import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.svg'

/* ─── Íconos SVG de línea ─── */
const Icon = ({ d, d2, circle, points }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px] flex-shrink-0">
    {d  && <path d={d} />}
    {d2 && <path d={d2} />}
    {circle && <circle cx={circle.cx} cy={circle.cy} r={circle.r} />}
    {points && <polyline points={points} />}
  </svg>
)

const ICONS = {
  dashboard: <Icon d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" d2="M9 21V12h6v9" />,
  pedidos:   <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" />,
  productos: <Icon d="M3 10h18M3 10V6a1 1 0 011-1h16a1 1 0 011 1v4M3 10v9a1 1 0 001 1h16a1 1 0 001-1v-9" d2="M8 4v2M12 4v2M16 4v2" />,
  categorias:<Icon d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" circle={{ cx: 7, cy: 7, r: 1.5 }} />,
  mesas:     <Icon d="M3 8h18M3 8v2h18V8M7 10v8M17 10v8M5 18h14" />,
  cocina:    <Icon d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V20a2 2 0 01-4 0V9.5A4 4 0 0112 2zM8 19h8" />,
  combos:    <Icon d="M20 12v10H4V12" d2="M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />,
  caja:      <Icon d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" d2="M2 10h20M12 14h.01" />,
  reportes:  <Icon d="M18 20V10M12 20V4M6 20v-6" />,
  usuarios:  <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" circle={{ cx: 9, cy: 7, r: 4 }} />,
  roles:     <Icon d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />,
  config:    <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6z" d2="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  logout:    <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
}

/* ─── Grupos de navegación ─── */
const NAV_GRUPOS = [
  {
    titulo: 'RESUMEN',
    items: [
      { to: '/panel',          label: 'Dashboard',   icon: 'dashboard', end: true,  permiso: null },
      { to: '/panel/reportes', label: 'Reportes',    icon: 'reportes',              permiso: 'ver_caja' },
    ],
  },
  {
    titulo: 'OPERACIONES',
    items: [
      { to: '/panel/mesas',   label: 'Punto de Venta', icon: 'mesas',   permiso: 'gestionar_mesas' },
      { to: '/panel/caja',    label: 'Caja',           icon: 'caja',    permiso: 'ver_caja' },
      { to: '/cocina',        label: 'Cocina',         icon: 'cocina',  permiso: 'ver_cocina' },
      { to: '/panel/pedidos', label: 'Pedidos Online', icon: 'pedidos', permiso: 'ver_caja' },
    ],
  },
  {
    titulo: 'CARTA & MENÚ',
    items: [
      { to: '/panel/productos',  label: 'Productos',   icon: 'productos',  permiso: 'gestionar_productos' },
      { to: '/panel/categorias', label: 'Categorías',  icon: 'categorias', permiso: 'gestionar_productos' },
      { to: '/panel/combos',     label: 'Combos',      icon: 'combos',     permiso: 'gestionar_productos' },
    ],
  },
  {
    titulo: 'ADMINISTRACIÓN',
    items: [
      { to: '/panel/usuarios',      label: 'Usuarios',      icon: 'usuarios', permiso: 'gestionar_usuarios' },
      { to: '/panel/roles',         label: 'Roles',         icon: 'roles',    permiso: 'gestionar_usuarios' },
      { to: '/panel/configuracion', label: 'Configuración', icon: 'config',   permiso: 'gestionar_usuarios' },
    ],
  },
]

function tieneAcceso(usuario, permiso) {
  if (!permiso) return true
  if (!usuario) return false
  if (usuario.isSuperuser) return true
  return usuario.permisos?.includes(permiso) ?? false
}

export default function AdminLayout({ children, titulo, headerExtra }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const inicial = usuario?.username?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-crema">

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside
        className="sidebar-bg w-68 flex-shrink-0 flex flex-col overflow-hidden z-20"
      >
        {/* ── Marca ── */}
        <div className="flex items-center gap-3 pt-5 pb-3 px-5 flex-shrink-0">
          <img src={logo} alt="Casa Rosa" className="h-11 object-contain flex-shrink-0" />
          <div>
            <p className="text-white font-outfit font-extrabold text-2xl leading-tight tracking-tight">Casa Rosa</p>
            <p className="text-rosa-claro/50 text-xs font-outfit uppercase tracking-wide">Cafetería · Pastelería</p>
          </div>
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 px-3.5 overflow-y-auto pt-4 pb-4 space-y-6">
          {NAV_GRUPOS.map(grupo => {
            const visibles = grupo.items.filter(item => tieneAcceso(usuario, item.permiso))
            if (visibles.length === 0) return null
            return (
              <div key={grupo.titulo}>
                <p className="text-rosa-claro/40 text-xs font-outfit font-bold uppercase tracking-[0.15em] px-3.5 mb-2.5">
                  {grupo.titulo}
                </p>
                <div className="space-y-1">
                  {visibles.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3.5 px-3.5 py-3 rounded-[14px] text-base font-outfit font-semibold transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-white to-rosa-niebla text-vino shadow-sm'
                            : 'text-white/80 hover:bg-white/10 hover:text-white hover:pl-5',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={isActive ? 'text-rosa' : 'text-white/60'}>
                            {ICONS[item.icon]}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rosa flex-shrink-0" />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* ── Usuario y logout ── */}
        <div className="px-4 pb-6 flex-shrink-0 border-t border-white/10 pt-4 mt-2">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-rosa/20 border border-rosa-claro/20 flex items-center justify-center text-rosa-claro font-outfit font-extrabold text-base flex-shrink-0">
              {inicial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-base font-bold font-outfit truncate leading-tight">{usuario?.username}</p>
              <p className="text-rosa-claro/50 text-xs truncate mt-0.5">
                {usuario?.isSuperuser ? 'Administrador' : (usuario?.rolNombre || 'Sin rol')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 text-base font-outfit font-semibold"
          >
            {ICONS.logout}
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ══════════════ CONTENIDO PRINCIPAL ══════════════ */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header de página */}
        <header className="bg-white border-b border-linea px-8 py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-outfit font-semibold text-rosa uppercase tracking-widest">
                PANEL DE CONTROL
              </p>
              <h2 className="font-fraunces font-semibold text-tinta text-lg leading-tight">{titulo}</h2>
            </div>
            {headerExtra && <div className="flex-shrink-0">{headerExtra}</div>}
          </div>
        </header>

        {/* Área de contenido */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
