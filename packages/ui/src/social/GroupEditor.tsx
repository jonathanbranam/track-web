import { useEffect, useState } from 'react'
import { socialApi, type GroupDetail } from './api'
import { ConnectableUserPicker } from './ConnectableUserPicker'

interface Props {
  groupId?: number
  onSaved: () => void
  onCancel: () => void
}

export function GroupEditor({ groupId, onSaved, onCancel }: Props) {
  const isNew = !groupId
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (groupId) {
      socialApi.getGroup(groupId).then(g => {
        setGroup(g)
        setName(g.name)
        setDescription(g.description ?? '')
      })
    }
  }, [groupId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        await socialApi.createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          memberUserIds: selectedMembers,
        })
      } else {
        await socialApi.updateGroup(groupId!, {
          name: name.trim(),
          description: description.trim() || null,
        })
      }
      onSaved()
    } catch (err: any) {
      setError(err?.error ?? 'Failed to save group')
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(userId: number) {
    if (!groupId) return
    await socialApi.removeMember(groupId, userId)
    try {
      const updated = await socialApi.getGroup(groupId)
      setGroup(updated)
    } catch {
      onSaved()
    }
  }

  async function addMember(userId: number) {
    if (!groupId) return
    await socialApi.addMember(groupId, userId)
    const updated = await socialApi.getGroup(groupId)
    setGroup(updated)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">{isNew ? 'Create Group' : 'Edit Group'}</h3>

      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {isNew && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Add members</label>
            <ConnectableUserPicker selected={selectedMembers} onChange={setSelectedMembers} />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
          >
            Cancel
          </button>
        </div>
      </form>

      {!isNew && group && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</h4>
          <ul className="space-y-1 mb-3">
            {group.members.map(member => (
              <li key={member.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span>{member.displayName}</span>
                  {!member.connected && (
                    <span className="text-xs bg-gray-600 text-gray-300 px-1 rounded">not connected</span>
                  )}
                </div>
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div>
            <p className="text-xs text-gray-400 mb-1">Add connected user:</p>
            <ConnectableUserPicker
              selected={group.members.map(m => m.id)}
              onChange={async (ids) => {
                const newId = ids.find(id => !group.members.some(m => m.id === id))
                if (newId) await addMember(newId)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
