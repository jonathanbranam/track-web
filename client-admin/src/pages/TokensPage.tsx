import { useEffect, useState, useCallback } from 'react'
import { api, type ApiToken } from '../api'

export default function TokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [label, setLabel] = useState('')
  const [days, setDays] = useState(30)
  const [created, setCreated] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setTokens(await api.tokens.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createToken(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreated('')
    try {
      const r = await api.tokens.create(label, days)
      setCreated(r.token)
      setLabel('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function revoke(t: ApiToken) {
    if (!confirm(`Revoke token "${t.label}"?`)) return
    setError('')
    try {
      await api.tokens.revoke(t.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">API Tokens</h1>
      <p className="text-gray-400 text-sm mb-4">Create and revoke bearer tokens.</p>

      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}
      {created && (
        <div className="bg-gray-800 border border-indigo-700 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-1">New token (copy now — shown once):</p>
          <code className="text-sm break-all text-indigo-300">{created}</code>
        </div>
      )}

      <form onSubmit={createToken} className="bg-gray-800 rounded-xl p-4 mb-6 space-y-2">
        <h2 className="text-sm font-semibold text-gray-300">Create token</h2>
        <input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Label"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <label className="block text-xs text-gray-400">
          Expires in (days)
          <input value={days} onChange={(e) => setDays(Number(e.target.value))} type="number" min={1} max={180}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1" />
        </label>
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 text-sm font-medium">
          Create
        </button>
      </form>

      <ul className="divide-y divide-gray-800">
        {tokens.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-gray-500">expires {new Date(t.expiresAt).toLocaleDateString()}</div>
            </div>
            <button onClick={() => revoke(t)} className="text-sm text-red-400 hover:text-red-300">Revoke</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
