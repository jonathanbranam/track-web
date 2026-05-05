import { useState } from 'react'
import { socialApi } from './api'

interface Props {
  onRedeemed?: () => void
}

export function RedeemInviteCode({ onRedeemed }: Props) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setStatus('loading')
    try {
      await socialApi.redeemCode(code.trim())
      setStatus('success')
      setCode('')
      onRedeemed?.()
    } catch (err: any) {
      setErrorMsg(err?.error ?? 'Code is invalid, expired, or already used')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setStatus('idle') }}
          placeholder="Enter invite code"
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!code.trim() || status === 'loading'}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
        >
          {status === 'loading' ? 'Redeeming…' : 'Redeem'}
        </button>
      </div>
      {status === 'success' && <p className="text-sm text-green-400">Connected successfully!</p>}
      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}
    </form>
  )
}
