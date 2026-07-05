import { ColorRegister } from '../state'

/**
 * The apparatus's exactly-three visual registers (design.md's "three-color
 * system"), applied consistently to every block regardless of which pane it
 * renders in. No other color carries narrative meaning on apparatus blocks.
 */
export const COLOR_CLASSES: Record<ColorRegister, string> = {
  green: 'border-emerald-400 bg-emerald-100 text-emerald-800',
  anchor: 'border-indigo-400 bg-indigo-100 text-indigo-800',
  muted: 'border-slate-300 bg-slate-100 text-slate-700',
}
