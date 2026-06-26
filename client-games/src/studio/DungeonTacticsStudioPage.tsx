import { Link, useNavigate } from 'react-router-dom'
import { DT_STUDIO_TOOLS } from './dungeonTactics'

// Dungeon Tactics studio hub: lists the game's authoring tools from
// DT_STUDIO_TOOLS. Available tools navigate; coming-soon tools render as a
// disabled card communicating the arc.
export default function DungeonTacticsStudioPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <Link to="/studio" className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Studio
        </Link>
        <span className="text-sm font-semibold">Dungeon Tactics</span>
        <span className="w-12" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-3">
          {DT_STUDIO_TOOLS.map((tool) => {
            const available = tool.status === 'available'
            return (
              <button
                key={tool.path}
                onClick={() => available && navigate(tool.path)}
                disabled={!available}
                className={`w-full text-left rounded-xl px-4 py-3 transition-colors ${
                  available
                    ? 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600'
                    : 'bg-gray-800/50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-semibold ${available ? '' : 'text-gray-500'}`}>{tool.label}</span>
                  {!available && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-300 bg-amber-500/15 rounded-full px-2 py-0.5">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className={`text-sm ${available ? 'text-gray-400' : 'text-gray-600'}`}>{tool.description}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
