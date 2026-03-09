import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import BetaPage from './pages/BetaPage'
import HomePage from './pages/HomePage'
import LogPage from './pages/LogPage'
import NavBar from './components/NavBar'

function AuthGuard({ children }: { children: React.ReactNode }) {
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

function AppShell() {
  const { userId } = useAuth()
  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col">
      <div className="flex-1 overflow-auto pb-16">
        <Routes>
          <Route
            path="/login"
            element={userId ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route path="/beta" element={<BetaPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <HomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/log"
            element={
              <AuthGuard>
                <LogPage />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {userId && <NavBar />}
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
