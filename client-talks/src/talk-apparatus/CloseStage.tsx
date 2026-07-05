import { StatusValue } from './state'

interface CloseStageProps {
  statuses: Record<string, StatusValue>
}

const PREDICTED_POINTS = '0,10 50,40 100,70 150,95 200,115 250,130'
const ACTUAL_POINTS = '0,10 50,20 100,25 150,15 200,-5 250,-25'
const TRAJECTORY_POINTS = '0,10 50,5 100,-10 150,-30 200,-55 250,-85'

const BARS: { key: string; label: string }[] = [
  { key: 'barTyping', label: 'typing' },
  { key: 'barJudgment', label: 'judgment' },
  { key: 'barDesign', label: 'design' },
  { key: 'barReview', label: 'review' },
]

/** Close: the cold-open chart returns with an added trajectory line, then a typing-shrinks/judgment-grows bar animation, ending on a final hold. */
export default function CloseStage({ statuses }: CloseStageProps) {
  const showTrajectory = Boolean(statuses.chartTrajectory)
  const showBars = BARS.some((b) => b.key in statuses)
  const holdText = typeof statuses.closeHold === 'string' ? statuses.closeHold : null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 overflow-hidden px-10 pt-14 pb-16 font-mono text-slate-800">
      <svg viewBox="-10 -100 270 180" className="h-56 w-full max-w-2xl rounded border border-slate-300">
        <polyline points={PREDICTED_POINTS} fill="none" stroke="#64748b" strokeWidth={2} />
        <polyline points={ACTUAL_POINTS} fill="none" stroke="#059669" strokeWidth={2} />
        {showTrajectory && (
          <polyline
            points={TRAJECTORY_POINTS}
            fill="none"
            stroke="#d97706"
            strokeWidth={2}
            className="transition-opacity duration-700"
          />
        )}
      </svg>

      {showBars && (
        <div className="flex w-full max-w-md flex-col gap-2">
          {BARS.map(({ key, label }) => {
            const value = typeof statuses[key] === 'number' ? (statuses[key] as number) : 0
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-slate-500">{label}</span>
                <div className="h-3 flex-1 rounded-full border border-slate-300 bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {holdText && <div className="max-w-xl text-center text-lg text-slate-600">{holdText}</div>}
    </div>
  )
}
