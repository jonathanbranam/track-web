import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, AuthGuard, LoginPage, LogoutPage, BetaPage, useAuth } from '@repo/auth'
import { PeoplePage } from './pages/PeoplePage'
import { EventsPage } from './pages/EventsPage'
import { NewEventPage } from './pages/NewEventPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { MoviesWatchlistPage } from './pages/MoviesWatchlistPage'
import { MoviesCatalogPage } from './pages/MoviesCatalogPage'
import { TvWatchlistPage } from './pages/TvWatchlistPage'
import { TvCatalogPage } from './pages/TvCatalogPage'

const watchIcon = (
  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

function NavBar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-4">
      <div className="flex gap-4 max-w-lg mx-auto">
        {[
          { to: '/events', label: 'Events' },
          { to: '/movies', label: 'Movies' },
          { to: '/tv', label: 'TV' },
          { to: '/people', label: 'People' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="bg-gray-900 min-h-screen text-white">
        <NavBar />
        {children}
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

      <Route path="/movies" element={<Shell><MoviesWatchlistPage /></Shell>} />
      <Route path="/movies/catalog" element={<Shell><MoviesCatalogPage /></Shell>} />

      <Route path="/tv" element={<Shell><TvWatchlistPage /></Shell>} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}
