import { useNavigate } from 'react-router-dom'
import { STUDIO_GAMES } from './registry'

// Generic studio hub: lists the games that offer a studio, each linking to its
// own hub. Driven by STUDIO_GAMES so adding a game is a one-line registry edit.
export default function StudioHomePage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Studio</h1>
      <p className="text-gray-400 text-sm mb-6">Design tools for building game content.</p>

      <div className="grid grid-cols-1 gap-3">
        {STUDIO_GAMES.map((game) => (
          <button
            key={game.slug}
            onClick={() => navigate(game.hubPath)}
            className="text-left bg-gray-800 hover:bg-gray-750 active:bg-gray-700 border border-gray-700 rounded-xl p-4 transition-colors"
          >
            <span className="text-lg font-semibold">{game.name}</span>
            <p className="text-sm text-gray-400 mt-0.5">Open studio</p>
          </button>
        ))}
      </div>
    </div>
  )
}
