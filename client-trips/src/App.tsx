import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth } from '@repo/auth'
import { VersionOverlay } from '@repo/ui'
import OverviewPage from './pages/OverviewPage'
import InfoPage from './pages/InfoPage'
import DaysPage from './pages/DaysPage'
import PackingPage from './pages/PackingPage'
import NavBar from './components/NavBar'

const mapIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
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
            element={userId ? <Navigate to="/" replace /> : <LoginPage appName="Trips" appIcon={mapIcon} />}
          />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/beta" element={<BetaPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <OverviewPage />
              </AuthGuard>
            }
          />
          <Route
            path="/days"
            element={
              <AuthGuard>
                <DaysPage />
              </AuthGuard>
            }
          />
          <Route
            path="/info"
            element={
              <AuthGuard>
                <InfoPage />
              </AuthGuard>
            }
          />
          <Route
            path="/packing"
            element={
              <AuthGuard>
                <PackingPage />
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
        <VersionOverlay clientSha={__COMMIT_SHA__} buildTime={__BUILD_TIME__} />
      </AuthProvider>
    </BrowserRouter>
  )
}
