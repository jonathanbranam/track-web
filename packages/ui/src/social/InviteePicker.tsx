import { useEffect, useState } from 'react'
import { socialApi, type SocialUser, type Group } from './api'

type Invitee =
  | { type: 'user'; userId: number }
  | { type: 'group'; groupId: number }

interface Props {
  selected: Invitee[]
  onChange: (invitees: Invitee[]) => void
  excludeUserIds?: number[]
}

export function InviteePicker({ selected, onChange, excludeUserIds = [] }: Props) {
  const [users, setUsers] = useState<SocialUser[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      socialApi.getConnectableUsers(),
      socialApi.getGroups(),
    ]).then(([u, g]) => {
      setUsers(u)
      setGroups(g)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  function isUserSelected(userId: number) {
    return selected.some(s => s.type === 'user' && s.userId === userId)
  }

  function isGroupSelected(groupId: number) {
    return selected.some(s => s.type === 'group' && s.groupId === groupId)
  }

  function toggleUser(userId: number) {
    if (isUserSelected(userId)) {
      onChange(selected.filter(s => !(s.type === 'user' && s.userId === userId)))
    } else {
      onChange([...selected, { type: 'user', userId }])
    }
  }

  function toggleGroup(groupId: number) {
    if (isGroupSelected(groupId)) {
      onChange(selected.filter(s => !(s.type === 'group' && s.groupId === groupId)))
    } else {
      onChange([...selected, { type: 'group', groupId }])
    }
  }

  const visibleUsers = users.filter(u => !excludeUserIds.includes(u.id))

  return (
    <div className="space-y-3">
      {visibleUsers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">People</p>
          <ul className="space-y-1">
            {visibleUsers.map(user => (
              <li key={user.id}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUserSelected(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{user.displayName}</span>
                  <span className="text-xs text-gray-400">{user.email}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {groups.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>
          <ul className="space-y-1">
            {groups.map(group => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    isGroupSelected(group.id)
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {group.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {visibleUsers.length === 0 && groups.length === 0 && (
        <p className="text-sm text-gray-400">No connected users or groups</p>
      )}
    </div>
  )
}
