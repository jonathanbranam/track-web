import { useState } from 'react'
import { api } from '../api'

export default function DeployPage() {
  const [status, setStatus] = useState<'idle' | 'deploying' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function deploy() {
    if (status === 'deploying') return
    setStatus('deploying')
    setError('')
    try {
      await api.deploy()
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Deploy</h1>
      <p className="text-gray-400 text-sm mb-6">Trigger a server deploy (git pull, build, restart).</p>

      <button
        onClick={deploy}
        disabled={status === 'deploying'}
        className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 transition-colors"
      >
        {status === 'deploying' ? 'Triggering…' : 'Deploy now'}
      </button>

      {status === 'done' && (
        <p className="mt-4 text-green-400">Deploy triggered. It will run in the background.</p>
      )}
      {status === 'error' && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  )
}
