import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import { api } from '../api'

export default function AccountPage() {
  const { userId, displayName: initialDisplayName, logout } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [pwError, setPwError] = useState('')

  async function handleDisplayNameSave(e: React.FormEvent) {
    e.preventDefault()
    setNameStatus('saving')
    try {
      await api.updateDisplayName(displayName)
      setNameStatus('saved')
      setTimeout(() => setNameStatus('idle'), 2000)
    } catch {
      setNameStatus('error')
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.')
      setPwStatus('error')
      return
    }
    setPwStatus('saving')
    setPwError('')
    try {
      const res = await api.updatePassword(currentPassword, newPassword)
      if (res.status === 204) {
        await logout()
        navigate('/login')
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setPwError(body.error ?? 'Failed to change password.')
        setPwStatus('error')
      }
    } catch {
      setPwError('Failed to change password.')
      setPwStatus('error')
    }
  }

  return (
    <div className="px-4 py-6 space-y-8 max-w-lg">
      <h1 className="text-xl font-bold">Account</h1>

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile</h2>
        <p className="text-sm text-gray-400 mb-4">User ID: {userId}</p>

        <form onSubmit={handleDisplayNameSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={100}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={nameStatus === 'saving'}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {nameStatus === 'saving' ? 'Saving…' : nameStatus === 'saved' ? 'Saved!' : 'Save Name'}
          </button>
          {nameStatus === 'error' && <p className="text-red-400 text-sm">Failed to save. Try again.</p>}
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sign Out</h2>
        <button
          onClick={async () => { if (!window.confirm('Log out?')) return; await logout(); navigate('/login') }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          Log out
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Change Password</h2>
        <p className="text-amber-400 text-sm mb-4">You'll be signed out on all devices after changing your password.</p>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={pwStatus === 'saving'}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {pwStatus === 'saving' ? 'Saving…' : 'Change Password'}
          </button>
          {pwStatus === 'error' && <p className="text-red-400 text-sm">{pwError}</p>}
        </form>
      </section>
    </div>
  )
}
