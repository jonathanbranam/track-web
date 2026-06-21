import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { GameRoom } from '../api'
import { getRoom } from '../api'

export default function GameRoomPage() {
  const { slug, code } = useParams<{ slug: string; code: string }>()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    getRoom(code)
      .then(setRoom)
      .catch(() => setError('Room not found'))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="mb-4">
        <Link to={`/game/${slug}/lobby`} className="text-xs text-indigo-400 hover:text-indigo-300">
          ← Lobby
        </Link>
        <h1 className="text-xl font-bold mt-1">Game Room</h1>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {room && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="mb-3">
            <span className="text-xs text-gray-400">Room Code</span>
            <p className="text-lg font-mono font-bold">{room.roomCode}</p>
          </div>
          <div className="mb-3">
            <span className="text-xs text-gray-400">Game</span>
            <p className="text-sm font-semibold">{room.gameSlug}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Players</span>
            <ul className="mt-1 space-y-1">
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

          <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-center">
            <p className="text-sm text-gray-400">Game in progress</p>
            <p className="text-xs text-gray-500 mt-1">Game logic coming in a future update.</p>
          </div>
        </div>
      )}
    </div>
  )
}
