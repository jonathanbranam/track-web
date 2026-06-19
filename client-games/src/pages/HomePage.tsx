import { useNavigate } from 'react-router-dom'
import { games } from '../games/registry'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Games</h1>
      <p className="text-gray-400 text-sm mb-6">Pick a game to play.</p>

      <div className="grid grid-cols-1 gap-3">
        {games.map((game) => (
          <button
            key={game.slug}
            onClick={() => navigate(`/game/${game.slug}`)}
            className="text-left bg-gray-800 hover:bg-gray-750 active:bg-gray-700 border border-gray-700 rounded-xl p-4 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-semibold">{game.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-indigo-300 bg-indigo-500/15 rounded-full px-2 py-0.5">
                {game.category === 'single-player' ? 'Solo' : 'Multiplayer'}
              </span>
            </div>
            <p className="text-sm text-gray-400">{game.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
