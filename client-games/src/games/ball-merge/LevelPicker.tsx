import { useEffect, useState } from 'react'
import { LEVELS, type LevelDef } from './levels'
import { fetchLeaderboard, type LeaderboardEntry } from '../../api'

const GAME_SLUG = 'ball-merge'
const MODE = 'classic'

interface Props {
  initialLevelId: string
  onConfirm: (levelId: string) => void
  onShowLeaderboard: (levelId: string) => void
}

function DifficultyBadge({ difficulty }: { difficulty: LevelDef['difficulty'] }) {
  if (!difficulty) return null
  const label = difficulty === 'danger' ? 'Danger' : 'Hard'
  const cls =
    difficulty === 'danger'
      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  )
}

export default function LevelPicker({ initialLevelId, onConfirm, onShowLeaderboard }: Props) {
  const [selectedId, setSelectedId] = useState(initialLevelId)
  const [levelScores, setLevelScores] = useState<Record<string, LeaderboardEntry | null>>({})

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        LEVELS.map((level) => fetchLeaderboard(GAME_SLUG, MODE, level.id, 1))
      )
      const scores: Record<string, LeaderboardEntry | null> = {}
      results.forEach((result, i) => {
        const levelId = LEVELS[i].id
        if (result.status === 'fulfilled' && result.value.length > 0) {
          scores[levelId] = result.value[0]
        } else {
          scores[levelId] = null
        }
      })
      setLevelScores(scores)
    }
    fetchAll()
  }, [])

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-1">Choose Level</h2>
      <p className="text-gray-400 text-sm mb-5">Select a container shape</p>

      <div className="w-full max-w-xs flex flex-col gap-2 mb-6">
        {LEVELS.map((level) => {
          const selected = level.id === selectedId
          const topEntry = levelScores[level.id]
          return (
            <button
              key={level.id}
              onClick={() => setSelectedId(level.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${
                selected
                  ? 'bg-indigo-600/30 border-indigo-500 text-white'
                  : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium">{level.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onShowLeaderboard(level.id)
                  }}
                  className="text-left text-[11px] text-yellow-400/80 hover:text-yellow-300 active:text-yellow-500"
                >
                  {topEntry === undefined
                    ? null
                    : topEntry === null
                      ? 'No scores yet'
                      : `${topEntry.playerName} · ${topEntry.score.toLocaleString()}`}
                </button>
              </div>
              <DifficultyBadge difficulty={level.difficulty} />
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onConfirm(selectedId)}
        className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl px-10 py-3 transition-colors"
      >
        Play
      </button>
    </div>
  )
}
