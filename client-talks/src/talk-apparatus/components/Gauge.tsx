import { GaugeState } from '../state'

interface GaugeProps {
  gauge: GaugeState
}

export default function Gauge({ gauge }: GaugeProps) {
  const clampedPercent = Math.min(gauge.percent, 100)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>CONTEXT</span>
        {gauge.overflowed && <span className="text-rose-400">OVERFLOW</span>}
      </div>
      <div className={`h-3 w-full rounded-full border ${gauge.overflowed ? 'border-rose-500' : 'border-slate-600'} bg-slate-800`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${gauge.overflowed ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  )
}
