import { useEffect, useState } from 'react'
import { socialApi, type SocialUser } from './api'

interface Props {
  selected: number[]
  onChange: (userIds: number[]) => void
}

export function ConnectableUserPicker({ selected, onChange }: Props) {
  const [users, setUsers] = useState<SocialUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    socialApi.getConnectableUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (users.length === 0) return <p className="text-sm text-gray-400">No connected users</p>

  function toggle(userId: number) {
    onChange(
      selected.includes(userId) ? selected.filter(id => id !== userId) : [...selected, userId]
    )
  }

  return (
    <ul className="space-y-1">
      {users.map(user => (
        <li key={user.id}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(user.id)}
              onChange={() => toggle(user.id)}
              className="rounded"
            />
            <span>{user.displayName}</span>
            <span className="text-xs text-gray-400">{user.email}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
