import { StatusValue } from './state'

interface ColdOpenStageProps {
  statuses: Record<string, StatusValue>
}

const PREDICTED_POINTS = '0,10 50,40 100,70 150,95 200,115 250,130'
const ACTUAL_POINTS = '0,10 50,20 100,25 150,15 200,-5 250,-25'

/** Cold open: an expiring-headline ticker, then the two-line divergence chart, ending on a static hold. */
export default function ColdOpenStage({ statuses }: ColdOpenStageProps) {
  const headline = typeof statuses.tickerHeadline === 'string' ? statuses.tickerHeadline : null
  const chartRevealed = Boolean(statuses.chartRevealed)
  const holdText = typeof statuses.coldOpenHold === 'string' ? statuses.coldOpenHold : null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 overflow-hidden px-10 pt-14 pb-16 font-mono text-slate-100">
      {headline && (
        <div className="animate-pulse text-2xl tracking-tight text-slate-200 transition-opacity duration-500">{headline}</div>
      )}

      {chartRevealed && (
        <svg viewBox="-10 -40 270 180" className="h-56 w-full max-w-2xl">
          <polyline points={PREDICTED_POINTS} fill="none" stroke="#94a3b8" strokeWidth={2} />
          <polyline points={ACTUAL_POINTS} fill="none" stroke="#34d399" strokeWidth={2} />
          <text x={0} y={-10} fill="#94a3b8" fontSize={10}>
            predicted
          </text>
          <text x={0} y={-30} fill="#34d399" fontSize={10}>
            actual
          </text>
        </svg>
      )}

      {holdText && <div className="max-w-xl text-center text-lg text-slate-300">{holdText}</div>}
    </div>
  )
}
