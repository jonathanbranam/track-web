import { NavLink } from 'react-router-dom'

const links = [
  { to: '/account', label: 'Account' },
  { to: '/people', label: 'People' },
]

export default function NavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center py-3 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
