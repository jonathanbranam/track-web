import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

function getInitials(displayName: string | null, email: string | null): string | null {
  const source = displayName?.trim() || null
  if (source) {
    const words = source.split(/\s+/).filter(Boolean)
    if (words.length === 0) return null
    const first = words[0][0]
    const last = words[words.length - 1][0]
    return (first + (words.length > 1 ? last : '')).toUpperCase()
  }
  if (email) {
    const local = email.split('@')[0].replace(/\./g, ' ')
    const words = local.split(/\s+/).filter(Boolean)
    if (words.length === 0) return null
    const first = words[0][0]
    const last = words[words.length - 1][0]
    return (first + (words.length > 1 ? last : '')).toUpperCase()
  }
  return null
}

const personIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
  </svg>
)

interface UserChipProps {
  hidden?: boolean
}

export function UserChip({ hidden }: UserChipProps) {
  const { userId, displayName, email, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (hidden || userId === null) return null

  const initials = getInitials(displayName, email)

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', top: 'calc(var(--sat) + 6px)', right: '12px', zIndex: 50 }}
        className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-semibold shadow-lg"
        aria-label="Account"
      >
        {initials ?? personIcon}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }}
          />
          <div
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
            className="bg-gray-800 rounded-t-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-white font-semibold text-lg">{displayName}</span>
              <span className="text-gray-400 text-sm">{email}</span>
              <span className="text-gray-600 text-xs">ID: {userId}</span>
            </div>
            <a
              href="https://me.branam.us"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 text-sm underline"
            >
              Manage account
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </>
  )
}
