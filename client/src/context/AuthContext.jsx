import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('gc_token'))
  const [role, setRole]   = useState(() => localStorage.getItem('gc_role'))
  const [name, setName]   = useState(() => localStorage.getItem('gc_name'))

  const login = (token, role, name) => {
    localStorage.setItem('gc_token', token)
    localStorage.setItem('gc_role', role)
    localStorage.setItem('gc_name', name || '')
    setToken(token)
    setRole(role)
    setName(name || '')
  }

  const logout = () => {
    localStorage.removeItem('gc_token')
    localStorage.removeItem('gc_role')
    localStorage.removeItem('gc_name')
    setToken(null)
    setRole(null)
    setName(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, name, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
