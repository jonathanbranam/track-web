import { useEffect, useState, useCallback } from 'react'
import { api, type UserSummary, type InviteSummary } from '../api'

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [invites, setInvites] = useState<InviteSummary[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteExpiresIn, setInviteExpiresIn] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')

  const refresh = useCallback(async () => {
    try {
      const { users } = await api.users.list()
      setUsers(users)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const refreshInvites = useCallback(async () => {
    try {
      const list = await api.invites.list()
      setInvites(list)
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
    refreshInvites()
  }, [refresh, refreshInvites])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api.users.create(email, password, displayName || undefined)
      setEmail(''); setPassword(''); setDisplayName('')
      setMessage('User created.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function removeUser(u: UserSummary) {
    if (!confirm(`Delete ${u.email} and all their data?`)) return
    setError(''); setMessage('')
    try {
      await api.users.remove(u.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function changePassword(u: UserSummary) {
    const pw = prompt(`New password for ${u.email}:`)
    if (!pw) return
    setError(''); setMessage('')
    try {
      await api.users.setPassword(u.id, pw)
      setMessage(`Password updated for ${u.email}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteMessage('')
    setInviteUrl('')
    try {
      const expiresIn = inviteExpiresIn ? parseInt(inviteExpiresIn, 10) : undefined
      const result = await api.invites.create(inviteEmail, expiresIn)
      setInviteUrl(result.url)
      setInviteEmail('')
      setInviteExpiresIn('')
      await refreshInvites()
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : String(e))
    }
  }

  async function revokeInvite(inv: InviteSummary) {
    if (!confirm(`Revoke invite for ${inv.email}?`)) return
    setInviteError('')
    try {
      await api.invites.revoke(inv.id)
      setInviteUrl('')
      await refreshInvites()
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : String(e))
    }
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url)
      .then(() => setInviteMessage('Copied to clipboard.'))
      .catch(() => setInviteMessage('Copy failed — copy the URL manually.'))
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Users</h1>
      <p className="text-gray-400 text-sm mb-4">Manage user accounts.</p>

      {message && <p className="mb-3 text-green-400 text-sm">{message}</p>}
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}

      <form onSubmit={addUser} className="bg-gray-800 rounded-xl p-4 mb-6 space-y-2">
        <h2 className="text-sm font-semibold text-gray-300">Add user</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name (optional)"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Password"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 text-sm font-medium">
          Add user
        </button>
      </form>

      <ul className="divide-y divide-gray-800 mb-8">
        {users.map((u) => (
          <li key={u.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{u.displayName || u.email}</div>
                <div className="text-xs text-gray-500">{u.email} · id {u.id}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => changePassword(u)} className="text-indigo-300 hover:text-indigo-200">Password</button>
                {u.id !== 1 && (
                  <button onClick={() => removeUser(u)} className="text-red-400 hover:text-red-300">Delete</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mb-1">Invite links</h2>
      <p className="text-gray-400 text-sm mb-4">Generate single-use links for new users to self-activate.</p>

      {inviteMessage && <p className="mb-3 text-green-400 text-sm">{inviteMessage}</p>}
      {inviteError && <p className="mb-3 text-red-400 text-sm">{inviteError}</p>}

      <form onSubmit={createInvite} className="bg-gray-800 rounded-xl p-4 mb-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300">Generate invite</h3>
        <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" required placeholder="Email"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <input value={inviteExpiresIn} onChange={(e) => setInviteExpiresIn(e.target.value)} type="number" min="1" max="365" placeholder="Expires in days (default: 7)"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 text-sm font-medium">
          Generate invite
        </button>
      </form>

      {inviteUrl && (
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">Invite URL</p>
          <p className="text-sm break-all mb-2 text-indigo-300">{inviteUrl}</p>
          <button onClick={() => copyInviteUrl(inviteUrl)}
            className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium">
            Copy link
          </button>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="divide-y divide-gray-800">
          {invites.map((inv) => {
            const isUsed = !!inv.usedAt
            const isExpired = !isUsed && inv.expiresAt < new Date().toISOString()
            const status = isUsed ? 'used' : isExpired ? 'expired' : 'pending'
            return (
              <li key={inv.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-gray-500">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()} ·{' '}
                      <span className={status === 'pending' ? 'text-green-400' : 'text-gray-500'}>{status}</span>
                    </div>
                  </div>
                  {status === 'pending' && (
                    <div className="flex gap-2 text-sm shrink-0">
                      <button onClick={() => copyInviteUrl(inv.url)} className="text-indigo-300 hover:text-indigo-200 text-xs">Copy</button>
                      <button onClick={() => revokeInvite(inv)} className="text-red-400 hover:text-red-300 text-xs">Revoke</button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
