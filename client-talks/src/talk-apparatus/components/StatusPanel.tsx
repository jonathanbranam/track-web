import { StatusValue } from '../state'

interface StatusPanelProps {
  statuses: Record<string, StatusValue>
}

const STATIONS: { key: string; label: string }[] = [
  { key: 'stationDefine', label: 'DEFINE' },
  { key: 'stationReview', label: 'REVIEW' },
  { key: 'stationImprove', label: 'IMPROVE' },
]

/**
 * Renders the generic `statuses` bag's well-known keys: the bug indicator,
 * working-features counter, Stage 3's three persistent station lights, and
 * the human review-gate hold. Unknown keys are ignored here — non-apparatus
 * scenes read their own keys directly (see ColdOpenStage/CloseStage).
 */
export default function StatusPanel({ statuses }: StatusPanelProps) {
  const hasBug = 'bug' in statuses
  const hasFeatures = 'workingFeatures' in statuses
  const anyStation = STATIONS.some((s) => s.key in statuses)
  const hasReviewGate = 'reviewGate' in statuses

  if (!hasBug && !hasFeatures && !anyStation && !hasReviewGate) return null

  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-500">
      {hasBug && (
        <span className={statuses.bug ? 'text-emerald-600' : 'text-rose-500'}>{statuses.bug ? '✓ bug' : '✗ bug'}</span>
      )}
      {hasFeatures && <span>features: {String(statuses.workingFeatures)}</span>}
      {anyStation && (
        <span className="flex items-center gap-2">
          {STATIONS.filter((s) => s.key in statuses).map((s) => (
            <span key={s.key} className={`flex items-center gap-1 ${statuses[s.key] ? 'text-emerald-600' : 'text-slate-300'}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${statuses[s.key] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {s.label}
            </span>
          ))}
        </span>
      )}
      {hasReviewGate && (
        <span className={`flex items-center gap-1 ${statuses.reviewGate ? 'text-amber-600' : 'text-slate-300'}`}>
          <span className={`inline-block h-2 w-2 rounded-full ${statuses.reviewGate ? 'bg-amber-500' : 'bg-slate-300'}`} />
          REVIEW GATE
        </span>
      )}
    </div>
  )
}
