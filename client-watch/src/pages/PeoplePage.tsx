import { useState } from 'react'
import { PeopleTab, GroupList, GroupEditor, InviteCodePanel, RedeemInviteCode, SegmentedControl } from '@repo/ui'

type Tab = 'people' | 'groups' | 'codes'

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'groups', label: 'Groups' },
  { value: 'codes', label: 'Codes' },
]

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
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-4">People</h1>

      <div className="mb-6">
        <SegmentedControl
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
          activeClass="bg-violet-600 text-white"
        />
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
        <div className="space-y-6 pb-6">
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
