import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex"
         style={{ paddingBottom: 'var(--sab)' }}>
      <NavLink
        to="/putt"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-6m0 0V5l9-2 9 2v10l-9-2-9 2z" />
        </svg>
        Putt
      </NavLink>
      <NavLink
        to="/score"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Score
      </NavLink>
    </nav>
  )
}
