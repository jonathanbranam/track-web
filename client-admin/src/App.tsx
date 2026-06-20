import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth } from '@repo/auth'
import AdminGuard from './components/AdminGuard'
import NavBar from './components/NavBar'
import DeployPage from './pages/DeployPage'
import BackupsPage from './pages/BackupsPage'
import UsersPage from './pages/UsersPage'
import TokensPage from './pages/TokensPage'
import LogsPage from './pages/LogsPage'

const adminIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

function protect(element: React.ReactNode) {
  return (
    <AuthGuard>
      <AdminGuard>{element}</AdminGuard>
    </AuthGuard>
  )
}

function AppShell() {
  const { userId } = useAuth()
  const isAdmin = userId === 1

  return (
    <div className="bg-gray-900 text-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 min-h-0 overflow-auto pb-16" style={{ paddingTop: 'var(--sat)' }}>
        <Routes>
          <Route
            path="/login"
            element={userId ? <Navigate to="/" replace /> : <LoginPage appName="Admin" appIcon={adminIcon} />}
          />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/beta" element={<BetaPage />} />
          <Route path="/" element={protect(<DeployPage />)} />
          <Route path="/backups" element={protect(<BackupsPage />)} />
          <Route path="/users" element={protect(<UsersPage />)} />
          <Route path="/tokens" element={protect(<TokensPage />)} />
          <Route path="/logs" element={protect(<LogsPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {isAdmin && <NavBar />}
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
