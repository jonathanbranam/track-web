import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@repo/auth'
import { api } from '../api'
import type { PuttRound, PuttScore, PuttMember } from '../types'

const FRONT = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const BACK  = [10, 11, 12, 13, 14, 15, 16, 17, 18]
const ALL   = [...FRONT, ...BACK]

// Rows in the scorecard — holes + subtotal dividers
type TableRow =
  | { kind: 'hole'; hole: number }
  | { kind: 'total'; label: string; holes: number[] }

const ROWS: TableRow[] = [
  ...FRONT.map(hole => ({ kind: 'hole' as const, hole })),
  { kind: 'total', label: 'Out', holes: FRONT },
  ...BACK.map(hole => ({ kind: 'hole' as const, hole })),
  { kind: 'total', label: 'In',  holes: BACK },
  { kind: 'total', label: 'Tot', holes: ALL },
]

type ScoreMap = Record<number, Record<number, number>>  // userId → hole → strokes

function buildScoreMap(scores: PuttScore[]): ScoreMap {
  const map: ScoreMap = {}
  for (const s of scores) {
    if (!map[s.userId]) map[s.userId] = {}
    map[s.userId][s.hole] = s.strokes
  }
  return map
}

function holesTotal(map: ScoreMap, userId: number, holes: number[]): number | null {
  let total = 0
  let any = false
  for (const h of holes) {
    const s = map[userId]?.[h]
    if (s !== undefined) { total += s; any = true }
  }
  return any ? total : null
}

function shortName(name: string): string {
  const first = name.split(' ')[0] ?? name
  return first.length > 8 ? first.slice(0, 8) : first
}

type EditTarget = { userId: number; userName: string; hole: number; strokes: number }

// Show ~4 player columns at once; each fills (viewport - hole-col) / 4
const PLAYER_COL_STYLE = { width: 'calc((100dvw - 2.5rem) / 4)', minWidth: 'calc((100dvw - 2.5rem) / 4)' }
const HOLE_COL_STYLE   = { width: '2.5rem', minWidth: '2.5rem' }

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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 rounded-t-2xl px-6 pt-5"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}>
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

export default function PuttPage() {
  const { userId } = useAuth()

  const [tripId, setTripId]               = useState<number | null>(null)
  const [rounds, setRounds]               = useState<PuttRound[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null)
  const [members, setMembers]             = useState<PuttMember[]>([])
  const [scoreMap, setScoreMap]           = useState<ScoreMap>({})
  const [loading, setLoading]             = useState(true)
  const [roundsLoading, setRoundsLoading] = useState(false)
  const [isOwner, setIsOwner]             = useState(false)
  const [editTarget, setEditTarget]       = useState<EditTarget | null>(null)
  const [saving, setSaving]               = useState(false)
  const [newRoundName, setNewRoundName]   = useState('')
  const [showNewRound, setShowNewRound]   = useState(false)
  const [creatingRound, setCreatingRound] = useState(false)

  useEffect(() => {
    api.trips.current()
      .then(({ trip }) => setTripId(trip.id))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!tripId) return
    api.putt.rounds(tripId).then(({ rounds }) => {
      setRounds(rounds)
      if (rounds.length > 0) setSelectedRoundId(rounds[rounds.length - 1].id)
    }).catch(() => {})
  }, [tripId])

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
      // leave sheet open on error
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
    // Fill exactly the visible viewport minus safe-area-top (applied by App shell paddingTop)
    // and the nav bar bottom padding (pb-16 = 4rem). overflow-hidden prevents the outer
    // scroll container from activating; all scrolling happens in the table wrapper below.
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - env(safe-area-inset-top, 0px) - 4rem)' }}
    >

      {/* ── Controls bar ── */}
      <div className="flex-none px-3 pt-3 pb-2 flex items-center gap-2 flex-wrap border-b border-gray-800">
        <span className="text-white font-semibold mr-1">⛳ Putt-Putt</span>

        {rounds.length > 0 && (
          <select
            value={selectedRoundId ?? ''}
            onChange={e => setSelectedRoundId(Number(e.target.value))}
            className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}

        <button
          onClick={() => setShowNewRound(v => !v)}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg active:bg-indigo-500"
        >
          + Round
        </button>

        {isOwner && selectedRound && (
          <button onClick={handleDeleteRound} className="text-sm text-red-400 px-2 py-1.5">
            Delete
          </button>
        )}
      </div>

      {/* ── New-round inline form ── */}
      {showNewRound && (
        <div className="flex-none px-3 py-2 flex gap-2 border-b border-gray-800">
          <input
            autoFocus
            className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
            placeholder={`Round ${rounds.length + 1}`}
            value={newRoundName}
            onChange={e => setNewRoundName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateRound()
              if (e.key === 'Escape') setShowNewRound(false)
            }}
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

      {/* ── No rounds yet ── */}
      {rounds.length === 0 && !showNewRound && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-sm">
          <span className="text-4xl">⛳</span>
          <p>No rounds yet — tap + Round to start.</p>
        </div>
      )}

      {/* ── Loading ── */}
      {roundsLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading scores…
        </div>
      )}

      {/* ── Scorecard ──
          Both scroll axes live in this one container so sticky top-0 (player headers)
          and sticky left-0 (hole numbers) both work simultaneously. */}
      {selectedRound && !roundsLoading && members.length > 0 && (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="border-collapse">
            <thead>
              <tr>
                {/* Corner cell — sticky in both axes */}
                <th
                  className="sticky top-0 left-0 z-30 bg-gray-800 border-b border-r border-gray-700 text-gray-500 text-xs font-normal"
                  style={HOLE_COL_STYLE}
                >#</th>

                {members.map(member => {
                  const isMe = member.userId === userId
                  return (
                    <th
                      key={member.userId}
                      className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700 px-1 py-2 text-center text-sm font-semibold text-white"
                      style={PLAYER_COL_STYLE}
                    >
                      <span className={isMe ? 'text-indigo-300' : ''}>{shortName(member.displayName)}</span>
                      {isMe && <span className="block text-[9px] text-indigo-400 font-normal leading-none mt-0.5">you</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {ROWS.map((row, rowIdx) => {
                const isTotalRow = row.kind === 'total'
                const isFinalRow = isTotalRow && row.label === 'Tot'
                const rowBg = isTotalRow ? 'bg-gray-800' : rowIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900'

                return (
                  <tr key={isTotalRow ? row.label : row.hole}>
                    {/* Hole number / label — sticky left */}
                    <td
                      className={`sticky left-0 z-10 ${rowBg} border-r border-gray-700 text-center text-xs tabular-nums ${
                        isFinalRow ? 'font-bold text-white' : isTotalRow ? 'font-semibold text-gray-300' : 'text-gray-500'
                      }`}
                      style={HOLE_COL_STYLE}
                    >
                      <div className="flex items-center justify-center h-10">
                        {isTotalRow ? row.label : row.hole}
                      </div>
                    </td>

                    {/* Score cells — one per player */}
                    {members.map(member => {
                      if (isTotalRow) {
                        const val = holesTotal(scoreMap, member.userId, row.holes)
                        return (
                          <td key={member.userId} className={`${rowBg} text-center`} style={PLAYER_COL_STYLE}>
                            <div className={`flex items-center justify-center h-10 text-sm tabular-nums ${
                              isFinalRow ? 'font-bold text-white' : 'font-semibold text-gray-300'
                            }`}>
                              {val ?? <span className="text-gray-600">—</span>}
                            </div>
                          </td>
                        )
                      }

                      const canEdit = isOwner || member.userId === userId
                      const strokes = scoreMap[member.userId]?.[row.hole]
                      const scoreColor =
                        strokes === 1 ? 'text-yellow-300 font-bold' :
                        strokes !== undefined && strokes <= 2 ? 'text-green-400' :
                        strokes !== undefined && strokes >= 5 ? 'text-red-400' :
                        'text-white'

                      return (
                        <td
                          key={member.userId}
                          className={`${rowBg} text-center ${canEdit ? 'cursor-pointer active:bg-gray-700' : ''}`}
                          style={PLAYER_COL_STYLE}
                          onClick={canEdit ? () => handleCellTap(member, row.hole) : undefined}
                        >
                          <div className={`flex items-center justify-center h-10 text-sm tabular-nums select-none ${scoreColor}`}>
                            {strokes ?? <span className="text-gray-700">·</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Score entry bottom sheet ── */}
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
