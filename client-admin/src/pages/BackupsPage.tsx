import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'

export default function BackupsPage() {
  const [timestamps, setTimestamps] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const { backups } = await api.backups.listTimestamped()
      setTimestamps(backups)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await fn()
      setMessage(label)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const runScheduled = () =>
    run('Scheduled backup complete.', async () => {
      const r = await api.backups.runScheduled()
      setMessage(r.pushed ? `Scheduled backup pushed (${r.folder}).` : 'Scheduled backup ran — no changes to push.')
    })

  const runTimestamped = () =>
    run('Timestamped backup created.', async () => {
      const r = await api.backups.runTimestamped()
      setMessage(`Created backup ${r.folder}.`)
    })

  const restoreScheduled = () => {
    if (!confirm('Restore the database from the last scheduled backup? This overwrites current data.')) return
    run('Restored from scheduled backup.', () => api.backups.restoreScheduled().then(() => {}))
  }

  const restoreTimestamp = (name: string) => {
    if (!confirm(`Restore the database from ${name}? This overwrites current data.`)) return
    run(`Restored from ${name}.`, () => api.backups.restoreTimestamped(name).then(() => {}))
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Backups</h1>
      <p className="text-gray-400 text-sm mb-4">Back up and restore the database.</p>

      {message && <p className="mb-3 text-green-400 text-sm">{message}</p>}
      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={runScheduled} disabled={busy}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg px-4 py-2 text-sm font-medium">
          Run scheduled backup
        </button>
        <button onClick={runTimestamped} disabled={busy}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-60 rounded-lg px-4 py-2 text-sm font-medium">
          Run timestamped backup
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Scheduled backup</h2>
        <button onClick={restoreScheduled} disabled={busy}
          className="text-sm text-amber-300 hover:text-amber-200 disabled:opacity-60">
          Restore from last scheduled backup
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Recent timestamped backups</h2>
        {timestamps.length === 0 ? (
          <p className="text-gray-500 text-sm">No timestamped backups yet.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {timestamps.map((name) => (
              <li key={name} className="flex items-center justify-between py-2">
                <span className="font-mono text-sm">{name}</span>
                <button onClick={() => restoreTimestamp(name)} disabled={busy}
                  className="text-sm text-amber-300 hover:text-amber-200 disabled:opacity-60">
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
