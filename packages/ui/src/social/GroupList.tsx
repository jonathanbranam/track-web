import { useEffect, useState } from 'react'
import { socialApi, type Group } from './api'

interface Props {
  onSelect: (groupId: number) => void
  onCreate: () => void
  refreshKey?: number
}

export function GroupList({ onSelect, onCreate, refreshKey }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    socialApi.getGroups().then(setGroups).finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <p className="text-sm text-gray-400">Loading groups…</p>

  return (
    <div className="space-y-3">
      {groups.length === 0 ? (
        <p className="text-sm text-gray-500">No groups yet</p>
      ) : (
        <ul className="space-y-2">
          {groups.map(group => (
            <li
              key={group.id}
              onClick={() => onSelect(group.id)}
              className="bg-gray-800 rounded px-3 py-2 cursor-pointer hover:bg-gray-700 transition-colors"
            >
              <p className="text-sm font-medium">{group.name}</p>
              {group.description && (
                <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={onCreate}
        className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded transition-colors"
      >
        + Create Group
      </button>
    </div>
  )
}
