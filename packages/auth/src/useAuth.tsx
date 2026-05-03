import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from './authApi'

interface AuthContextType {
  userId: number | null
  loading: boolean
  logout: () => Promise<void>
  setUserId: (id: number | null) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi
      .me()
      .then((data) => setUserId(data.userId))
      .catch(() => setUserId(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await authApi.logout().catch(() => {})
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ userId, loading, logout, setUserId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
