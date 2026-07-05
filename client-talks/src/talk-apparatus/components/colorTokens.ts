import { ColorRegister } from '../state'

/**
 * The apparatus's exactly-three visual registers (design.md's "three-color
 * system"), applied consistently to every block regardless of which pane it
 * renders in. No other color carries narrative meaning on apparatus blocks.
 */
export const COLOR_CLASSES: Record<ColorRegister, string> = {
  green: 'border-emerald-400 bg-emerald-500/25 text-emerald-100',
  anchor: 'border-indigo-400 bg-indigo-900/80 text-indigo-100',
  muted: 'border-slate-600 bg-slate-700/40 text-slate-300',
}
