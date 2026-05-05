import { useEffect, useState } from 'react'
import { socialApi, type InviteCode } from './api'

export function InviteCodePanel() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [generating, setGenerating] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const list = await socialApi.listInviteCodes()
    setCodes(list)
  }

  async function generate() {
    setGenerating(true)
    try {
      const code = await socialApi.createInviteCode()
      setNewCode(code.code)
      await load()
    } finally {
      setGenerating(false)
    }
  }

  async function deleteCode(id: number) {
    await socialApi.deleteInviteCode(id)
    await load()
  }

  const statusColor: Record<string, string> = {
    active: 'bg-green-600',
    used: 'bg-gray-500',
    expired: 'bg-red-600',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={generating}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate Invite Code'}
        </button>
      </div>

      {newCode && (
        <div className="bg-gray-800 rounded p-3 text-sm">
          <p className="text-gray-400 mb-1">Share this code (valid 7 days):</p>
          <code className="text-green-400 font-mono break-all">{newCode}</code>
          <button
            onClick={() => navigator.clipboard.writeText(newCode)}
            className="ml-3 text-xs text-blue-400 hover:underline"
          >
            Copy
          </button>
        </div>
      )}

      {codes.length > 0 && (
        <ul className="space-y-2">
          {codes.map(code => (
            <li key={code.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs px-1.5 py-0.5 rounded text-white ${statusColor[code.status]}`}>
                  {code.status}
                </span>
                <code className="text-gray-300 font-mono truncate">{code.code}</code>
              </div>
              {code.status === 'active' && (
                <button
                  onClick={() => deleteCode(code.id)}
                  className="ml-2 text-xs text-red-400 hover:underline shrink-0"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
