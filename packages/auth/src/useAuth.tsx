import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from './authApi'

interface AuthContextType {
  userId: number | null
  email: string | null
  displayName: string | null
  loading: boolean
  logout: () => Promise<void>
  setUserId: (id: number | null) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        setUserId(data.userId)
        setEmail(data.email)
        setDisplayName(data.displayName)
      })
      .catch(() => {
        setUserId(null)
        setEmail(null)
        setDisplayName(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await authApi.logout().catch(() => {})
    setUserId(null)
    setEmail(null)
    setDisplayName(null)
  }

  return (
    <AuthContext.Provider value={{ userId, email, displayName, loading, logout, setUserId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
