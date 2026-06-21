import { Link, useNavigate } from 'react-router-dom'
import { prototypes } from './registry'

export default function PrototypesPickerPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Games
        </Link>
        <span className="text-sm font-semibold">Prototypes</span>
        <span className="w-12" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {prototypes.length === 0 ? (
          <p className="text-gray-400 text-center mt-8">No prototypes registered.</p>
        ) : (
          <div className="space-y-3">
            {prototypes.map((proto) => (
              <button
                key={proto.slug}
                onClick={() => navigate(`/game/prototypes/${proto.slug}`)}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="font-semibold">{proto.name}</div>
                <div className="text-sm text-gray-400 mt-0.5">{proto.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
