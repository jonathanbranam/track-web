import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, useAuth } from '@repo/auth'
import DirectoryPage from './pages/DirectoryPage'

const homeIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
)

function Header() {
  const { logout } = useAuth()
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700" style={{ paddingTop: 'max(0.75rem, var(--sat))' }}>
      <span className="text-white font-semibold">branam.us</span>
      <button
        onClick={logout}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Log out
      </button>
    </header>
  )
}

function AppShell() {
  const { userId } = useAuth()

  return (
    <div className="bg-gray-900 text-white flex flex-col" style={{ height: '100dvh' }}>
      <Routes>
        <Route
          path="/login"
          element={userId ? <Navigate to="/" replace /> : <LoginPage appName="Home" appIcon={homeIcon} />}
        />
        <Route
          path="/"
          element={
            <AuthGuard>
              <>
                <Header />
                <div className="flex-1 min-h-0 overflow-auto">
                  <DirectoryPage />
                </div>
              </>
            </AuthGuard>
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
