import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import type { GameRoom } from '../api'
import { listRooms, createRoom, joinRoom, startRoom, cancelRoom, endRoom } from '../api'
import { getGame } from '../games/registry'

const POLL_INTERVAL = 15_000

function elapsed(isoDate: string): string {
  const diff = Math.max(0, Date.now() - new Date(isoDate).getTime())
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

function ConfirmButton({
  label,
  confirmLabel = 'Confirm?',
  className = '',
  confirmClassName = '',
  onConfirm,
}: {
  label: string
  confirmLabel?: string
  className?: string
  confirmClassName?: string
  onConfirm: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(false)
    await onConfirm()
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className={className}>
        {label}
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1.5">
      <button onClick={handleConfirm} className={confirmClassName}>
        {confirmLabel}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-gray-500 hover:text-gray-300 px-1"
      >
        no
      </button>
    </span>
  )
}

function WaitingCard({
  room,
  userId,
  onAction,
}: {
  room: GameRoom
  userId: number
  onAction: () => void
}) {
  const isMember = room.players.some(p => p.id === userId)
  const isHost = room.host.id === userId
  const isFull = room.players.length >= room.desiredPlayers
  const canStart = isHost && room.players.length >= 2

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-gray-400">{room.roomCode}</span>
        <span className="text-[10px] uppercase tracking-wide text-yellow-300 bg-yellow-500/15 rounded-full px-2 py-0.5">
          Waiting
        </span>
      </div>
      <p className="text-sm font-semibold mb-1">{room.name}</p>
      <p className="text-sm text-gray-400 mb-1">
        Host: {room.host.displayName} &middot; {room.players.length}/{room.desiredPlayers} players
      </p>
      <p className="text-xs text-gray-500 mb-3">Created {elapsed(room.createdAt)}</p>

      <div className="flex gap-2 flex-wrap items-center">
        {!isMember && !isFull && (
          <button
            onClick={async () => { await joinRoom(room.roomCode); onAction() }}
            className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
          >
            Join
          </button>
        )}
        {isHost && (
          <>
            <button
              onClick={async () => { await startRoom(room.roomCode); onAction() }}
              disabled={!canStart}
              className="text-sm px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              Start Game
            </button>
            <ConfirmButton
              label="Cancel"
              confirmLabel="Cancel game?"
              className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
              confirmClassName="text-sm px-3 py-1 bg-red-700 hover:bg-red-600 rounded-lg font-medium"
              onConfirm={async () => { await cancelRoom(room.roomCode); onAction() }}
            />
          </>
        )}
      </div>
    </div>
  )
}

function ActiveCard({
  room,
  userId,
  slug,
  onAction,
}: {
  room: GameRoom
  userId: number
  slug: string
  onAction: () => void
}) {
  const navigate = useNavigate()
  const isMember = room.players.some(p => p.id === userId)
  const turnHolder = room.currentTurnUserId != null
    ? room.players.find(p => p.id === room.currentTurnUserId)
    : null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-gray-400">{room.roomCode}</span>
        <span className="text-[10px] uppercase tracking-wide text-green-300 bg-green-500/15 rounded-full px-2 py-0.5">
          Active
        </span>
      </div>
      <p className="text-sm font-semibold mb-1">{room.name}</p>
      <p className="text-sm text-gray-400 mb-1">
        {room.players.map(p => p.displayName).join(', ')}
      </p>
      {room.startedAt && (
        <p className="text-xs text-gray-500 mb-1">Started {elapsed(room.startedAt)}</p>
      )}
      {turnHolder && (
        <p className="text-xs text-indigo-300 mb-1">Turn: {turnHolder.displayName}</p>
      )}

      <div className="flex gap-2 flex-wrap items-center mt-3">
        {isMember && (
          <button
            onClick={() => navigate(`/game/${slug}/room/${room.roomCode}`)}
            className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
          >
            Join Game
          </button>
        )}
        {isMember && (
          <ConfirmButton
            label="End Game"
            confirmLabel="End game?"
            className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
            confirmClassName="text-sm px-3 py-1 bg-red-700 hover:bg-red-600 rounded-lg font-medium"
            onConfirm={async () => { await endRoom(room.roomCode); onAction() }}
          />
        )}
      </div>
    </div>
  )
}

function CompletedCard({
  room,
  slug,
}: {
  room: GameRoom
  slug: string
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-gray-500">{room.roomCode}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-600/30 rounded-full px-2 py-0.5">
          Finished
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-300 mb-1">{room.name}</p>
      <p className="text-sm text-gray-500 mb-1">
        {room.players.map(p => p.displayName).join(', ')}
      </p>
      {room.startedAt && (
        <p className="text-xs text-gray-600 mb-3">Played {elapsed(room.startedAt)}</p>
      )}
      <button
        onClick={() => navigate(`/game/${slug}/room/${room.roomCode}`)}
        className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg"
      >
        View
      </button>
    </div>
  )
}

export default function LobbyPage() {
  const { slug } = useParams<{ slug: string }>()
  const { userId } = useAuth()
  const game = slug ? getGame(slug) : undefined

  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewGame, setShowNewGame] = useState(false)
  const [newGamePlayers, setNewGamePlayers] = useState(2)
  const [newGameName, setNewGameName] = useState('')
  const [creating, setCreating] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchRef = useRef<() => void>(() => {})

  const fetchRooms = useCallback(async () => {
    if (!slug) return
    try {
      const data = await listRooms(slug)
      setRooms(data)
      setError(null)
    } catch {
      setError('Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }, [slug])

  fetchRef.current = fetchRooms

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => fetchRef.current(), POLL_INTERVAL)
  }

  function handleRefresh() {
    fetchRooms()
    startPolling()
  }

  useEffect(() => {
    fetchRooms()
    startPolling()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchRooms])

  async function handleCreateRoom() {
    if (!slug) return
    setCreating(true)
    try {
      await createRoom(slug, newGamePlayers, newGameName.trim())
      setShowNewGame(false)
      setNewGameName('')
      await fetchRooms()
      startPolling()
    } catch {
      setError('Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const waiting = rooms.filter(r => r.status === 'waiting')
  const active = rooms.filter(r => r.status === 'active')
  const finished = rooms.filter(r => r.status === 'finished')

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to="/" className="text-xs text-indigo-400 hover:text-indigo-300">&larr; Games</Link>
          <h1 className="text-xl font-bold mt-1">{game?.name ?? slug} &mdash; Lobby</h1>
        </div>
        <button
          onClick={handleRefresh}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">{error}</div>
      )}

      <div className="mb-4">
        {showNewGame ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">New Game</h2>
            <label className="text-xs text-gray-400 block mb-1">Name</label>
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. Friday night run"
              value={newGameName}
              onChange={e => setNewGameName(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm mb-3 border border-gray-600 placeholder-gray-500"
            />
            <label className="text-xs text-gray-400 block mb-1">Players</label>
            <input
              type="number"
              min={2}
              max={8}
              value={newGamePlayers}
              onChange={e => setNewGamePlayers(Math.max(2, Math.min(8, Number(e.target.value))))}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm mb-3 border border-gray-600"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateRoom}
                disabled={creating || !newGameName.trim()}
                className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg font-medium"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowNewGame(false)}
                className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewGame(true)}
            className="w-full text-sm py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium"
          >
            + New Game
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading rooms...</p>
      ) : (
        <>
          {waiting.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Waiting</h2>
              <div className="grid gap-3">
                {waiting.map(room => (
                  <WaitingCard
                    key={room.roomCode}
                    room={room}
                    userId={userId!}
                    onAction={handleRefresh}
                  />
                ))}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">In Progress</h2>
              <div className="grid gap-3">
                {active.map(room => (
                  <ActiveCard
                    key={room.roomCode}
                    room={room}
                    userId={userId!}
                    slug={slug!}
                    onAction={handleRefresh}
                  />
                ))}
              </div>
            </section>
          )}

          {waiting.length === 0 && active.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No open games. Create one to get started!
            </p>
          )}

          {finished.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Completed</h2>
              <div className="grid gap-3">
                {finished.map(room => (
                  <CompletedCard
                    key={room.roomCode}
                    room={room}
                    slug={slug!}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
