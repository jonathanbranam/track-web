import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

interface VersionInfo {
  sha: string
  commitTime: string | null
  buildTime: string | null
}

function formatEastern(isoUtc: string | null): string {
  if (!isoUtc) return '—'
  return new Date(isoUtc).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export default function DeployPage() {
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'done' | 'error'>('idle')
  const [deployError, setDeployError] = useState('')
  const [version, setVersion] = useState<VersionInfo | null>(null)
  const [newSha, setNewSha] = useState<string | null>(null)
  const [pollStatus, setPollStatus] = useState<'idle' | 'polling' | 'confirmed' | 'timeout'>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  useEffect(() => {
    api.version().then(setVersion).catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function deploy() {
    if (deployStatus === 'deploying') return
    setDeployStatus('deploying')
    setDeployError('')
    setNewSha(null)
    setPollStatus('idle')
    stopPolling()

    const preSha = version?.sha ?? null

    try {
      await api.deploy()
      setDeployStatus('done')

      if (!preSha || preSha === 'unknown') return

      pollCount.current = 0
      setPollStatus('polling')
      pollRef.current = setInterval(async () => {
        pollCount.current++
        if (pollCount.current > 36) {
          stopPolling()
          setPollStatus('timeout')
          return
        }
        try {
          const info = await api.version()
          if (info.sha !== preSha) {
            stopPolling()
            setNewSha(info.sha)
            setVersion(info)
            setPollStatus('confirmed')
          }
        } catch { /* keep polling */ }
      }, 5000)
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : String(e))
      setDeployStatus('error')
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Deploy</h1>
      <p className="text-gray-400 text-sm mb-6">Trigger a server deploy (git pull, build, restart).</p>

      {version && (
        <div className="mb-6 bg-gray-800 rounded-xl px-4 py-3 text-sm space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Version</div>
          <VersionRow label="SHA" value={version.sha} mono />
          <VersionRow label="Commit time" value={formatEastern(version.commitTime)} />
          <VersionRow label="Build time" value={formatEastern(version.buildTime)} />
        </div>
      )}

      <button
        onClick={deploy}
        disabled={deployStatus === 'deploying'}
        className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 transition-colors"
      >
        {deployStatus === 'deploying' ? 'Triggering…' : 'Deploy now'}
      </button>

      {deployStatus === 'done' && pollStatus === 'idle' && (
        <p className="mt-4 text-green-400">Deploy triggered. It will run in the background.</p>
      )}
      {deployStatus === 'error' && <p className="mt-4 text-red-400">{deployError}</p>}

      {pollStatus === 'polling' && (
        <p className="mt-4 text-gray-400 text-sm">Waiting for new version to appear…</p>
      )}
      {pollStatus === 'confirmed' && newSha && (
        <div className="mt-4 text-green-400 text-sm">
          Deploy confirmed — now running <span className="font-mono">{newSha}</span>
        </div>
      )}
      {pollStatus === 'timeout' && (
        <p className="mt-4 text-yellow-400 text-sm">Deploy may still be running — SHA unchanged after 3 minutes.</p>
      )}
    </div>
  )
}

function VersionRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 items-baseline">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-white text-right truncate`}>{value}</span>
    </div>
  )
}
