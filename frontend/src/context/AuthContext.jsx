import { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { ME, LOGOUT } from '../graphql/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)

  const { data, loading, refetch } = useQuery(ME, {
    fetchPolicy: 'network-only',
  })

  useEffect(() => {
    if (data) {
      setUsuario(data.me)
    }
  }, [data])

  const [logoutMutation] = useMutation(LOGOUT, {
    onCompleted: () => {
      setUsuario(null)
      refetch()
    },
  })

  const logout = () => logoutMutation()

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
