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
      <NavLink
        to="/days"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Days
      </NavLink>
      <NavLink
        to="/info"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Info
      </NavLink>
      <NavLink
        to="/packing"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Packing
      </NavLink>
      <NavLink
        to="/putt"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        {/* Golf flag icon */}
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-6m0 0V5l9-2 9 2v10l-9-2-9 2z" />
        </svg>
        Putt
      </NavLink>
    </nav>
  )
}
