import { describe, it, expect } from 'vitest'
import { buildCourse, type Level, type Piece } from './levels'
import { DEFAULT_TUNING, cloneTuning, type Tuning } from './physics'
import {
  ZONE_WIND,
  collisionDamage,
  launchSpeed,
  launchState,
  simulateShot,
  startFlight,
  stepFlight,
  type Lie,
  type Outcome,
  type ShotInput,
  type ShotResult,
  type Thrust,
} from './shot'
import { testLevel } from './testCourse'

const T = DEFAULT_TUNING
const opts = { hull: 100, collected: [] as boolean[] }
/** Release from the rightmost point of the ring, dir −1: straight up the course. */
const UP: Lie = { planet: 0, angle: 0, dir: -1 }

/** Gravity reach so short that away from a surface the ship flies in a straight line. */
const S = cloneTuning()
S.gravityReach = 30

/** The point where a flight first passes above height `y`. */
function pointAt(r: ShotResult, y: number) {
  const i = r.ys.findIndex((yy) => yy < y)
  return { x: r.xs[i], y: r.ys[i], i }
}

function shoot(level: Level, power: number, lie: Lie = UP, tuning: Tuning = T, extra: Partial<typeof opts & { maxLength: number }> = {}): ShotResult {
  return simulateShot(buildCourse(level, tuning), lie, { angle: lie.angle, power }, { ...opts, ...extra }, tuning)
}

describe('launch', () => {
  it('leaves prograde, so opposite release points leave in opposite directions', () => {
    const c = buildCourse(testLevel(), T)
    const a = launchState(c, UP, { angle: 0, power: 0.5 }, T)
    const b = launchState(c, UP, { angle: Math.PI, power: 0.5 }, T)
    expect(a.vx).toBeCloseTo(-b.vx, 6)
    expect(a.vy).toBeCloseTo(-b.vy, 6)
    expect(a.vy).toBeLessThan(0) // up the course
  })

  it('harder shots leave faster, never above the maximum speed', () => {
    expect(launchSpeed(150, 0.8, T)).toBeGreaterThan(launchSpeed(150, 0.2, T))
    const fast = cloneTuning()
    fast.launchBoost = 5000
    expect(launchSpeed(150, 1, fast)).toBe(fast.maxSpeed)
  })
})

describe('determinism', () => {
  const level = testLevel({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 260, y: 1350, r: 36, color: 1 }] })

  it('the same shot always produces the same flight', () => {
    expect(shoot(level, 0.4)).toEqual(shoot(level, 0.4))
  })

  it('a run cut short by length is an exact prefix of the full run', () => {
    const full = shoot(level, 0.6)
    const cut = shoot(level, 0.6, UP, T, { maxLength: 250 })
    expect(cut.outcome).toBeNull()
    expect(cut.xs.length).toBeLessThan(full.xs.length)
    expect(cut.xs).toEqual(full.xs.slice(0, cut.xs.length))
    expect(cut.ys).toEqual(full.ys.slice(0, cut.ys.length))
    expect(cut.hull).toEqual(full.hull.slice(0, cut.hull.length))
  })
})

describe('capture', () => {
  // B's ring (R 60) sits tangent to the line the ship climbs, so the ship meets
  // the ring on the way up.
  const two = testLevel({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 206.67, y: 1300, r: 36, color: 1 }] })

  it('a slow arrival locks onto the ring', () => {
    const res = shoot(two, 0.1, UP, S)
    expect(res.outcome).toMatchObject({ kind: 'lock', lie: { planet: 1 } })
    const ring = buildCourse(two, S).rings[1]!
    const last = res.xs.length - 1
    expect(Math.hypot(res.xs[last] - ring.x, res.ys[last] - ring.y)).toBeCloseTo(ring.R, 3)
  })

  it('a fast arrival flies by, bent by the planet', () => {
    const res = shoot(two, 1, UP, S)
    expect(res.outcome?.kind === 'lock' && res.outcome.lie.planet === 1).toBe(false)
    const alone = shoot(testLevel(), 1, UP, S)
    expect(Math.abs(pointAt(res, 1000).x - pointAt(alone, 1000).x)).toBeGreaterThan(1)
  })

  it('a weak shot falls back onto its own ring', () => {
    const res = shoot(testLevel(), 0.04)
    expect(res.outcome).toMatchObject({ kind: 'lock', lie: { planet: 0 } })
    expect(res.xs.length).toBeGreaterThan(2)
  })
})

describe('bounces and damage', () => {
  it('slow contact is free; faster contact costs more', () => {
    expect(collisionDamage(T.damageThreshold - 1, T.planetDamageRate, T)).toBe(0)
    expect(collisionDamage(300, T.planetDamageRate, T)).toBeGreaterThan(collisionDamage(150, T.planetDamageRate, T))
  })

  // A planet centered on the climbing line is hit head-on; one offset sideways
  // by nearly the contact distance is skimmed.
  const on = pointAt(shoot(testLevel(), 1, UP, S), 1300)
  const withB = (dx: number) =>
    testLevel({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: on.x + dx, y: on.y, r: 30, color: 1 }] })
  const firstBounce = (r: ShotResult) => r.events.find((e) => e.kind === 'bounce')

  it('a head-on hit does more damage than a skim at the same speed', () => {
    const head = firstBounce(shoot(withB(0), 1, UP, S))
    const skim = firstBounce(shoot(withB(-33), 1, UP, S))
    if (head?.kind !== 'bounce' || skim?.kind !== 'bounce') throw new Error('expected two bounces')
    expect(head.damage).toBeGreaterThan(0)
    expect(head.damage).toBeGreaterThan(skim.damage)
  })

  it('a bounce rebounds and the flight continues', () => {
    const res = shoot(withB(0), 1, UP, S)
    const e = firstBounce(res)!
    expect(res.ys[e.step + 20]).toBeGreaterThan(res.ys[e.step]) // heading back down
    expect(res.hull[e.step]).toBeLessThan(100)
    expect(res.xs.length).toBeGreaterThan(e.step + 20)
  })

  it('a bounce that takes the hull to 0 ends the flight there', () => {
    const res = shoot(withB(0), 1, UP, S, { hull: 1 })
    expect(res.outcome?.kind).toBe('destroyed')
    expect(res.xs.length - 1).toBe(firstBounce(res)!.step)
    expect(res.finalHull).toBe(0)
  })
})

describe('course edges', () => {
  // Release from the bottom of the ring with dir +1: off to the left.
  const LEFT: Lie = { planet: 0, angle: Math.PI / 2, dir: 1 }
  const nearLeft = { planets: [{ x: 120, y: 1700, r: 40, color: 0 }] }

  it('bounce sides rebound and hurt', () => {
    const res = shoot(testLevel(nearLeft), 1, LEFT, S)
    const wall = res.events.find((e) => e.kind === 'wall')
    if (wall?.kind !== 'wall') throw new Error('expected a wall hit')
    expect(wall.damage).toBeGreaterThan(0)
    expect(Math.min(...res.xs)).toBeGreaterThanOrEqual(T.shipRadius)
    expect(res.xs[wall.step + 10]).toBeGreaterThan(res.xs[wall.step]) // rebounding right
  })

  it('wrap sides bring the ship in at the other side, same height and heading', () => {
    const res = shoot(testLevel({ ...nearLeft, sides: 'wrap' }), 1, LEFT, S)
    expect(res.events.some((e) => e.kind === 'wall')).toBe(false)
    const seam = res.xs.findIndex((x, i) => i > 0 && x - res.xs[i - 1] > 200)
    expect(seam).toBeGreaterThan(0)
    expect(Math.abs(res.ys[seam] - res.ys[seam - 1])).toBeLessThan(10)
    expect(res.xs[seam + 1]).toBeLessThan(res.xs[seam]) // still moving left
  })

  it('leaving past the top is out of bounds', () => {
    const res = shoot(testLevel({ height: 720, planets: [{ x: 200, y: 400, r: 40, color: 0 }] }), 1)
    expect(res.outcome?.kind).toBe('out-of-bounds')
    expect(res.ys[res.ys.length - 1]).toBeLessThan(-T.obMargin)
  })

  it('a flight that has not ended by the time cap is adrift', () => {
    const t = cloneTuning()
    t.maxFlightSec = 0.3
    expect(shoot(testLevel(), 0.8, UP, t).outcome?.kind).toBe('adrift')
  })
})

describe('stars and wormhole', () => {
  const ref = shoot(testLevel(), 1, UP, S)
  const p = pointAt(ref, 1300)

  it('collects a star on the path', () => {
    const res = shoot(testLevel({ stars: [{ x: p.x, y: p.y }, { x: 20, y: 1300 }] }), 1, UP, S)
    expect(res.stars).toEqual([0])
    expect(res.events.some((e) => e.kind === 'star' && e.star === 0)).toBe(true)
  })

  it('does not collect a star already taken', () => {
    const level = testLevel({ stars: [{ x: p.x, y: p.y }] })
    const res = simulateShot(buildCourse(level, S), UP, { angle: 0, power: 1 }, { hull: 100, collected: [true] }, S)
    expect(res.stars).toEqual([])
  })

  it('entering the wormhole ends the flight at any speed', () => {
    const res = shoot(testLevel({ wormhole: { x: p.x, y: p.y, r: 20 } }), 1, UP, S)
    expect(res.outcome?.kind).toBe('wormhole')
  })

  it('the wormhole pulls a passing ship toward it', () => {
    const w = { x: p.x - 30, y: p.y, r: 5 }
    const level = testLevel({ wormhole: w })
    const off = cloneTuning(S)
    off.wormholePull = 0
    const closest = (r: ShotResult) => Math.min(...r.xs.map((x, i) => Math.hypot(x - w.x, r.ys[i] - w.y)))
    expect(closest(shoot(level, 0.5, UP, S))).toBeLessThan(closest(shoot(level, 0.5, UP, off)) - 1)
  })
})

describe('course pieces', () => {
  const withPieces = (pieces: Piece[]) => testLevel({ pieces })
  const ref = shoot(testLevel(), 1, UP, S)

  it('solar wind pushes the ship while inside', () => {
    const wind: Piece = { kind: 'wind', x: 0, y: 1000, w: 400, h: 300, ax: 200, ay: 0 }
    const blown = shoot(withPieces([wind]), 0.6, UP, S)
    const calm = shoot(withPieces([]), 0.6, UP, S)
    expect(pointAt(blown, 950).x).toBeGreaterThan(pointAt(calm, 950).x + 5)
    expect(blown.zone.some((z) => z & ZONE_WIND)).toBe(true)
  })

  it('asteroids slow and damage, and a longer path through them costs more', () => {
    const cx = pointAt(ref, 1300).x
    const field = (h: number): Piece => ({ kind: 'asteroids', x: cx - 50, y: 1400 - h, w: 100, h })
    const speedAt = (r: ShotResult, y: number) => {
      const { i } = pointAt(r, y)
      return Math.hypot(r.xs[i] - r.xs[i - 1], r.ys[i] - r.ys[i - 1])
    }
    const short = shoot(withPieces([field(100)]), 1, UP, S)
    const long = shoot(withPieces([field(250)]), 1, UP, S)
    const clear = shoot(withPieces([]), 1, UP, S)
    expect(speedAt(short, 1100)).toBeLessThan(speedAt(clear, 1100))
    expect(short.finalHull).toBeLessThan(100)
    expect(long.finalHull).toBeLessThan(short.finalHull)
  })

  it('radiation punishes lingering: twice the speed, about half the damage', () => {
    const c = pointAt(ref, 1000)
    const level = withPieces([{ kind: 'radiation', x: c.x, y: c.y, r: 80 }])
    const vc = buildCourse(level, S).rings[0]!.vc
    const lost = (speed: number) => 100 - shoot(level, (speed - vc) / S.launchBoost, UP, S).finalHull
    const slow = lost(160)
    const fast = lost(320)
    expect(slow).toBeGreaterThan(0)
    expect(fast / slow).toBeGreaterThan(0.4)
    expect(fast / slow).toBeLessThan(0.6)
  })

  it('pieces act only in flight: the release point starts at the given hull', () => {
    const level = withPieces([{ kind: 'radiation', x: 266, y: 1700, r: 80 }])
    expect(shoot(level, 0.5).hull[0]).toBe(100)
  })
})

describe('step rule', () => {
  it('simulateShot is startFlight + stepFlight(no thrust), step for step', () => {
    const level = testLevel({
      planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 206.67, y: 1300, r: 36, color: 1 }],
      pieces: [
        { kind: 'wind', x: 0, y: 1500, w: 400, h: 60, ax: 60, ay: 0 },
        { kind: 'asteroids', x: 0, y: 1440, w: 400, h: 40 },
        { kind: 'radiation', x: 210, y: 1400, r: 30 },
      ],
    })
    const c = buildCourse(level, S)
    const shot: ShotInput = { angle: 0, power: 0.12 }
    const ref = simulateShot(c, UP, shot, opts, S)
    const st = startFlight(c, UP, shot, opts, S)
    const xs = [st.x]
    const ys = [st.y]
    const hull = [st.hull]
    let outcome: Outcome | null = null
    while (!outcome) {
      const r = stepFlight(c, st, null, S)
      xs.push(r.x)
      ys.push(r.y)
      hull.push(r.hull)
      outcome = r.outcome
    }
    expect(xs).toEqual(ref.xs)
    expect(ys).toEqual(ref.ys)
    expect(hull).toEqual(ref.hull)
    expect(outcome).toEqual(ref.outcome)
    expect(st.fuelUsed).toBe(0)
  })
})

describe('vector shots', () => {
  const c = buildCourse(testLevel(), T)
  // UP releases at angle 0 (right of the planet), dir −1: prograde is straight up.
  const prograde = { x: 0, y: -1 }

  it('an exactly prograde vector shot is a prograde shot', () => {
    const a = launchState(c, UP, { angle: 0, power: 0.5 }, T)
    const b = launchState(c, UP, { angle: 0, power: 0.5, dir: prograde }, T)
    expect(b.vx).toBeCloseTo(a.vx, 9)
    expect(b.vy).toBeCloseTo(a.vy, 9)
    const pa = simulateShot(c, UP, { angle: 0, power: 0.5 }, opts, T)
    const pb = simulateShot(c, UP, { angle: 0, power: 0.5, dir: prograde }, opts, T)
    expect(pb.outcome).toEqual(pa.outcome)
    expect(pb.xs.length).toBe(pa.xs.length)
  })

  it('an outward shot adds an away-from-planet component to the orbital velocity', () => {
    const ring = c.rings[0]!
    const v = launchState(c, UP, { angle: 0, power: 0.5, dir: { x: 1, y: 0 } }, T)
    expect(v.vx).toBeCloseTo(0.5 * T.launchBoost, 6)
    expect(v.vy).toBeCloseTo(-ring.vc, 6)
  })

  it('a strong retrograde shot leaves slower than orbit and falls toward the planet', () => {
    const ring = c.rings[0]!
    const power = (ring.vc * 0.8) / T.launchBoost
    const v = launchState(c, UP, { angle: 0, power, dir: { x: 0, y: 1 } }, T)
    expect(Math.hypot(v.vx, v.vy)).toBeLessThan(ring.vc)
    const r = simulateShot(c, UP, { angle: 0, power, dir: { x: 0, y: 1 } }, opts, T)
    const p = c.planets[0]
    const minDist = Math.min(...r.xs.map((x, i) => Math.hypot(x - p.x, r.ys[i] - p.y)))
    expect(minDist).toBeLessThan(ring.R - T.captureBand)
  })

  it('never leaves faster than the maximum speed', () => {
    const fast = cloneTuning()
    fast.launchBoost = 5000
    const v = launchState(buildCourse(testLevel(), fast), UP, { angle: 0, power: 1, dir: { x: 0.6, y: -0.8 } }, fast)
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(fast.maxSpeed, 6)
  })
})

describe('nudges', () => {
  /** Fly a shot with `thrust(step)` applied, batching steps `batch` at a time. */
  function fly(level: Level, power: number, thrust: (step: number, y: number) => Thrust | null, tuning: Tuning = S, maxSteps = Infinity) {
    const c = buildCourse(level, tuning)
    const st = startFlight(c, UP, { angle: 0, power }, opts, tuning)
    const xs = [st.x]
    const ys = [st.y]
    let outcome: Outcome | null = null
    while (!outcome && st.step < maxSteps) {
      const r = stepFlight(c, st, thrust(st.step + 1, st.y), tuning)
      xs.push(r.x)
      ys.push(r.y)
      outcome = r.outcome
    }
    return { xs, ys, outcome, fuelUsed: st.fuelUsed }
  }

  it('a sideways nudge curves the path toward the drag', () => {
    const right = fly(testLevel(), 0.6, (n) => (n < 60 ? { x: 1, y: 0 } : null))
    const none = fly(testLevel(), 0.6, () => null)
    expect(right.xs[120]).toBeGreaterThan(none.xs[120] + 1)
    expect(right.fuelUsed).toBeCloseTo(59 / 120, 6)
    expect(none.fuelUsed).toBe(0)
  })

  it('fuel counts throttle, not just time', () => {
    const half = fly(testLevel(), 0.6, () => ({ x: 0.3, y: 0.4 }), S, 120)
    expect(half.fuelUsed).toBeCloseTo(0.5, 6)
  })

  it('the part of a nudge against the velocity uses the braking max', () => {
    const c = buildCourse(testLevel(), S)
    const run = (thrust: Thrust, tuning: Tuning) => {
      const st = startFlight(c, UP, { angle: 0, power: 0.6 }, opts, tuning)
      const before = { vx: st.vx, vy: st.vy }
      const none = { ...st }
      stepFlight(c, none, null, tuning)
      stepFlight(c, st, thrust, tuning)
      return { dvx: (st.vx - none.vx) * 120, dvy: (st.vy - none.vy) * 120, before }
    }
    const t = cloneTuning(S)
    t.nudgeThrust = 100
    t.nudgeBrakeThrust = 300
    // Ship launches up (vy < 0): thrusting down is braking, up is forward, right is sideways.
    expect(run({ x: 0, y: 1 }, t).dvy).toBeCloseTo(300, 4)
    expect(run({ x: 0, y: -1 }, t).dvy).toBeCloseTo(-100, 4)
    expect(run({ x: 1, y: 0 }, t).dvx).toBeCloseTo(100, 4)
    // A diagonal back-and-right splits: 100 sideways, 300 braking.
    const d = run({ x: Math.SQRT1_2, y: Math.SQRT1_2 }, t)
    expect(d.dvx).toBeCloseTo(70.71, 1)
    expect(d.dvy).toBeCloseTo(212.13, 1)
  })

  it('identical nudges give identical flights', () => {
    const pattern = (n: number) => (n % 50 < 20 ? { x: 0.5, y: -0.2 } : null)
    expect(fly(testLevel(), 0.5, pattern)).toEqual(fly(testLevel(), 0.5, pattern))
  })

  it('a nudge that slows the ship across a ring locks it there', () => {
    const two = testLevel({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 206.67, y: 1300, r: 36, color: 1 }] })
    const strong = cloneTuning(S)
    strong.nudgeThrust = 400
    strong.nudgeBrakeThrust = 400
    const coast = fly(two, 0.5, () => null, strong)
    expect(coast.outcome?.kind === 'lock' && coast.outcome.lie.planet === 1).toBe(false)
    // Brake (thrust down the course) only on the approach to B's ring.
    const braked = fly(two, 0.5, (_n, y) => (y < 1400 ? { x: 0, y: 1 } : null), strong)
    expect(braked.outcome).toMatchObject({ kind: 'lock', lie: { planet: 1 } })
  })
})
