import { MeterState } from './precompute'
import { useDirector } from './Director'
import { useWorldAnchor } from './useWorldAnchor'

interface MeterGaugeProps {
  meter: MeterState
}

function MeterGauge({ meter }: MeterGaugeProps) {
  return (
    <div className="pointer-events-none whitespace-nowrap rounded bg-black/80 px-2 py-1 font-mono text-sm font-bold text-white shadow-xl">
      <div className="mb-1">{meter.label}</div>
      {meter.style === 'bar' ? (
        <div className="h-2 w-24 overflow-hidden rounded-sm bg-slate-700">
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${((meter.value / (meter.max ?? 1)) * 100).toFixed(2)}%` }}
          />
        </div>
      ) : (
        <div>{meter.value}</div>
      )}
    </div>
  )
}

/** Positions a meter over its `anchorEntity` via `useWorldAnchor` — the same mechanism `BattleHud`'s `HpLabel` uses. */
function AnchoredMeter({ entityId, meter }: { entityId: string; meter: MeterState }) {
  const anchorRef = useWorldAnchor(entityId)
  return (
    <div ref={anchorRef} className="fixed left-0 top-0 z-10" style={{ display: 'none' }}>
      <div className="-translate-x-1/2 -translate-y-[140%]">
        <MeterGauge meter={meter} />
      </div>
    </div>
  )
}

/** Renders every meter in `resting.meters`: world-anchored when `anchorEntity` is set, otherwise fixed at a top-corner HUD position. */
export default function MeterHud() {
  const { resting } = useDirector()
  const entries = Object.entries(resting.meters)
  if (entries.length === 0) return null

  const fixed = entries.filter(([, meter]) => !meter.anchorEntity)
  const anchored = entries.filter(([, meter]) => meter.anchorEntity)

  return (
    <>
      {fixed.length > 0 && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col gap-2">
          {fixed.map(([meterId, meter]) => (
            <MeterGauge key={meterId} meter={meter} />
          ))}
        </div>
      )}
      {anchored.map(([meterId, meter]) => (
        <AnchoredMeter key={meterId} entityId={meter.anchorEntity!} meter={meter} />
      ))}
    </>
  )
}
