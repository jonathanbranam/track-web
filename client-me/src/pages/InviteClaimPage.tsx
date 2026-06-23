import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function InviteClaimPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [email, setEmail] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) { setLoadError('Invalid invite link.'); setLoading(false); return }
    fetch(`/api/invites/${encodeURIComponent(token)}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) { setLoadError('This invite is invalid, expired, or has already been used.'); return }
        const data = await res.json() as { email: string; expiresAt: string }
        setEmail(data.email)
      })
      .catch(() => setLoadError('Failed to load invite. Please check your connection.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.')
      return
    }
    if (!token) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, ...(displayName ? { displayName } : {}) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setSubmitError(body.error ?? 'Failed to activate account.')
        return
      }
      navigate('/')
    } catch {
      setSubmitError('Failed to activate account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-sm">
        <p className="text-gray-400 text-sm">Loading invite…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="px-4 py-6 max-w-sm">
        <h1 className="text-xl font-bold mb-2">Invite not found</h1>
        <p className="text-red-400 text-sm">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-sm">
      <h1 className="text-xl font-bold mb-1">Activate your account</h1>
      <p className="text-gray-400 text-sm mb-6">You've been invited as <span className="text-white font-medium">{email}</span>. Set a password to get started.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Display name (optional)</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium"
        >
          {submitting ? 'Activating…' : 'Activate account'}
        </button>
      </form>
    </div>
  )
}
