import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import type { GameRoom } from '../api'
import { getRoom, endRoom, deleteRoom } from '../api'

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

export default function GameRoomPage() {
  const { slug, code } = useParams<{ slug: string; code: string }>()
  const { userId } = useAuth()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function loadRoom() {
    if (!code) return
    getRoom(code)
      .then(setRoom)
      .catch(() => setError('Room not found'))
      .finally(() => setLoading(false))
  }

  useEffect(loadRoom, [code])

  const isParticipant = room?.players.some(p => p.id === userId) ?? false
  const isHost = room?.host.id === userId
  const isActive = room?.status === 'active'
  const isFinished = room?.status === 'finished'

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="mb-4">
        <Link to={`/game/${slug}/lobby`} className="text-xs text-indigo-400 hover:text-indigo-300">
          &larr; Lobby
        </Link>
        <h1 className="text-xl font-bold mt-1">
          {room?.name ?? 'Game Room'}
        </h1>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading...</p>}
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {room && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Players</span>
              <span className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 ${
                room.status === 'active' ? 'text-green-300 bg-green-500/15' :
                room.status === 'waiting' ? 'text-yellow-300 bg-yellow-500/15' :
                'text-gray-400 bg-gray-600/30'
              }`}>
                {room.status}
              </span>
            </div>
            <ul className="space-y-1">
              {room.players.map(p => (
                <li key={p.id} className="text-sm text-gray-200 flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{p.joinOrder}</span>
                  {p.displayName}
                  {p.id === room.host.id && (
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/15 rounded-full px-1.5">host</span>
                  )}
                  {room.currentTurnUserId === p.id && (
                    <span className="text-[10px] text-indigo-300 bg-indigo-500/15 rounded-full px-1.5">turn</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {isActive && (
            <div className="mt-3 p-3 bg-gray-700/50 rounded-lg text-center mb-3">
              <p className="text-sm text-gray-400">Game in progress</p>
              <p className="text-xs text-gray-500 mt-1">Game logic coming in a future update.</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2 items-center">
              {isActive && isParticipant && (
                <ConfirmButton
                  label="End Game"
                  confirmLabel="End game?"
                  className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                  confirmClassName="text-sm px-3 py-1 bg-red-700 hover:bg-red-600 rounded-lg font-medium"
                  onConfirm={async () => {
                    await endRoom(room.roomCode)
                    loadRoom()
                  }}
                />
              )}
              {isFinished && isHost && (
                <ConfirmButton
                  label="Delete"
                  confirmLabel="Delete?"
                  className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                  confirmClassName="text-sm px-3 py-1 bg-red-700 hover:bg-red-600 rounded-lg font-medium"
                  onConfirm={async () => {
                    await deleteRoom(room.roomCode)
                    window.history.back()
                  }}
                />
              )}
            </div>
            <span className="text-xs font-mono text-gray-500">{room.roomCode}</span>
          </div>
        </div>
      )}
    </div>
  )
}
