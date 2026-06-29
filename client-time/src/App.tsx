import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth, UserChip } from '@repo/auth'
import { VersionOverlay } from '@repo/ui'
import HomePage from './pages/HomePage'
import LogPage from './pages/LogPage'
import NavBar from './components/NavBar'

const clockIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

function AppShell() {
  const { userId } = useAuth()
  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col">
      <div className="flex-1 overflow-auto pb-16" style={{ paddingTop: 'var(--sat)' }}>
        <Routes>
          <Route
            path="/login"
            element={userId ? <Navigate to="/" replace /> : <LoginPage appName="Track" appIcon={clockIcon} />}
          />
          <Route path="/logout" element={<LogoutPage />} />
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
      {userId && <UserChip />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
        <VersionOverlay clientSha={__COMMIT_SHA__} buildTime={__BUILD_TIME__} />
      </AuthProvider>
    </BrowserRouter>
  )
}
