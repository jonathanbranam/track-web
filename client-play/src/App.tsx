import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth } from '@repo/auth'
import { VersionOverlay } from '@repo/ui'
import PuttPage from './pages/PuttPage'
import NavBar from './components/NavBar'

const playIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-6m0 0V5l9-2 9 2v10l-9-2-9 2z" />
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
            element={userId ? <Navigate to="/putt" replace /> : <LoginPage appName="Play" appIcon={playIcon} />}
          />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/beta" element={<BetaPage />} />
          <Route
            path="/putt"
            element={
              <AuthGuard>
                <PuttPage />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/putt" replace />} />
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
        <VersionOverlay clientSha={__COMMIT_SHA__} buildTime={__BUILD_TIME__} />
      </AuthProvider>
    </BrowserRouter>
  )
}
