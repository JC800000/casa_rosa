import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import MenuMesa from './pages/MenuMesa'
import Online from './pages/Online'
import Inicio from './pages/Inicio'
import Dashboard from './pages/admin/Dashboard'
import Categorias from './pages/admin/Categorias'
import Productos from './pages/admin/Productos'
import Mesas from './pages/admin/Mesas'
import KDS from './pages/admin/KDS'
import Caja from './pages/admin/Caja'
import Roles from './pages/admin/Roles'
import Usuarios from './pages/admin/Usuarios'
import Pedidos from './pages/admin/Pedidos'
import Combos from './pages/admin/Combos'
import Reportes from './pages/admin/Reportes'
import Configuracion from './pages/admin/Configuracion'


function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <p className="text-pink-400">Cargando...</p>
    </div>
  )
  return usuario ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return null
  return usuario ? <Navigate to="/panel" replace /> : children
}

function PermisoRoute({ codigo, children }) {
  const { usuario, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <p className="text-pink-400">Cargando...</p>
    </div>
  )
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.isSuperuser || usuario.permisos?.includes(codigo)) return children
  return <Navigate to="/panel" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/"           element={<Inicio />} />
        <Route path="/login"      element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/mesa/:id"   element={<MenuMesa />} />
        <Route path="/online"     element={<Online />} />


        {/* Rutas con permiso específico */}
        <Route path="/cocina"             element={<PermisoRoute codigo="ver_cocina"><KDS /></PermisoRoute>} />
        <Route path="/panel/caja"         element={<PermisoRoute codigo="ver_caja"><Caja /></PermisoRoute>} />
        <Route path="/panel/pedidos"      element={<PermisoRoute codigo="ver_caja"><Pedidos /></PermisoRoute>} />
        <Route path="/panel/productos"    element={<PermisoRoute codigo="gestionar_productos"><Productos /></PermisoRoute>} />
        <Route path="/panel/categorias"   element={<PermisoRoute codigo="gestionar_productos"><Categorias /></PermisoRoute>} />
        <Route path="/panel/mesas"        element={<PermisoRoute codigo="gestionar_mesas"><Mesas /></PermisoRoute>} />
        <Route path="/panel/roles"        element={<PermisoRoute codigo="gestionar_usuarios"><Roles /></PermisoRoute>} />
        <Route path="/panel/usuarios"     element={<PermisoRoute codigo="gestionar_usuarios"><Usuarios /></PermisoRoute>} />
        <Route path="/panel/combos"       element={<PermisoRoute codigo="gestionar_productos"><Combos /></PermisoRoute>} />
        <Route path="/panel/reportes"      element={<PermisoRoute codigo="ver_caja"><Reportes /></PermisoRoute>} />
        <Route path="/panel/configuracion" element={<PermisoRoute codigo="gestionar_usuarios"><Configuracion /></PermisoRoute>} />


        {/* Dashboard: cualquier usuario autenticado */}
        <Route path="/panel" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    </AuthProvider>
  )
}
