import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@repo/auth'
import { api } from '../api'
import type { PuttRound, PuttScore, PuttMember } from '../types'

const FRONT = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const BACK  = [10, 11, 12, 13, 14, 15, 16, 17, 18]

type ScoreMap = Record<number, Record<number, number>>  // userId → hole → strokes

function buildScoreMap(scores: PuttScore[]): ScoreMap {
  const map: ScoreMap = {}
  for (const s of scores) {
    if (!map[s.userId]) map[s.userId] = {}
    map[s.userId][s.hole] = s.strokes
  }
  return map
}

function nineTotal(map: ScoreMap, userId: number, holes: number[]): number | null {
  let total = 0
  let any = false
  for (const h of holes) {
    const s = map[userId]?.[h]
    if (s !== undefined) { total += s; any = true }
  }
  return any ? total : null
}

function grandTotal(map: ScoreMap, userId: number): number | null {
  const f = nineTotal(map, userId, FRONT)
  const b = nineTotal(map, userId, BACK)
  if (f === null && b === null) return null
  return (f ?? 0) + (b ?? 0)
}

function shortName(name: string): string {
  const first = name.split(' ')[0] ?? name
  return first.length > 10 ? first.slice(0, 10) : first
}

type EditTarget = { userId: number; userName: string; hole: number; strokes: number }

function ScoreEntrySheet({
  target,
  onSave,
  onCancel,
  saving,
}: {
  target: EditTarget
  onSave: (strokes: number) => void
  onCancel: () => void
  saving: boolean
}) {
  const [val, setVal] = useState(target.strokes)

  const dec = () => setVal(v => Math.max(1, v - 1))
  const inc = () => setVal(v => Math.min(20, v + 1))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onCancel} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 rounded-t-2xl pb-safe px-6 pt-5"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm text-gray-400">
            Hole {target.hole} — <span className="text-white font-medium">{target.userName}</span>
          </span>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex items-center justify-center gap-8 mb-6">
          <button
            onClick={dec}
            disabled={val <= 1}
            className="w-14 h-14 rounded-full bg-gray-700 text-2xl font-bold text-white disabled:opacity-30 active:bg-gray-600 flex items-center justify-center"
          >−</button>
          <span className="text-5xl font-bold w-16 text-center tabular-nums">{val}</span>
          <button
            onClick={inc}
            disabled={val >= 20}
            className="w-14 h-14 rounded-full bg-gray-700 text-2xl font-bold text-white disabled:opacity-30 active:bg-gray-600 flex items-center justify-center"
          >+</button>
        </div>

        <button
          onClick={() => onSave(val)}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base disabled:opacity-50 active:bg-indigo-500"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  )
}

function ScoreCell({
  strokes,
  canEdit,
  onClick,
}: {
  strokes: number | undefined
  canEdit: boolean
  onClick: () => void
}) {
  const base = 'w-9 h-8 text-center text-sm tabular-nums flex items-center justify-center rounded select-none'
  const editable = canEdit ? 'cursor-pointer active:bg-gray-600' : ''
  const color =
    strokes === 1 ? 'text-yellow-300 font-bold' :
    strokes !== undefined && strokes <= 2 ? 'text-green-400' :
    strokes !== undefined && strokes >= 5 ? 'text-red-400' :
    'text-white'

  return (
    <td className="px-0.5 py-1">
      <div className={`${base} ${editable} ${color}`} onClick={canEdit ? onClick : undefined}>
        {strokes ?? <span className="text-gray-600">·</span>}
      </div>
    </td>
  )
}

function TotalCell({ value }: { value: number | null }) {
  return (
    <td className="px-1 py-1 bg-gray-800">
      <div className="w-9 h-8 text-center text-sm font-semibold tabular-nums flex items-center justify-center">
        {value ?? <span className="text-gray-600">—</span>}
      </div>
    </td>
  )
}

export default function PuttPage() {
  const { userId } = useAuth()

  const [tripId, setTripId] = useState<number | null>(null)
  const [rounds, setRounds] = useState<PuttRound[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null)
  const [members, setMembers] = useState<PuttMember[]>([])
  const [scoreMap, setScoreMap] = useState<ScoreMap>({})
  const [loading, setLoading] = useState(true)
  const [roundsLoading, setRoundsLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [newRoundName, setNewRoundName] = useState('')
  const [showNewRound, setShowNewRound] = useState(false)
  const [creatingRound, setCreatingRound] = useState(false)

  // Load current trip
  useEffect(() => {
    api.trips.current()
      .then(({ trip }) => setTripId(trip.id))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load rounds when tripId is known
  useEffect(() => {
    if (!tripId) return
    api.putt.rounds(tripId).then(({ rounds }) => {
      setRounds(rounds)
      if (rounds.length > 0) setSelectedRoundId(rounds[rounds.length - 1].id)
    }).catch(() => {})
  }, [tripId])

  // Load scores + members when selected round changes
  useEffect(() => {
    if (!tripId || !selectedRoundId) return
    setRoundsLoading(true)
    api.putt.scores(tripId, selectedRoundId).then(({ scores, members }) => {
      setMembers(members)
      setScoreMap(buildScoreMap(scores))
      const me = members.find(m => m.userId === userId)
      setIsOwner(me?.role === 'owner')
    }).catch(() => {}).finally(() => setRoundsLoading(false))
  }, [tripId, selectedRoundId, userId])

  const handleCellTap = useCallback((member: PuttMember, hole: number) => {
    const strokes = scoreMap[member.userId]?.[hole] ?? 2
    setEditTarget({ userId: member.userId, userName: shortName(member.displayName), hole, strokes })
  }, [scoreMap])

  const handleSave = useCallback(async (strokes: number) => {
    if (!editTarget || !tripId || !selectedRoundId) return
    setSaving(true)
    try {
      const { score } = await api.putt.setScore(tripId, selectedRoundId, editTarget.userId, editTarget.hole, strokes)
      setScoreMap(prev => ({
        ...prev,
        [score.userId]: { ...(prev[score.userId] ?? {}), [score.hole]: score.strokes },
      }))
      setEditTarget(null)
    } catch {
      // keep sheet open on error
    } finally {
      setSaving(false)
    }
  }, [editTarget, tripId, selectedRoundId])

  const handleCreateRound = useCallback(async () => {
    if (!tripId) return
    setCreatingRound(true)
    try {
      const { round } = await api.putt.createRound(tripId, newRoundName.trim())
      setRounds(prev => [...prev, round])
      setSelectedRoundId(round.id)
      setScoreMap({})
      setNewRoundName('')
      setShowNewRound(false)
    } catch {
    } finally {
      setCreatingRound(false)
    }
  }, [tripId, newRoundName])

  const handleDeleteRound = useCallback(async () => {
    if (!tripId || !selectedRoundId) return
    if (!confirm('Delete this round and all scores?')) return
    await api.putt.deleteRound(tripId, selectedRoundId)
    const remaining = rounds.filter(r => r.id !== selectedRoundId)
    setRounds(remaining)
    setSelectedRoundId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
    setScoreMap({})
    setMembers([])
  }, [tripId, selectedRoundId, rounds])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  if (!tripId) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 text-sm">
        <span>No active trip</span>
      </div>
    )
  }

  const selectedRound = rounds.find(r => r.id === selectedRoundId)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 flex-wrap">
        <span className="text-white font-semibold text-base mr-1">⛳ Putt-Putt</span>

        {rounds.length > 0 && (
          <select
            value={selectedRoundId ?? ''}
            onChange={e => setSelectedRoundId(Number(e.target.value))}
            className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setShowNewRound(true)}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg active:bg-indigo-500"
        >
          + Round
        </button>

        {isOwner && selectedRound && (
          <button
            onClick={handleDeleteRound}
            className="text-sm text-red-400 hover:text-red-300 px-2 py-1.5"
          >
            Delete
          </button>
        )}
      </div>

      {/* New round form */}
      {showNewRound && (
        <div className="mx-4 mb-2 flex gap-2">
          <input
            autoFocus
            className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
            placeholder={`Round ${rounds.length + 1}`}
            value={newRoundName}
            onChange={e => setNewRoundName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateRound(); if (e.key === 'Escape') setShowNewRound(false) }}
          />
          <button
            onClick={handleCreateRound}
            disabled={creatingRound}
            className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-40"
          >
            {creatingRound ? '…' : 'Create'}
          </button>
          <button onClick={() => setShowNewRound(false)} className="text-gray-400 px-2">✕</button>
        </div>
      )}

      {/* No rounds yet */}
      {rounds.length === 0 && !showNewRound && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-sm py-16">
          <span className="text-4xl">⛳</span>
          <p>No rounds yet. Add one to get started.</p>
        </div>
      )}

      {/* Scorecard */}
      {selectedRound && !roundsLoading && members.length > 0 && (
        <div className="overflow-x-auto px-2 pb-4">
          <table className="border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr className="text-gray-400 text-xs">
                {/* Sticky name column */}
                <th className="sticky left-0 z-10 bg-gray-900 text-left px-2 py-1 w-24 min-w-24">Player</th>
                {FRONT.map(h => (
                  <th key={h} className="px-0.5 py-1 w-9 text-center font-normal">{h}</th>
                ))}
                <th className="px-1 py-1 w-9 text-center font-semibold text-gray-300 bg-gray-800">Out</th>
                {BACK.map(h => (
                  <th key={h} className="px-0.5 py-1 w-9 text-center font-normal">{h}</th>
                ))}
                <th className="px-1 py-1 w-9 text-center font-semibold text-gray-300 bg-gray-800">In</th>
                <th className="px-1 py-1 w-9 text-center font-bold text-white bg-gray-800">Tot</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => {
                const canEdit = isOwner || member.userId === userId
                const frontSum = nineTotal(scoreMap, member.userId, FRONT)
                const backSum  = nineTotal(scoreMap, member.userId, BACK)
                const total    = grandTotal(scoreMap, member.userId)
                const rowBg = idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/80'

                return (
                  <tr key={member.userId} className={rowBg}>
                    <td className={`sticky left-0 z-10 ${rowBg} px-2 py-1 text-sm font-medium text-white whitespace-nowrap`}>
                      {shortName(member.displayName)}
                      {member.userId === userId && (
                        <span className="ml-1 text-xs text-indigo-400">●</span>
                      )}
                    </td>
                    {FRONT.map(hole => (
                      <ScoreCell
                        key={hole}
                        strokes={scoreMap[member.userId]?.[hole]}
                        canEdit={canEdit}
                        onClick={() => handleCellTap(member, hole)}
                      />
                    ))}
                    <TotalCell value={frontSum} />
                    {BACK.map(hole => (
                      <ScoreCell
                        key={hole}
                        strokes={scoreMap[member.userId]?.[hole]}
                        canEdit={canEdit}
                        onClick={() => handleCellTap(member, hole)}
                      />
                    ))}
                    <TotalCell value={backSum} />
                    <td className="px-1 py-1 bg-gray-800">
                      <div className="w-9 h-8 text-center text-sm font-bold tabular-nums flex items-center justify-center text-white">
                        {total ?? <span className="text-gray-600">—</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <p className="mt-3 px-2 text-xs text-gray-500">
            Tap any score cell to enter or edit.{!isOwner && ' You can only edit your own row.'}
          </p>
        </div>
      )}

      {roundsLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading scores…</div>
      )}

      {/* Score entry bottom sheet */}
      {editTarget && (
        <ScoreEntrySheet
          target={editTarget}
          onSave={handleSave}
          onCancel={() => setEditTarget(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
