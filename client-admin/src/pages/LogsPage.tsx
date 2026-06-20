import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../api'

const LOG_KEYS = ['output', 'error', 'deploy'] as const
type LogKey = (typeof LOG_KEYS)[number]

const AUTO_REFRESH_MS = 5000

export default function LogsPage() {
  const [selected, setSelected] = useState<LogKey>('output')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const load = useCallback(async (name: LogKey) => {
    setError('')
    try {
      const { content } = await api.logs.tail(name, 500)
      setContent(content)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    load(selected)
  }, [selected, load])

  // Optional auto-refresh: poll while enabled (off by default).
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => load(selected), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [autoRefresh, selected, load])

  // Keep the view pinned to the newest lines after each load.
  useEffect(() => {
    if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight
  }, [content])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-1">Logs</h1>
      <p className="text-gray-400 text-sm mb-4">View the server's most recent log output.</p>

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex gap-1">
          {LOG_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                selected === k ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-300">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto
          </label>
          <button onClick={() => load(selected)}
            className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-1.5 text-sm font-medium">
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-red-400 text-sm">{error}</p>}

      <pre ref={preRef}
        className="flex-1 min-h-0 overflow-auto bg-black/40 border border-gray-800 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
        {content || '(empty)'}
      </pre>
    </div>
  )
}
