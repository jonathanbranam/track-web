import { Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGame } from '../games/registry'

export default function GamePage() {
  const { slug } = useParams<{ slug: string }>()
  const game = slug ? getGame(slug) : undefined

  if (!game) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <h1 className="text-xl font-bold mb-2">Game not found</h1>
        <p className="text-gray-400 mb-6">No game matches “{slug}”.</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
          ← Back to games
        </Link>
      </div>
    )
  }

  const GameComponent = game.mount

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Games
        </Link>
        <span className="text-sm font-semibold">{game.name}</span>
        <span className="w-12" />
      </div>
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading…</div>}
        >
          <GameComponent />
        </Suspense>
      </div>
    </div>
  )
}
