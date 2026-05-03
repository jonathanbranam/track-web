import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth } from '@repo/auth'

const filmIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="17" y1="7" x2="22" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
  </svg>
)

function AppShell() {
  const { userId } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={userId ? <Navigate to="/" replace /> : <LoginPage appName="Movies" appIcon={filmIcon} />}
      />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/beta" element={<BetaPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <div className="bg-gray-900 min-h-screen text-white p-6">
              <h1 className="text-2xl font-bold">Movies</h1>
            </div>
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
