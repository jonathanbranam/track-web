import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!userId) return <Navigate to="/login" replace />
  return <>{children}</>
}
