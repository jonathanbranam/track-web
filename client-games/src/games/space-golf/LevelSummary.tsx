import Leaderboard from '../../components/Leaderboard'
import type { LeaderboardEntry } from '../../api'
import type { Level } from './levels'
import type { ScoreBreakdown } from './scoring'

interface LevelSummaryProps {
  level: Level
  breakdown: ScoreBreakdown
  isLast: boolean
  entries: LeaderboardEntry[]
  loading: boolean
  error: boolean
  playerName: string | null
  onNext: () => void
  onReplay: () => void
  onLevels: () => void
}

const primary =
  'rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700'
const secondary =
  'rounded-xl bg-gray-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-gray-600 active:bg-gray-800'

/** Shown when the ship dives into the wormhole: every score term, the total, and the level's leaderboard. */
export default function LevelSummary({
  level,
  breakdown: b,
  isLast,
  entries,
  loading,
  error,
  playerName,
  onNext,
  onReplay,
  onLevels,
}: LevelSummaryProps) {
  const rows: [string, string, number][] = [
    [`Stars ${b.stars}/${b.totalStars}`, '', b.starPoints],
    ...(b.allStarsBonus > 0 ? ([['All stars!', '', b.allStarsBonus]] as [string, string, number][]) : []),
    [`Hull left ${b.hull}`, '', b.hullPoints],
    [`Strokes ${b.strokes}`, '', -b.strokeCost],
    [`Power used ${b.power.toFixed(2)}`, '', -b.powerCost],
    ...(b.fuel > 0 ? ([[`Nudging ${b.fuel.toFixed(1)} s`, '', -b.fuelCost]] as [string, string, number][]) : []),
  ]

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center gap-3 overflow-y-auto bg-gray-900/85 px-4 backdrop-blur-sm"
      style={{ paddingTop: 'calc(var(--sat) + 2rem)', paddingBottom: 'calc(var(--sab) + 1rem)' }}
      data-testid="level-summary"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold">{isLast ? 'Course Complete' : 'Through the Wormhole'}</h2>
        <p className="mt-1 text-sm text-gray-400">{level.name}</p>
      </div>
      <table className="w-full max-w-xs text-sm tabular-nums">
        <tbody>
          {rows.map(([label, , pts]) => (
            <tr key={label} className="border-b border-gray-800">
              <td className="py-1.5 text-gray-300">{label}</td>
              <td className={`py-1.5 text-right font-semibold ${pts < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                {pts >= 0 ? '+' : '−'}
                {Math.abs(pts)}
              </td>
            </tr>
          ))}
          <tr>
            <td className="pt-2 text-base font-bold">Score</td>
            <td className="pt-2 text-right text-xl font-bold" data-testid="summary-total">
              {b.total.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
      <Leaderboard entries={entries} loading={loading} error={error} currentPlayerName={playerName} />
      <div className="flex flex-wrap justify-center gap-3">
        {!isLast && (
          <button onClick={onNext} className={primary}>
            Next level
          </button>
        )}
        <button onClick={onReplay} className={isLast ? primary : secondary}>
          Replay
        </button>
        <button onClick={onLevels} className={secondary}>
          Levels
        </button>
      </div>
    </div>
  )
}
