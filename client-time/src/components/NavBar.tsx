import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import { api } from '../api'

export default function NavBar() {
  const { userId } = useAuth()
  const [deploying, setDeploying] = useState(false)

  async function handleDeploy() {
    if (deploying) return
    setDeploying(true)
    await api.deploy.trigger().catch(() => {})
    setTimeout(() => setDeploying(false), 3000)
  }

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
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Timer
      </NavLink>
      <NavLink
        to="/log"
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Log
      </NavLink>
      {userId === 1 && (
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
            deploying ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          {deploying ? 'Deploying…' : 'Deploy'}
        </button>
      )}
    </nav>
  )
}
