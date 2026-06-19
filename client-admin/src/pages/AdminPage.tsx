import { useState, useEffect } from 'react'
import { api, type BackupInfo } from '../api'

type Status = { type: 'idle' } | { type: 'loading' } | { type: 'success'; message: string } | { type: 'error'; message: string }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-200 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status.type === 'idle') return null
  if (status.type === 'loading') return <p className="text-sm text-gray-400 mt-2">Working…</p>
  if (status.type === 'success') return <p className="text-sm text-green-400 mt-2">{status.message}</p>
  return <p className="text-sm text-red-400 mt-2">{status.message}</p>
}

function DeploySection() {
  const [status, setStatus] = useState<Status>({ type: 'idle' })

  async function handleDeploy() {
    setStatus({ type: 'loading' })
    try {
      await api.deploy.trigger()
      setStatus({ type: 'success', message: 'Deploy triggered — server is updating.' })
    } catch (e: unknown) {
      const err = e as { error?: string }
      setStatus({ type: 'error', message: err.error ?? 'Deploy failed.' })
    }
  }

  return (
    <Section title="Deploy">
      <p className="text-sm text-gray-400 mb-4">Pull latest code and restart the server.</p>
      <button
        onClick={handleDeploy}
        disabled={status.type === 'loading'}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
      >
        Trigger Deploy
      </button>
      <StatusBadge status={status} />
    </Section>
  )
}

function BackupSection() {
  const [status, setStatus] = useState<Status>({ type: 'idle' })

  async function handleBackup() {
    setStatus({ type: 'loading' })
    try {
      const { folder } = await api.admin.backup()
      setStatus({ type: 'success', message: `Backup created: ${folder}` })
    } catch (e: unknown) {
      const err = e as { error?: string }
      setStatus({ type: 'error', message: err.error ?? 'Backup failed.' })
    }
  }

  return (
    <Section title="Backup">
      <p className="text-sm text-gray-400 mb-4">Export all data to a timestamped folder in <code className="text-gray-300">backup/</code>.</p>
      <button
        onClick={handleBackup}
        disabled={status.type === 'loading'}
        className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
      >
        Create Backup
      </button>
      <StatusBadge status={status} />
    </Section>
  )
}

function RestoreSection() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState<Status>({ type: 'idle' })

  useEffect(() => {
    api.admin.backups()
      .then(({ backups }) => {
        setBackups(backups)
        if (backups.length > 0) setSelected(backups[0].folder)
      })
      .catch(() => setLoadError('Failed to load backups.'))
  }, [status])

  async function handleRestore() {
    if (!selected) return
    setStatus({ type: 'loading' })
    setConfirming(false)
    try {
      const { message } = await api.admin.restore(selected)
      setStatus({ type: 'success', message })
    } catch (e: unknown) {
      const err = e as { error?: string }
      setStatus({ type: 'error', message: err.error ?? 'Restore failed.' })
    }
  }

  return (
    <Section title="Restore">
      <p className="text-sm text-gray-400 mb-4">Replace all data with a previous backup. This cannot be undone.</p>
      {loadError ? (
        <p className="text-sm text-red-400">{loadError}</p>
      ) : backups.length === 0 ? (
        <p className="text-sm text-gray-500">No backups found.</p>
      ) : (
        <div className="space-y-3">
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); setConfirming(false) }}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {backups.map(b => (
              <option key={b.folder} value={b.folder}>
                {b.folder} — {new Date(b.exportedAt).toLocaleString()} ({b.totalRows} rows)
              </option>
            ))}
          </select>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={!selected || status.type === 'loading'}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Restore Selected
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-yellow-400">Overwrite all current data?</span>
              <button
                onClick={handleRestore}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      <StatusBadge status={status} />
    </Section>
  )
}

export default function AdminPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin</h1>
      <DeploySection />
      <BackupSection />
      <RestoreSection />
    </div>
  )
}
