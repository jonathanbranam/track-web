import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth } from '@repo/auth'
import { VersionOverlay } from '@repo/ui'
import { PeoplePage } from './pages/PeoplePage'
import { EventsPage } from './pages/EventsPage'
import { NewEventPage } from './pages/NewEventPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { RatingsPage } from './pages/RatingsPage'
import { MoviesCatalogPage } from './pages/MoviesCatalogPage'
import { TvCatalogPage } from './pages/TvCatalogPage'

const watchIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const navItems = [
  {
    to: '/events',
    label: 'Events',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/ratings',
    label: 'Ratings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    to: '/people',
    label: 'People',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

function NavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      {navItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
            }`
          }
        >
          {icon}
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="bg-gray-900 min-h-screen text-white pb-[calc(3.5rem+var(--sab))]">
        {children}
        <NavBar />
      </div>
    </AuthGuard>
  )
}

function AppShell() {
  const { userId } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={userId ? <Navigate to="/events" replace /> : <LoginPage appName="Watch" appIcon={watchIcon} />}
      />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/beta" element={<BetaPage />} />

      <Route path="/" element={<Navigate to="/events" replace />} />

      <Route path="/events" element={<Shell><EventsPage /></Shell>} />
      <Route path="/events/new" element={<Shell><NewEventPage /></Shell>} />
      <Route path="/events/:id" element={<Shell><EventDetailPage /></Shell>} />

      <Route path="/ratings" element={<Shell><RatingsPage /></Shell>} />

      <Route path="/movies/catalog" element={<Shell><MoviesCatalogPage /></Shell>} />
      <Route path="/tv/catalog" element={<Shell><TvCatalogPage /></Shell>} />

      <Route path="/people" element={<Shell><PeoplePage /></Shell>} />

      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
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
