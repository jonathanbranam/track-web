import { useState } from 'react'
import { PeopleTab, GroupList, GroupEditor, InviteCodePanel, RedeemInviteCode } from '@repo/ui'

type Tab = 'people' | 'groups' | 'codes'

export function PeoplePage() {
  const [tab, setTab] = useState<Tab>('people')
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [groupRefreshKey, setGroupRefreshKey] = useState(0)

  function onGroupSaved() {
    setCreating(false)
    setSelectedGroup(null)
    setGroupRefreshKey(k => k + 1)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">People</h1>

      <div className="flex gap-1 mb-6 bg-gray-800 rounded p-1">
        {(['people', 'groups', 'codes'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm rounded capitalize transition-colors ${
              tab === t ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'people' && <PeopleTab />}

      {tab === 'groups' && (
        <>
          {creating || selectedGroup ? (
            <GroupEditor
              groupId={selectedGroup ?? undefined}
              onSaved={onGroupSaved}
              onCancel={() => { setCreating(false); setSelectedGroup(null) }}
            />
          ) : (
            <GroupList
              onSelect={setSelectedGroup}
              onCreate={() => setCreating(true)}
              refreshKey={groupRefreshKey}
            />
          )}
        </>
      )}

      {tab === 'codes' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Your Invite Codes
            </h3>
            <InviteCodePanel />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Redeem a Code
            </h3>
            <RedeemInviteCode />
          </div>
        </div>
      )}
    </div>
  )
}
