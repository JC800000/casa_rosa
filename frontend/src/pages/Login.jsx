import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { LOGIN } from '../graphql/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { setUsuario } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      if (data.login.success) {
        setUsuario(data.login.usuario)
        navigate('/panel')
      } else {
        setError(data.login.mensaje)
      }
    },
    onError: () => setError('Error de conexión. Intentá de nuevo.'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    login({ variables: form })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-pink-700 tracking-tight">Casa Rosa</h1>
          <p className="text-pink-400 mt-1 text-sm">Sistema de gestión</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Usuario
              </label>
              <input
                type="text"
                required
                autoFocus
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition"
                placeholder="nombre de usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white font-medium rounded-lg transition"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
