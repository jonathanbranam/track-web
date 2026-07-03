import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@repo/auth'
import { api } from '../api'
import { useChrome } from '../chrome'
import { gameDefaultFor } from '../gameDefaults'
import type { ScoreGame, ConnectedUser, NewPlayer } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** roundNumber → playerId → value */
function indexScores(game: ScoreGame): Map<number, Map<number, number>> {
  const rounds = new Map<number, Map<number, number>>()
  for (const s of game.scores) {
    if (!rounds.has(s.roundNumber)) rounds.set(s.roundNumber, new Map())
    rounds.get(s.roundNumber)!.set(s.playerId, s.value)
  }
  return rounds
}

function roundNumbers(game: ScoreGame): number[] {
  return [...new Set(game.scores.map(s => s.roundNumber))].sort((a, b) => a - b)
}

function playerTotal(game: ScoreGame, playerId: number): number {
  return game.scores.filter(s => s.playerId === playerId).reduce((sum, s) => sum + s.value, 0)
}

function nextRoundNumber(game: ScoreGame): number {
  const nums = roundNumbers(game)
  return (nums.length ? Math.max(...nums) : 0) + 1
}

function isFull(game: ScoreGame): boolean {
  return game.targetRounds != null && roundNumbers(game).length >= game.targetRounds
}

/** Rank players by total desc; returns the leading total (for winner highlight). */
function leaderTotal(game: ScoreGame): number | null {
  if (!game.players.length || !game.scores.length) return null
  return Math.max(...game.players.map(p => playerTotal(game, p.id)))
}

// ── Setup view ──────────────────────────────────────────────────────────────

interface SetupPrefill {
  name: string
  targetRounds: number | null
  players: NewPlayer[]
}

function SetupView({
  gameNames,
  connections,
  me,
  prefill,
  onCancel,
  onCreate,
}: {
  gameNames: string[]
  connections: ConnectedUser[]
  me: { id: number; name: string } | null
  prefill?: SetupPrefill
  onCancel: () => void
  onCreate: (name: string, targetRounds: number | null, players: NewPlayer[]) => Promise<void>
}) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [roundsText, setRoundsText] = useState(
    prefill?.targetRounds != null ? String(prefill.targetRounds) : ''
  )
  // Once the user edits the round field (or a prefill provided one), autofill
  // must not overwrite it.
  const [roundsTouched, setRoundsTouched] = useState(prefill?.targetRounds != null)

  // Set the game name and, for a known game, autofill its default round count
  // — but only into an untouched round field.
  const applyName = (next: string) => {
    setName(next)
    if (!roundsTouched) {
      const def = gameDefaultFor(next)
      setRoundsText(def ? String(def.rounds) : '')
    }
  }
  // For a brand-new game, seed the player list with the creator; editing an
  // existing setup keeps that game's players as-is.
  const [players, setPlayers] = useState<NewPlayer[]>(
    prefill?.players ?? (me ? [{ userId: me.id, name: me.name }] : [])
  )
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addFreeform = () => {
    const n = newName.trim()
    if (!n) return
    setPlayers(prev => [...prev, { name: n }])
    setNewName('')
  }

  const addConnection = (u: ConnectedUser) => {
    setPlayers(prev => [...prev, { userId: u.id, name: u.displayName || u.email }])
  }

  const addMe = () => {
    if (!me) return
    setPlayers(prev => [...prev, { userId: me.id, name: me.name }])
  }

  const removePlayer = (i: number) => setPlayers(prev => prev.filter((_, idx) => idx !== i))

  const usedUserIds = new Set(players.map(p => p.userId).filter(Boolean))
  const availableConns = connections.filter(u => !usedUserIds.has(u.id))
  const meAvailable = me != null && !usedUserIds.has(me.id)

  const submit = async () => {
    setError('')
    if (!name.trim()) { setError('Enter a game name.'); return }
    if (players.length < 1) { setError('Add at least one player.'); return }
    const target = roundsText.trim() ? parseInt(roundsText, 10) : null
    if (target != null && (isNaN(target) || target < 1)) { setError('Rounds must be 1 or more, or blank for unlimited.'); return }
    setSaving(true)
    try {
      await onCreate(name.trim(), target, players)
    } catch {
      setError('Could not start the game. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto px-4 py-4 gap-5">
      <h1 className="text-xl font-bold text-white">{prefill ? 'Edit setup' : 'New game'}</h1>

      {/* Game name */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Game</label>
        <input
          className="bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
          placeholder="e.g. Sushi Go"
          value={name}
          list="game-names"
          onChange={e => applyName(e.target.value)}
        />
        <datalist id="game-names">
          {gameNames.map(n => <option key={n} value={n} />)}
        </datalist>
        {gameNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {gameNames.slice(0, 12).map(n => (
              <button
                key={n}
                onClick={() => applyName(n)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  name === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-700 text-gray-300 active:bg-gray-800'
                }`}
              >{n}</button>
            ))}
          </div>
        )}
      </div>

      {/* Rounds */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Rounds <span className="text-gray-600">(blank = unlimited)</span></label>
        <input
          className="bg-gray-800 text-white rounded-lg px-3 py-2 w-32 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
          placeholder="∞"
          inputMode="numeric"
          value={roundsText}
          onChange={e => { setRoundsTouched(true); setRoundsText(e.target.value.replace(/[^0-9]/g, '')) }}
        />
      </div>

      {/* Players */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Players</label>
        {players.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {players.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-white text-sm">
                  {p.name}
                  {me && p.userId === me.id
                    ? <span className="ml-2 text-[10px] text-indigo-400 uppercase">you</span>
                    : p.userId ? <span className="ml-2 text-[10px] text-indigo-400 uppercase">connected</span> : null}
                </span>
                <button onClick={() => removePlayer(i)} className="text-gray-500 hover:text-red-400 text-lg leading-none">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
            placeholder="Add player by name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addFreeform() }}
          />
          <button onClick={addFreeform} className="bg-indigo-600 text-white px-4 rounded-lg active:bg-indigo-500">Add</button>
        </div>

        {(meAvailable || availableConns.length > 0) && (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-xs text-gray-500">Add players</span>
            <div className="flex flex-wrap gap-1.5">
              {meAvailable && (
                <button
                  onClick={addMe}
                  className="text-xs px-2.5 py-1 rounded-full border border-indigo-500 text-indigo-300 active:bg-gray-800"
                >+ {me!.name} (you)</button>
              )}
              {availableConns.map(u => (
                <button
                  key={u.id}
                  onClick={() => addConnection(u)}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-700 text-gray-300 active:bg-gray-800"
                >+ {u.displayName || u.email}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2 mt-auto pt-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 active:bg-gray-700">Cancel</button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50 active:bg-indigo-500"
        >{saving ? 'Starting…' : 'Start game'}</button>
      </div>
    </div>
  )
}

// ── Scoreboard (shared by play + results) ────────────────────────────────────

function Scoreboard({ game }: { game: ScoreGame }) {
  const byRound = useMemo(() => indexScores(game), [game])
  const rounds = useMemo(() => roundNumbers(game), [game])
  const top = leaderTotal(game)

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-gray-900 text-gray-500 font-normal text-xs px-2 py-2 text-left">#</th>
            {game.players.map(p => (
              <th key={p.id} className="px-2 py-2 text-center font-semibold text-white whitespace-nowrap">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map(rn => (
            <tr key={rn} className="border-t border-gray-800">
              <td className="sticky left-0 bg-gray-900 text-gray-500 text-xs px-2 py-2">{rn}</td>
              {game.players.map(p => {
                const v = byRound.get(rn)?.get(p.id)
                return (
                  <td key={p.id} className="px-2 py-2 text-center tabular-nums text-gray-200">
                    {v === undefined ? <span className="text-gray-700">·</span> : v}
                  </td>
                )
              })}
            </tr>
          ))}
          {rounds.length === 0 && (
            <tr><td colSpan={game.players.length + 1} className="text-center text-gray-600 py-4 text-xs">No rounds yet</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-700">
            <td className="sticky left-0 bg-gray-900 text-xs font-semibold text-gray-400 px-2 py-2">Tot</td>
            {game.players.map(p => {
              const t = playerTotal(game, p.id)
              const winning = top != null && t === top && game.scores.length > 0
              return (
                <td key={p.id} className={`px-2 py-2 text-center tabular-nums font-bold ${winning ? 'text-yellow-300' : 'text-white'}`}>
                  {t}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Round entry ──────────────────────────────────────────────────────────────

function sanitizeInt(raw: string): string {
  let s = raw.replace(/[^0-9-]/g, '')
  // Only a leading minus
  s = s.replace(/(?!^)-/g, '')
  return s
}

function RoundEntry({
  game,
  roundNumber,
  initial,
  onSave,
  onCancelEdit,
  saving,
}: {
  game: ScoreGame
  roundNumber: number
  initial?: Map<number, number>
  onSave: (scores: { playerId: number; value: number }[]) => void
  onCancelEdit?: () => void
  saving: boolean
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>(() => {
    const d: Record<number, string> = {}
    for (const p of game.players) d[p.id] = initial?.has(p.id) ? String(initial.get(p.id)) : ''
    return d
  })

  const setDraft = (playerId: number, raw: string) =>
    setDrafts(prev => ({ ...prev, [playerId]: sanitizeInt(raw) }))

  const toggleSign = (playerId: number) =>
    setDrafts(prev => {
      const cur = prev[playerId] ?? ''
      if (!cur || cur === '-') return { ...prev, [playerId]: cur === '-' ? '' : '-' + cur }
      return { ...prev, [playerId]: cur.startsWith('-') ? cur.slice(1) : '-' + cur }
    })

  const save = () => {
    const scores = game.players.map(p => {
      const raw = drafts[p.id]?.trim()
      const value = raw && raw !== '-' ? parseInt(raw, 10) : 0
      return { playerId: p.id, value }
    })
    onSave(scores)
  }

  return (
    <div className="flex-none border-t border-gray-800 bg-gray-900 px-4 pt-3 pb-4"
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">
          {onCancelEdit ? `Edit round ${roundNumber}` : `Round ${roundNumber}`}
        </span>
        {onCancelEdit && (
          <button onClick={onCancelEdit} className="text-xs text-gray-400">Cancel edit</button>
        )}
      </div>
      {/* p-1 / -mx-1: give the inputs' focus ring room so overflow-auto doesn't clip it */}
      <div className="flex flex-col gap-2 max-h-[35vh] overflow-auto p-1 -mx-1">
        {game.players.map(p => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="flex-1 text-sm text-gray-200 truncate">{p.name}</span>
            <button
              onClick={() => toggleSign(p.id)}
              className="w-9 h-9 rounded-lg bg-gray-800 text-gray-300 text-lg active:bg-gray-700"
              aria-label="Toggle sign"
            >±</button>
            <input
              className="w-20 bg-gray-800 text-white text-center rounded-lg px-2 py-2 tabular-nums outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
              placeholder="0"
              inputMode="numeric"
              value={drafts[p.id] ?? ''}
              onChange={e => setDraft(p.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full mt-3 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50 active:bg-indigo-500"
      >{saving ? 'Saving…' : onCancelEdit ? 'Save changes' : 'Save round'}</button>
    </div>
  )
}

// ── Play view ────────────────────────────────────────────────────────────────

function PlayView({
  game,
  onChange,
  onComplete,
  onDiscard,
  onBack,
}: {
  game: ScoreGame
  onChange: (g: ScoreGame) => void
  onComplete: (g: ScoreGame) => void
  onDiscard: (g: ScoreGame) => void
  onBack: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [editingRound, setEditingRound] = useState<number | null>(null)
  const full = isFull(game)
  const entryRound = editingRound ?? nextRoundNumber(game)
  const byRound = useMemo(() => indexScores(game), [game])

  const saveRound = useCallback(async (scores: { playerId: number; value: number }[]) => {
    setSaving(true)
    try {
      const { game: updated } = await api.scoreGames.putRound(game.id, entryRound, scores)
      onChange(updated)
      setEditingRound(null)
    } catch { /* keep form */ } finally {
      setSaving(false)
    }
  }, [game.id, entryRound, onChange])

  const finish = useCallback(async () => {
    const msg = game.targetRounds != null && !full
      ? 'End the game early? The scores entered so far will be final.'
      : 'Finish this game and see the final results?'
    if (!window.confirm(msg)) return
    setSaving(true)
    try {
      const { game: done } = await api.scoreGames.complete(game.id)
      onComplete(done)
    } catch { setSaving(false) }
  }, [game.id, game.targetRounds, full, onComplete])

  const discard = useCallback(async () => {
    if (!window.confirm('Discard this game? All scores will be permanently deleted.')) return
    setSaving(true)
    try {
      await api.scoreGames.delete(game.id)
      onDiscard(game)
    } catch { setSaving(false) }
  }, [game, onDiscard])

  const completeLabel = game.targetRounds == null ? 'Done' : full ? 'Finish game' : 'End game early'
  const rounds = roundNumbers(game)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-4 pt-3 pb-2 border-b border-gray-800 flex items-center gap-2">
        <button onClick={onBack} className="text-gray-400 text-sm">‹ Games</button>
        <div className="flex-1 text-center">
          <div className="text-white font-semibold leading-tight">{game.name}</div>
          <div className="text-[11px] text-gray-500">
            {game.targetRounds == null
              ? `Round ${rounds.length + (full ? 0 : 1)} · unlimited`
              : `Round ${Math.min(rounds.length + 1, game.targetRounds)} of ${game.targetRounds}`}
          </div>
        </div>
        <button onClick={finish} disabled={saving} className="text-sm text-indigo-400 disabled:opacity-50">{completeLabel}</button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2 min-h-0">
        <Scoreboard game={game} />
        {rounds.length > 0 && (
          <div className="mt-3 px-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-600 w-full">Tap a round to edit:</span>
            {rounds.map(rn => (
              <button
                key={rn}
                onClick={() => setEditingRound(rn)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  editingRound === rn ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-700 text-gray-300'
                }`}
              >R{rn}</button>
            ))}
          </div>
        )}
        <div className="mt-4 px-2">
          <button onClick={discard} disabled={saving} className="text-xs text-red-400/80 active:text-red-400 disabled:opacity-50">
            Quit &amp; discard game
          </button>
        </div>
      </div>

      {full && editingRound == null ? (
        <div className="flex-none border-t border-gray-800 px-4 py-4 text-center"
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
          <p className="text-sm text-gray-300 mb-3">🏁 All {game.targetRounds} rounds complete.</p>
          <button onClick={finish} disabled={saving} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50 active:bg-indigo-500">
            {saving ? 'Finishing…' : 'See final results'}
          </button>
        </div>
      ) : (
        <RoundEntry
          key={entryRound + (editingRound != null ? '-edit' : '')}
          game={game}
          roundNumber={entryRound}
          initial={editingRound != null ? byRound.get(editingRound) : undefined}
          onSave={saveRound}
          onCancelEdit={editingRound != null ? () => setEditingRound(null) : undefined}
          saving={saving}
        />
      )}
    </div>
  )
}

// ── Results view ─────────────────────────────────────────────────────────────

function ResultsView({
  game,
  onNewGame,
  onEditSetup,
  onBack,
}: {
  game: ScoreGame
  onNewGame: () => void
  onEditSetup: () => void
  onBack: () => void
}) {
  const ranked = [...game.players].sort((a, b) => playerTotal(game, b.id) - playerTotal(game, a.id))
  const top = leaderTotal(game)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-4 pt-3 pb-2 border-b border-gray-800 flex items-center gap-2">
        <button onClick={onBack} className="text-gray-400 text-sm">‹ Games</button>
        <div className="flex-1 text-center text-white font-semibold">{game.name}</div>
        <span className="w-16" />
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <h2 className="text-lg font-bold text-white mb-3">Final results</h2>
        <div className="flex flex-col gap-1.5 mb-5">
          {ranked.map((p, i) => {
            const t = playerTotal(game, p.id)
            const winner = top != null && t === top
            return (
              <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${winner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-800'}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-5 text-center text-sm ${winner ? 'text-yellow-300' : 'text-gray-500'}`}>{winner ? '🏆' : i + 1}</span>
                  <span className="text-white">{p.name}</span>
                </span>
                <span className={`tabular-nums font-bold ${winner ? 'text-yellow-300' : 'text-white'}`}>{t}</span>
              </div>
            )
          })}
        </div>

        <details className="mb-4">
          <summary className="text-sm text-gray-400 cursor-pointer">Round-by-round</summary>
          <div className="mt-2 -mx-1"><Scoreboard game={game} /></div>
        </details>
      </div>

      <div className="flex-none border-t border-gray-800 px-4 py-4 flex flex-col gap-2"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
        <button onClick={onNewGame} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold active:bg-indigo-500">
          New game · same players &amp; rules
        </button>
        <button onClick={onEditSetup} className="w-full py-3 rounded-xl bg-gray-800 text-gray-200 active:bg-gray-700">
          Edit setup
        </button>
      </div>
    </div>
  )
}

// ── History row (swipe left to reveal → confirm delete) ───────────────────────
// Mirrors the proven pattern in client-time/src/pages/LogPage.tsx: pointer
// events with capture, touchAction 'pan-y' so vertical scroll stays native, an
// OPAQUE card sliding over a red delete backdrop, and a swipe past threshold
// that flips the row into an inline Cancel/Delete confirmation.

const SWIPE_THRESHOLD = 80  // px of left-drag past which delete is requested

function HistoryRow({ game, confirming, onView, onRequestDelete, onCancelDelete, onConfirmDelete }: {
  game: ScoreGame
  confirming: boolean
  onView: (g: ScoreGame) => void
  onRequestDelete: (id: number) => void
  onCancelDelete: () => void
  onConfirmDelete: (g: ScoreGame) => void
}) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isScroll = useRef<boolean | null>(null)
  const moved = useRef(false)

  function down(e: React.PointerEvent) {
    startX.current = e.clientX
    startY.current = e.clientY
    isScroll.current = null
    moved.current = false
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent) {
    if (!isDragging) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (isScroll.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isScroll.current = Math.abs(dy) > Math.abs(dx)
    }
    if (isScroll.current) return  // vertical → let the list scroll
    moved.current = true
    setDragX(Math.max(-120, Math.min(0, dx)))  // left-only
  }
  function up() {
    setIsDragging(false)
    if (!isScroll.current && dragX <= -SWIPE_THRESHOLD) onRequestDelete(game.id)
    setDragX(0)
  }

  if (confirming) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-white text-sm font-medium mb-3">Delete “{game.name}”? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancelDelete} className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-200 active:bg-gray-600">Cancel</button>
          <button onClick={() => onConfirmDelete(game)} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold active:bg-red-500">Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Red delete backdrop, revealed as the card slides left */}
      <div className="absolute inset-y-0 right-0 w-[120px] bg-red-600 flex items-center justify-end pr-4 text-white text-sm font-medium">
        Delete
      </div>

      {/* Opaque card slides over the backdrop */}
      <button
        onClick={() => { if (!moved.current) onView(game) }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative w-full text-left bg-gray-800 px-3 py-3 active:bg-gray-700"
        style={{ transform: `translateX(${dragX}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease', touchAction: 'pan-y' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-200 font-medium">{game.name}</span>
          <span className="text-xs text-gray-500">{game.completedAt ? new Date(game.completedAt + 'Z').toLocaleDateString() : ''}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{game.players.map(p => p.name).join(', ')}</div>
      </button>
    </div>
  )
}

// ── List / landing view ──────────────────────────────────────────────────────

function ListView({
  games,
  onResume,
  onView,
  onDelete,
  onNew,
}: {
  games: ScoreGame[]
  onResume: (g: ScoreGame) => void
  onView: (g: ScoreGame) => void
  onDelete: (g: ScoreGame) => void
  onNew: () => void
}) {
  const active = games.filter(g => g.status === 'active')
  const completed = games.filter(g => g.status === 'completed')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  return (
    <div className="flex flex-col h-full overflow-auto px-4 py-4 gap-5">
      {/* Title only — the "New game" button lives below so it never overlaps the fixed user pill */}
      <h1 className="text-xl font-bold text-white pr-12">Score tracker</h1>

      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">In progress</span>
          {active.map(g => (
            <button key={g.id} onClick={() => onResume(g)} className="text-left bg-gray-800 rounded-lg px-3 py-3 active:bg-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{g.name}</span>
                <span className="text-xs text-indigo-400">Resume ›</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {g.players.map(p => p.name).join(', ')}
              </div>
            </button>
          ))}
        </div>
      )}

      <button onClick={onNew} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold active:bg-indigo-500">
        + New game
      </button>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-500">History</span>
        {completed.length === 0 ? (
          <p className="text-sm text-gray-600">No finished games yet.</p>
        ) : (
          <>
            {completed.map(g => (
              <HistoryRow
                key={g.id}
                game={g}
                confirming={confirmingId === g.id}
                onView={onView}
                onRequestDelete={setConfirmingId}
                onCancelDelete={() => setConfirmingId(null)}
                onConfirmDelete={(game) => { setConfirmingId(null); onDelete(game) }}
              />
            ))}
            <p className="text-[11px] text-gray-600 mt-0.5">Swipe a game left to delete.</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────

type View =
  | { kind: 'list' }
  | { kind: 'setup'; prefill?: SetupPrefill }
  | { kind: 'play'; gameId: number }
  | { kind: 'results'; gameId: number }

export default function ScorePage() {
  const { userId, displayName, email } = useAuth()
  const me = userId != null ? { id: userId, name: displayName || email || 'Me' } : null
  const { setChromeHidden } = useChrome()
  const [games, setGames] = useState<ScoreGame[]>([])
  const [gameNames, setGameNames] = useState<string[]>([])
  const [connections, setConnections] = useState<ConnectedUser[]>([])
  const [view, setView] = useState<View>({ kind: 'list' })
  const [loading, setLoading] = useState(true)

  // Hide the floating user pill while a game is open (play/results) so it never
  // overlaps the scoreboard; restore it on list/setup and when leaving the tab.
  useEffect(() => {
    setChromeHidden(view.kind === 'play' || view.kind === 'results')
    return () => setChromeHidden(false)
  }, [view.kind, setChromeHidden])

  const reloadGames = useCallback(async () => {
    const { games } = await api.scoreGames.list()
    setGames(games)
    return games
  }, [])

  useEffect(() => {
    Promise.all([
      api.scoreGames.list().then(r => setGames(r.games)).catch(() => {}),
      api.gameNames.list().then(r => setGameNames(r.names)).catch(() => {}),
      api.social.connectable().then(setConnections).catch(() => setConnections([])),
    ]).finally(() => setLoading(false))
  }, [])

  const upsertGame = useCallback((g: ScoreGame) => {
    setGames(prev => {
      const idx = prev.findIndex(x => x.id === g.id)
      if (idx === -1) return [g, ...prev]
      const copy = [...prev]; copy[idx] = g; return copy
    })
  }, [])

  const removeGame = useCallback((id: number) => {
    setGames(prev => prev.filter(g => g.id !== id))
  }, [])

  const currentGame = (id: number) => games.find(g => g.id === id)

  const handleCreate = useCallback(async (name: string, targetRounds: number | null, players: NewPlayer[]) => {
    const { game } = await api.scoreGames.create(name, targetRounds, players)
    upsertGame(game)
    if (!gameNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      setGameNames(prev => [...prev, name].sort((a, b) => a.localeCompare(b)))
    }
    setView({ kind: 'play', gameId: game.id })
  }, [upsertGame, gameNames])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  if (view.kind === 'setup') {
    return (
      <SetupView
        gameNames={gameNames}
        connections={connections}
        me={me}
        prefill={view.prefill}
        onCancel={() => setView({ kind: 'list' })}
        onCreate={handleCreate}
      />
    )
  }

  if (view.kind === 'play') {
    const game = currentGame(view.gameId)
    if (!game) { setView({ kind: 'list' }); return null }
    return (
      <PlayView
        game={game}
        onChange={upsertGame}
        onComplete={(g) => { upsertGame(g); setView({ kind: 'results', gameId: g.id }) }}
        onDiscard={(g) => { removeGame(g.id); setView({ kind: 'list' }) }}
        onBack={() => { reloadGames().catch(() => {}); setView({ kind: 'list' }) }}
      />
    )
  }

  if (view.kind === 'results') {
    const game = currentGame(view.gameId)
    if (!game) { setView({ kind: 'list' }); return null }
    const prefill: SetupPrefill = {
      name: game.name,
      targetRounds: game.targetRounds,
      players: game.players.map(p => ({ userId: p.userId, name: p.name })),
    }
    return (
      <ResultsView
        game={game}
        onNewGame={async () => {
          await handleCreate(prefill.name, prefill.targetRounds, prefill.players)
        }}
        onEditSetup={() => setView({ kind: 'setup', prefill })}
        onBack={() => setView({ kind: 'list' })}
      />
    )
  }

  return (
    <ListView
      games={games}
      onResume={(g) => setView({ kind: 'play', gameId: g.id })}
      onView={(g) => setView({ kind: 'results', gameId: g.id })}
      onDelete={(g) => {
        removeGame(g.id)  // optimistic
        api.scoreGames.delete(g.id).catch(() => { reloadGames().catch(() => {}) })
      }}
      onNew={() => setView({ kind: 'setup' })}
    />
  )
}
