import type { Thrust } from './shot'

/**
 * In-flight nudge from a drag — Orbital Dodger's relative control, copied (Space
 * Golf imports nothing from orbital-dodger/). Thrust points along the drag from
 * where the press began. Inside the deadzone there is none, so a tap does
 * nothing; past it the throttle ramps quadratically to full at `fullDrag`, so a
 * small drag is a gentle touch.
 */
export function nudgeVector(
  origin: { x: number; y: number } | null,
  pointer: { x: number; y: number } | null,
  deadzone: number,
  fullDrag: number,
): Thrust | null {
  if (!origin || !pointer) return null
  const dx = pointer.x - origin.x
  const dy = pointer.y - origin.y
  const d = Math.hypot(dx, dy)
  if (d < deadzone || d === 0) return null
  const span = fullDrag - deadzone
  const t = span > 0 ? Math.min((d - deadzone) / span, 1) : 1
  // Never exactly zero past the deadzone, so the guide and fuel agree thrust is on.
  const throttle = Math.max(t * t, 0.02)
  return { x: (dx / d) * throttle, y: (dy / d) * throttle }
}
