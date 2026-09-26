import { describe, it, expect } from 'vitest'
import { nudgeVector } from './nudge'

const O = { x: 100, y: 100 }
const mag = (v: { x: number; y: number } | null) => (v ? Math.hypot(v.x, v.y) : 0)

describe('nudgeVector', () => {
  it('is null with no press, and inside the deadzone (a tap)', () => {
    expect(nudgeVector(null, O, 12, 90)).toBeNull()
    expect(nudgeVector(O, null, 12, 90)).toBeNull()
    expect(nudgeVector(O, { x: 105, y: 105 }, 12, 90)).toBeNull()
  })

  it('points along the drag', () => {
    const v = nudgeVector(O, { x: 100, y: 200 }, 12, 90)!
    expect(v.x).toBeCloseTo(0, 9)
    expect(v.y).toBeGreaterThan(0)
  })

  it('throttle rises with distance and caps at 1', () => {
    const a = mag(nudgeVector(O, { x: 130, y: 100 }, 12, 90))
    const b = mag(nudgeVector(O, { x: 160, y: 100 }, 12, 90))
    expect(b).toBeGreaterThan(a)
    expect(mag(nudgeVector(O, { x: 190, y: 100 }, 12, 90))).toBeCloseTo(1, 9)
    expect(mag(nudgeVector(O, { x: 400, y: 100 }, 12, 90))).toBeCloseTo(1, 9)
  })

  it('is never zero just past the deadzone', () => {
    expect(mag(nudgeVector(O, { x: 112, y: 100 }, 12, 90))).toBeGreaterThan(0)
  })
})
