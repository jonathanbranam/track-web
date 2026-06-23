import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage } from '@repo/auth'
import { VersionOverlay } from '@repo/ui'
import NavBar from './components/NavBar'
import AccountPage from './pages/AccountPage'
import PeoplePage from './pages/PeoplePage'

const meIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
)

function AppShell() {
  return (
    <div className="bg-gray-900 text-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 min-h-0 overflow-auto pb-16" style={{ paddingTop: 'var(--sat)' }}>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage appName="Me" appIcon={meIcon} />}
          />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/beta" element={<BetaPage />} />
          <Route
            path="/account"
            element={<AuthGuard><AccountPage /></AuthGuard>}
          />
          <Route
            path="/people"
            element={<AuthGuard><PeoplePage /></AuthGuard>}
          />
          <Route path="*" element={<Navigate to="/account" replace />} />
        </Routes>
      </div>
      <NavBar />
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
