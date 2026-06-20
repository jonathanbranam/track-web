import type { ReactNode } from 'react'
import { useAuth } from '@repo/auth'

/**
 * Renders children only for the owner account (user 1). Other authenticated
 * users see an "Access Denied" view. Unauthenticated users are handled upstream
 * by AuthGuard (redirect to login).
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const { userId, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>
  }

  if (userId !== 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-400">This area is restricted to the administrator.</p>
      </div>
    )
  }

  return <>{children}</>
}
