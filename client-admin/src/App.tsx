import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, LoginPage, useAuth } from '@repo/auth'
import AdminPage from './pages/AdminPage'

const shieldIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuth()
  if (loading) return null
  if (userId === null) return <Navigate to="/login" replace />
  if (userId !== 1) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold text-red-400 mb-2">Access Denied</p>
          <p className="text-gray-400">This app is restricted to the site admin.</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

function AppShell() {
  const { userId } = useAuth()
  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Routes>
        <Route
          path="/login"
          element={userId ? <Navigate to="/" replace /> : <LoginPage appName="Admin" appIcon={shieldIcon} />}
        />
        <Route
          path="/"
          element={
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
