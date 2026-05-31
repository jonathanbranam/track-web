import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex"
         style={{ paddingBottom: 'var(--sab)' }}>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Overview
      </NavLink>
    </nav>
  )
}
