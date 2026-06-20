import { useEffect, useState, useCallback } from 'react'
import { api, type UserSummary } from '../api'

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    try {
      const { users } = await api.users.list()
      setUsers(users)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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

      <ul className="divide-y divide-gray-800">
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
    </div>
  )
}
