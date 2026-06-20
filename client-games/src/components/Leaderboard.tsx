import type { LeaderboardEntry } from '../api'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  loading: boolean
  error: boolean
  currentPlayerName: string | null
  onClose?: () => void
}

export default function Leaderboard({ entries, loading, error, currentPlayerName, onClose }: LeaderboardProps) {
  return (
    <div className="bg-gray-800/95 rounded-2xl px-4 py-3 w-full max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-widest text-yellow-400 font-bold">Top 10</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
            aria-label="Close leaderboard"
          >
            ×
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-gray-500 text-sm text-center py-2">Could not load scores</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-2">No scores yet</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {entries.map((entry) => {
              const isMe = currentPlayerName !== null && entry.playerName === currentPlayerName
              return (
                <tr
                  key={entry.rank}
                  className={isMe ? 'text-yellow-300 font-semibold' : 'text-gray-300'}
                >
                  <td className="w-6 tabular-nums text-gray-500 pr-2">{entry.rank}</td>
                  <td className="flex-1 truncate max-w-[120px]">{entry.playerName}</td>
                  <td className="tabular-nums text-right pl-2">{entry.score.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
