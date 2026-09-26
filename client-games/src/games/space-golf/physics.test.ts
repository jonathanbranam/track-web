import { describe, it, expect } from 'vitest'
import {
  COURSE_W,
  DEFAULT_TUNING,
  advanceAngle,
  cloneTuning,
  displacement,
  gravityAccelAt,
  influenceRadii,
  onRing,
  ringFor,
  wrapCoord,
  type Planet,
} from './physics'

const T = DEFAULT_TUNING
const planet = (x: number, y: number, r: number): Planet => ({ x, y, r, baseArea: r * r, color1: '#fff', color2: '#000' })

describe('displacement', () => {
  it('wraps only across the side seam', () => {
    expect(displacement(10, 100, 390, 100, true).dx).toBeCloseTo(-20)
    expect(displacement(10, 100, 390, 100, false).dx).toBe(380)
    // y never wraps, however far.
    expect(displacement(200, 10, 200, 2000, true).dy).toBe(1990)
  })

  it('wrapCoord folds x back into the course and leaves in-range values alone', () => {
    expect(wrapCoord(-5, COURSE_W)).toBe(395)
    expect(wrapCoord(405, COURSE_W)).toBe(5)
    expect(wrapCoord(123.456, COURSE_W)).toBe(123.456)
  })
})

describe('gravity', () => {
  it('pull grows as the ship nears a planet', () => {
    const ps = [planet(200, 500, 40)]
    const far = gravityAccelAt(200, 400, ps, null, T, false)
    const near = gravityAccelAt(200, 440, ps, null, T, false)
    expect(Math.abs(near.ay)).toBeGreaterThan(Math.abs(far.ay))
    expect(near.ay).toBeGreaterThan(0) // toward the planet (down)
  })

  it('pulls across the side seam on a wrapping course', () => {
    const ps = [planet(390, 500, 40)]
    const a = gravityAccelAt(20, 500, ps, null, T, true)
    expect(a.ax).toBeLessThan(0) // shortest way is left, across the seam
    expect(gravityAccelAt(20, 500, ps, null, T, false).ax).toBeGreaterThanOrEqual(0)
  })

  it('deep inside a planet’s influence zone, other planets do not pull', () => {
    const ps = [planet(200, 500, 40), planet(200, 200, 40)]
    const S = influenceRadii(ps, false)
    const zoned = gravityAccelAt(260, 500, ps, S, T, false)
    const alone = gravityAccelAt(260, 500, [ps[0]], null, T, false)
    expect(zoned.ax).toBeCloseTo(alone.ax, 9)
    expect(zoned.ay).toBeCloseTo(alone.ay, 9)
  })
})

describe('rings', () => {
  it('every lone planet gets a ring turning at a real orbit speed', () => {
    const ps = [planet(200, 500, 40)]
    const r = ringFor(0, ps, null, T, false)
    expect('dropped' in r).toBe(false)
    if ('dropped' in r) return
    expect(r.R).toBeGreaterThan(40)
    expect(r.vc).toBeGreaterThan(0)
    expect(r.vc).toBeLessThanOrEqual(T.maxSpeed)
  })

  it('a ring that would pass a neighbour is dropped', () => {
    const ps = [planet(200, 500, 40), planet(200, 390, 30)]
    const r = ringFor(0, ps, null, T, false)
    expect(r).toEqual({ dropped: 'blocked' })
  })

  it('a ring outside the inner influence zone is dropped', () => {
    const t = cloneTuning()
    t.influenceInner = 0.1
    const ps = [planet(200, 500, 40), planet(200, 300, 40)]
    expect(ringFor(0, ps, influenceRadii(ps, false), t, false)).toEqual({ dropped: 'influence' })
  })

  it('orbiting moves the ship round the ring at orbit speed, in its direction', () => {
    const ring = ringFor(0, [planet(200, 500, 40)], null, T, false)
    if ('dropped' in ring) throw new Error('no ring')
    const a1 = advanceAngle(0, ring, 1, 0.5)
    expect(a1).toBeCloseTo((ring.vc * 0.5) / ring.R)
    expect(advanceAngle(0, ring, -1, 0.5)).toBeCloseTo(-a1)
    const s = onRing(ring, 0, 1)
    expect(s.x).toBeCloseTo(200 + ring.R)
    expect(s.vy).toBeCloseTo(ring.vc) // +1 is clockwise on screen (y down)
  })
})
