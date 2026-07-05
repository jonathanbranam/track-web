import { GazeTarget } from '../state'

interface GazeMarkerProps {
  target: GazeTarget | null
}

const LABELS: Record<GazeTarget, string> = {
  app: 'APP',
  spec: 'SPEC',
  code: 'CODE',
  skills: 'SKILLS',
}

/**
 * Reads at a glance where the human's attention is pointed. Persists at its
 * current target until a later `moveGaze` beat re-points it — the marker
 * itself never decays or resets on its own.
 */
export default function GazeMarker({ target }: GazeMarkerProps) {
  if (!target) return null
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-400/10 px-2.5 py-1 font-mono text-xs text-amber-300 transition-all duration-500">
      <span className="text-sm leading-none">👁</span>
      <span>{LABELS[target]}</span>
    </div>
  )
}
