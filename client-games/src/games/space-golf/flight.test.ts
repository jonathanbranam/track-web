import { describe, it, expect } from 'vitest'
import { advanceLive, startLive } from './flight'
import { buildCourse } from './levels'
import { cloneTuning } from './physics'
import { simulateShot, type Lie, type Thrust } from './shot'
import { testLevel } from './testCourse'

const T = cloneTuning()
T.gravityReach = 30
const UP: Lie = { planet: 0, angle: 0, dir: -1 }
const opts = { hull: 100, collected: [] as boolean[] }
const level = testLevel({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 206.67, y: 1300, r: 36, color: 1 }] })
const course = buildCourse(level, T)

/** Play a flight in frames of `perFrame` steps, nudging right while `nudging(step)`. */
function play(power: number, perFrame: number, nudging: (step: number) => boolean) {
  const f = startLive(course, UP, { angle: 0, power }, opts, T)
  const path: { x: number; y: number }[] = [f.point]
  let guard = 0
  while (!f.outcome && guard++ < 100000) {
    // Thrust is held for a frame; with whole-step frames it lines up with steps.
    const thrust: Thrust | null = nudging(f.state.step + 1) ? { x: 1, y: 0 } : null
    const before = f.state.step
    advanceLive(course, f, perFrame, thrust, T)
    for (let i = before; i < f.state.step; i++) path.push(f.point)
  }
  return { f, path }
}

describe('live flight', () => {
  it('with no nudge it lands exactly where the forecast said', () => {
    const shot = { angle: 0, power: 0.1 }
    const ref = simulateShot(course, UP, shot, opts, T)
    const { f } = play(0.1, 1.5, () => false)
    expect(f.outcome).toEqual(ref.outcome)
    expect(f.state.step).toBe(ref.xs.length - 1)
    expect(f.point.x).toBe(ref.xs[ref.xs.length - 1])
    expect(f.point.y).toBe(ref.ys[ref.ys.length - 1])
    expect(f.stars).toEqual(ref.stars)
    expect(f.hull).toBe(ref.finalHull)
  })

  it('slow motion does not change the path: the same nudges at any playback rate', () => {
    // A window on 3-step frame boundaries (frames start at steps 1, 4, 7, …).
    const nudge = (n: number) => n >= 22 && n < 82
    const fast = play(0.5, 3, nudge)
    const slow = play(0.5, 1, nudge)
    expect(slow.f.outcome).toEqual(fast.f.outcome)
    expect(slow.f.point).toEqual(fast.f.point)
    expect(slow.f.state.fuelUsed).toBeCloseTo(fast.f.state.fuelUsed, 12)
  })

  it('carries fractional steps between frames', () => {
    const f = startLive(course, UP, { angle: 0, power: 0.5 }, opts, T)
    advanceLive(course, f, 0.4, null, T)
    expect(f.state.step).toBe(0)
    advanceLive(course, f, 0.7, null, T)
    expect(f.state.step).toBe(1)
    expect(f.budget).toBeCloseTo(0.1, 9)
  })
})
