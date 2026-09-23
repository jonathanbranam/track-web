import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TUNING,
  GAME_W,
  GAME_H,
  MIN_PLANET_CLEARANCE,
  START_CLEARANCE,
  STAR_CLEARANCE,
  FORECAST_MAX_STEPS,
  OUT_OF_BOUNDS_MARGIN,
  cloneTuning,
  gravityAccelAt,
  influenceRadii,
  neighbourWeight,
  PLANET_MAX_R,
  MIN_RING_HEIGHT,
  generatePlanets,
  spawnStar,
  scoreRateAt,
  stepShip,
  checkLoss,
  projectForecast,
  wrapDelta,
  thrustDirection,
  classifyImpact,
  resolveGlancingImpact,
  orbitRings,
  tryCapture,
  advanceOrbit,
  ringOffset,
  orbitScoreFactor,
  offscreenIndicator,
  type Planet,
  type Rng,
  type Tuning,
} from './physics'

/** Deterministic RNG so layout assertions are about the rules, not luck. */
function seeded(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    // xorshift32
    s ^= s << 13
    s >>>= 0
    s ^= s >> 17
    s ^= s << 5
    s >>>= 0
    return s / 0x100000000
  }
}

function planet(x: number, y: number, r: number): Planet {
  return { x, y, r, baseArea: r * r, color1: '#fff', color2: '#000' }
}

describe('gravityAccelAt', () => {
  it('pulls harder toward the larger planet at equal distance', () => {
    const t = DEFAULT_TUNING
    const small = gravityAccelAt(0, 0, [planet(200, 0, 25)], t)
    const large = gravityAccelAt(0, 0, [planet(200, 0, 50)], t)
    expect(Math.hypot(large.ax, large.ay)).toBeGreaterThan(Math.hypot(small.ax, small.ay))
  })

  it('increases as the ship nears the planet', () => {
    const t = DEFAULT_TUNING
    const p = [planet(0, 0, 40)]
    const far = gravityAccelAt(300, 0, p, t)
    const near = gravityAccelAt(120, 0, p, t)
    expect(Math.hypot(near.ax, near.ay)).toBeGreaterThan(Math.hypot(far.ax, far.ay))
  })

  it('follows the inverse square: halving distance quadruples acceleration', () => {
    const t = DEFAULT_TUNING
    const p = [planet(0, 0, 30)]
    const a200 = Math.hypot(...Object.values(gravityAccelAt(200, 0, p, t)) as [number, number])
    const a100 = Math.hypot(...Object.values(gravityAccelAt(100, 0, p, t)) as [number, number])
    expect(a100 / a200).toBeCloseTo(4, 5)
  })

  it('sums contributions from multiple planets as vectors', () => {
    const t = DEFAULT_TUNING
    const a = planet(200, 0, 30)
    const b = planet(0, 200, 30)
    const only = gravityAccelAt(0, 0, [a], t)
    const other = gravityAccelAt(0, 0, [b], t)
    const both = gravityAccelAt(0, 0, [a, b], t)
    expect(both.ax).toBeCloseTo(only.ax + other.ax, 10)
    expect(both.ay).toBeCloseTo(only.ay + other.ay, 10)
  })

  it('cancels to zero between two identical opposed planets', () => {
    const both = gravityAccelAt(0, 0, [planet(-150, 0, 30), planet(150, 0, 30)], DEFAULT_TUNING)
    expect(both.ax).toBeCloseTo(0, 10)
    expect(both.ay).toBeCloseTo(0, 10)
  })

  it('stays finite at zero distance thanks to the softening floor', () => {
    const at = gravityAccelAt(0, 0, [planet(0, 0, 40)], DEFAULT_TUNING)
    expect(Number.isFinite(at.ax)).toBe(true)
    expect(Number.isFinite(at.ay)).toBe(true)

    // Clamped to minDist, so it matches the acceleration at exactly minDist.
    const t = DEFAULT_TUNING
    const expected = (t.G * (40 * 40 * t.massScale)) / (t.minDist * t.minDist)
    expect(Math.hypot(at.ax, at.ay)).toBeLessThanOrEqual(expected + 1e-6)
  })

  it('returns zero acceleration when there are no planets', () => {
    expect(gravityAccelAt(10, 10, [], DEFAULT_TUNING)).toEqual({ ax: 0, ay: 0 })
  })
})

describe('influence zones', () => {
  const on = DEFAULT_TUNING
  const off: Tuning = { ...cloneTuning(), influenceZones: false }
  const a = planet(100, 300, 40)
  const b = planet(300, 300, 20)

  it('puts the zone edge where the two pulls are equal', () => {
    const [Sa, Sb] = influenceRadii([a, b], on)
    expect(Sa + Sb).toBeCloseTo(200, 10)
    const ga = gravityAccelAt(a.x + Sa, 300, [a], off)
    const gb = gravityAccelAt(a.x + Sa, 300, [b], off)
    expect(Math.hypot(ga.ax, ga.ay)).toBeCloseTo(Math.hypot(gb.ax, gb.ay), 6)
  })

  it('ignores neighbours deep inside a zone', () => {
    const inside = gravityAccelAt(a.x, 300 - 60, [a, b], on)
    const alone = gravityAccelAt(a.x, 300 - 60, [a], on)
    expect(inside.ax).toBeCloseTo(alone.ax, 10)
    expect(inside.ay).toBeCloseTo(alone.ay, 10)
  })

  it('is plain superposition outside every zone, and when turned off', () => {
    const far = { x: 200, y: 600 }
    const sum = (t: Tuning) => {
      const g1 = gravityAccelAt(far.x, far.y, [a], t)
      const g2 = gravityAccelAt(far.x, far.y, [b], t)
      return { ax: g1.ax + g2.ax, ay: g1.ay + g2.ay }
    }
    expect(gravityAccelAt(far.x, far.y, [a, b], on).ax).toBeCloseTo(sum(on).ax, 10)
    const near = gravityAccelAt(a.x, 240, [a, b], off)
    const g1 = gravityAccelAt(a.x, 240, [a], off)
    const g2 = gravityAccelAt(a.x, 240, [b], off)
    expect(near.ax).toBeCloseTo(g1.ax + g2.ax, 10)
  })

  it('fades neighbours back in smoothly with no jump at the zone edge', () => {
    expect(neighbourWeight(0.5, 0.75)).toBe(0)
    expect(neighbourWeight(0.875, 0.75)).toBeCloseTo(0.5, 10)
    expect(neighbourWeight(0.9999, 0.75)).toBeCloseTo(1, 3)
    expect(neighbourWeight(1.2, 0.75)).toBe(1)
    const [Sa] = influenceRadii([a, b], on)
    const inEdge = gravityAccelAt(a.x + Sa - 1e-6, 300, [a, b], on)
    const outEdge = gravityAccelAt(a.x + Sa + 1e-6, 300, [a, b], on)
    expect(inEdge.ax).toBeCloseTo(outEdge.ax, 3)
  })
})

describe('gravity reach', () => {
  const p = [planet(0, 0, 30)]
  const reach: Tuning = { ...cloneTuning(), gravityReach: 100 }

  it('is unchanged inside the fade start and gone past the reach', () => {
    const full = gravityAccelAt(30 + 50, 0, p, DEFAULT_TUNING)
    expect(gravityAccelAt(30 + 50, 0, p, reach).ax).toBeCloseTo(full.ax, 10)
    expect(gravityAccelAt(30 + 100, 0, p, reach).ax).toBeCloseTo(0, 10)
    expect(gravityAccelAt(30 + 300, 0, p, reach).ax).toBeCloseTo(0, 10)
  })

  it('fades monotonically in between', () => {
    const a70 = Math.abs(gravityAccelAt(100, 0, p, reach).ax)
    const a90 = Math.abs(gravityAccelAt(120, 0, p, reach).ax)
    expect(a70).toBeGreaterThan(a90)
    expect(a90).toBeGreaterThan(0)
  })
})

describe('generatePlanets', () => {
  const seeds = [1, 2, 7, 42, 1337, 90210]

  it('never overlaps planets and always keeps at least the clearance floor', () => {
    for (const s of seeds) {
      const planets = generatePlanets(GAME_W, GAME_H, DEFAULT_TUNING, seeded(s))
      for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
          const d = Math.hypot(planets[i].x - planets[j].x, planets[i].y - planets[j].y)
          expect(d).toBeGreaterThan(planets[i].r + planets[j].r + MIN_PLANET_CLEARANCE)
        }
      }
    }
  })

  it('leaves the ship start position at the field center clear', () => {
    for (const s of seeds) {
      const planets = generatePlanets(GAME_W, GAME_H, DEFAULT_TUNING, seeded(s))
      for (const p of planets) {
        const d = Math.hypot(p.x - GAME_W / 2, p.y - GAME_H / 2)
        expect(d).toBeGreaterThanOrEqual(START_CLEARANCE + p.r)
      }
    }
  })

  it('produces the requested planet count on a roomy field', () => {
    const planets = generatePlanets(GAME_W, GAME_H, DEFAULT_TUNING, seeded(5))
    expect(planets).toHaveLength(DEFAULT_TUNING.planetCount)
  })

  it('terminates in bounded time on an over-crowded field', () => {
    // 7 planets in a tiny field cannot satisfy the clearance rules.
    const crowded: Tuning = { ...cloneTuning(), planetCount: 7 }
    const start = Date.now()
    const planets = generatePlanets(200, 200, crowded, seeded(3))
    expect(Date.now() - start).toBeLessThan(1000)

    // Fewer planets than requested is the correct degradation...
    expect(planets.length).toBeLessThan(crowded.planetCount)
    // ...but the ones that WERE placed still satisfy every invariant. A crowded
    // field must never yield overlapping planets or a blocked spawn.
    for (let i = 0; i < planets.length; i++) {
      expect(Math.hypot(planets[i].x - 100, planets[i].y - 100)).toBeGreaterThanOrEqual(
        START_CLEARANCE + planets[i].r,
      )
      for (let j = i + 1; j < planets.length; j++) {
        const d = Math.hypot(planets[i].x - planets[j].x, planets[i].y - planets[j].y)
        expect(d).toBeGreaterThan(planets[i].r + planets[j].r + MIN_PLANET_CLEARANCE)
      }
    }
  })

  it('precomputes baseArea as r squared', () => {
    for (const p of generatePlanets(GAME_W, GAME_H, DEFAULT_TUNING, seeded(11))) {
      expect(p.baseArea).toBeCloseTo(p.r * p.r, 10)
    }
  })
})

describe('spawnStar', () => {
  it('places the star clear of every planet surface', () => {
    const planets = generatePlanets(GAME_W, GAME_H, DEFAULT_TUNING, seeded(9))
    for (const s of [1, 4, 8, 15, 16, 23]) {
      const star = spawnStar(GAME_W, GAME_H, planets, seeded(s))
      for (const p of planets) {
        expect(Math.hypot(p.x - star.x, p.y - star.y)).toBeGreaterThan(p.r + STAR_CLEARANCE)
      }
      expect(star.collected).toBe(false)
    }
  })
})

describe('scoreRateAt', () => {
  const planets = [planet(200, 200, 40)]
  const t = DEFAULT_TUNING

  it('awards only the base rate beyond the proximity range', () => {
    const farX = 200 + 40 + t.scoreRange + 50
    expect(scoreRateAt(farX, 200, planets, t)).toBeCloseTo(t.scoreBase, 10)
  })

  it('awards the maximum bonus at the surface', () => {
    const surfaceX = 200 + 40 + t.shipRadius
    expect(scoreRateAt(surfaceX, 200, planets, t)).toBeCloseTo(t.scoreBase + t.scoreBonus, 10)
  })

  it('ramps non-linearly — the midpoint is below the linear average', () => {
    const t0 = t.scoreBase
    const t1 = t.scoreBase + t.scoreBonus
    const midX = 200 + 40 + t.shipRadius + t.scoreRange / 2
    const mid = scoreRateAt(midX, 200, planets, t)

    expect(mid).toBeGreaterThan(t0)
    expect(mid).toBeLessThan(t1)
    // Quadratic ramp: at half range the factor is 0.25, not 0.5.
    expect(mid).toBeLessThan((t0 + t1) / 2)
    expect(mid).toBeCloseTo(t0 + 0.25 * t.scoreBonus, 6)
  })

  it('scores faster in a close orbit than a distant one', () => {
    const close = scoreRateAt(200 + 40 + 20, 200, planets, t)
    const distant = scoreRateAt(200 + 40 + 150, 200, planets, t)
    expect(close).toBeGreaterThan(distant)
  })

  it('uses the nearest planet when several are present', () => {
    const two = [planet(200, 200, 40), planet(20, 20, 40)]
    const nearFirst = scoreRateAt(200 + 40 + 10, 200, two, t)
    expect(nearFirst).toBeCloseTo(scoreRateAt(200 + 40 + 10, 200, [two[0]], t), 10)
  })

  it('falls back to the base rate with no planets', () => {
    expect(scoreRateAt(10, 10, [], t)).toBe(t.scoreBase)
  })
})

describe('stepShip', () => {
  const t = DEFAULT_TUNING

  it('clamps speed to the maximum while preserving direction', () => {
    const fast = { x: 100, y: 100, vx: 5000, vy: 5000 }
    const next = stepShip(fast, [], t, null, 5, 0.016)
    expect(Math.hypot(next.vx, next.vy)).toBeCloseTo(t.maxSpeed, 6)
    // Direction preserved: still a 45° vector.
    expect(next.vx).toBeCloseTo(next.vy, 6)
  })

  it('accelerates along the thrust direction when fuel remains', () => {
    const ship = { x: 100, y: 100, vx: 0, vy: 0 }
    const next = stepShip(ship, [], t, { x: 1, y: 0 }, 5, 0.1)
    expect(next.vx).toBeGreaterThan(0)
    expect(next.vy).toBeCloseTo(0, 6)
  })

  it('ignores thrust when fuel is exhausted', () => {
    const ship = { x: 100, y: 100, vx: 0, vy: 0 }
    const thrusting = stepShip(ship, [], t, { x: 1, y: 0 }, 0, 0.1)
    const coasting = stepShip(ship, [], t, null, 0, 0.1)
    expect(thrusting).toEqual(coasting)
  })

  it('coasts in a straight line with no planets and no thrust', () => {
    const ship = { x: 100, y: 100, vx: 50, vy: 0 }
    const next = stepShip(ship, [], t, null, 5, 0.5)
    expect(next.x).toBeCloseTo(125, 6)
    expect(next.y).toBeCloseTo(100, 6)
  })

  it('curves the ship toward a planet under gravity alone', () => {
    const ship = { x: 100, y: 300, vx: 60, vy: 0 }
    const next = stepShip(ship, [planet(100, 500, 40)], t, null, 5, 0.1)
    expect(next.vy).toBeGreaterThan(0)
  })
})

describe('checkLoss', () => {
  const t = DEFAULT_TUNING

  it('reports a contact on planet overlap', () => {
    const p = [planet(200, 200, 40)]
    const touching = { x: 200 + 40 + t.shipRadius - 1, y: 200, vx: 0, vy: 0 }
    expect(checkLoss(touching, p, t, 5)).toEqual({ contact: 0 })
  })

  it('does not report a crash just outside the surface', () => {
    const p = [planet(200, 200, 40)]
    const clear = { x: 200 + 40 + t.shipRadius + 1, y: 200, vx: 0, vy: 0 }
    expect(checkLoss(clear, p, t, 5)).toBeNull()
  })

  it('reports out-of-bounds past the margin', () => {
    const gone = { x: GAME_W + OUT_OF_BOUNDS_MARGIN + 1, y: 100, vx: 0, vy: 0 }
    expect(checkLoss(gone, [], t, 5)).toBe('out-of-bounds')
  })

  it('does not end the run just outside the visible field but within the margin', () => {
    const offscreen = { x: GAME_W + OUT_OF_BOUNDS_MARGIN - 10, y: -20, vx: 0, vy: 0 }
    expect(checkLoss(offscreen, [], t, 5)).toBeNull()
  })

  it('reports out-of-fuel once the grace period after running dry has passed', () => {
    const safe = { x: GAME_W / 2, y: GAME_H / 2, vx: 0, vy: 0 }
    expect(checkLoss(safe, [], t, 0, t.fuelGraceSec)).toBe('out-of-fuel')
  })

  it('keeps the run alive during the grace period after running dry', () => {
    const safe = { x: GAME_W / 2, y: GAME_H / 2, vx: 0, vy: 0 }
    expect(checkLoss(safe, [], t, 0, 0)).toBeNull()
    expect(checkLoss(safe, [], t, 0, t.fuelGraceSec - 0.1)).toBeNull()
  })

  it('prefers the contact when out of fuel and touching a planet', () => {
    const p = [planet(200, 200, 40)]
    const touching = { x: 200, y: 200, vx: 0, vy: 0 }
    expect(checkLoss(touching, p, t, 0)).toEqual({ contact: 0 })
  })

  it('never reports out-of-bounds in wrap mode', () => {
    const wrap: Tuning = { ...cloneTuning(), edgeMode: 'wrap' }
    const gone = { x: GAME_W + OUT_OF_BOUNDS_MARGIN + 1, y: 100, vx: 0, vy: 0 }
    expect(checkLoss(gone, [], wrap, 5)).toBeNull()
  })

  it('returns null during normal flight', () => {
    const safe = { x: GAME_W / 2, y: GAME_H / 2, vx: 10, vy: 10 }
    expect(checkLoss(safe, [planet(50, 50, 30)], t, 3)).toBeNull()
  })
})

describe('projectForecast', () => {
  const t = DEFAULT_TUNING

  it('returns only the current position when the forecast is disabled', () => {
    const off: Tuning = { ...cloneTuning(), forecastRange: 0 }
    const pts = projectForecast({ x: 100, y: 100, vx: 50, vy: 0 }, [], off)
    expect(pts).toHaveLength(1)
    expect(pts[0]).toEqual({ x: 100, y: 100 })
  })

  it('starts at the ship position', () => {
    const pts = projectForecast({ x: 120, y: 340, vx: 30, vy: 10 }, [], t)
    expect(pts[0]).toEqual({ x: 120, y: 340 })
  })

  it('ends at a planet placed directly ahead', () => {
    const target = planet(200, 100, 40)
    const pts = projectForecast({ x: 40, y: 100, vx: 120, vy: 0 }, [target], t)
    const last = pts[pts.length - 1]
    expect(Math.hypot(target.x - last.x, target.y - last.y)).toBeLessThan(target.r + t.shipRadius + 5)
  })

  it('ignores thrust — the path depends only on position and velocity', () => {
    const ship = { x: 100, y: 300, vx: 40, vy: 0 }
    const planets = [planet(100, 500, 40)]
    // projectForecast takes no thrust argument at all; same ship state, same path.
    expect(projectForecast(ship, planets, t)).toEqual(projectForecast(ship, planets, t))
  })

  it('stays within the step cap when nothing terminates it early', () => {
    const roomy: Tuning = { ...cloneTuning(), forecastRange: 1e9 }
    const pts = projectForecast({ x: 200, y: 360, vx: 1, vy: 0 }, [], roomy)
    expect(pts.length).toBeLessThanOrEqual(FORECAST_MAX_STEPS + 1)
  })

  it('stops once the forecast range is travelled', () => {
    const ship = { x: 10, y: 360, vx: 200, vy: 0 }
    const pts = projectForecast(ship, [], t)
    const last = pts[pts.length - 1]
    // Straight line with no gravity: distance travelled is bounded by the range
    // plus at most one step's worth of overshoot.
    expect(last.x - ship.x).toBeLessThan(t.forecastRange + 200 * 0.035 + 1)
  })

  it('stops when the path leaves the field', () => {
    const roomy: Tuning = { ...cloneTuning(), forecastRange: 1e9 }
    const pts = projectForecast({ x: GAME_W - 10, y: 360, vx: 240, vy: 0 }, [], roomy)
    expect(pts.length).toBeLessThan(FORECAST_MAX_STEPS + 1)
    expect(pts[pts.length - 1].x).toBeGreaterThan(GAME_W)
  })
})

describe('wrap geometry', () => {
  const wrap: Tuning = { ...cloneTuning(), edgeMode: 'wrap' }

  it('maps displacements onto the shortest wrapped vector', () => {
    expect(wrapDelta(380, 400)).toBeCloseTo(-20, 10)
    expect(wrapDelta(-380, 400)).toBeCloseTo(20, 10)
    expect(wrapDelta(150, 400)).toBeCloseTo(150, 10)
  })

  it('keeps gravity continuous across the seam', () => {
    const p = [planet(330, 300, 30)]
    const before = gravityAccelAt(GAME_W - 0.1, 300, p, wrap)
    const after = gravityAccelAt(0.1, 300, p, wrap)
    // The crossing is a real 0.2px move toward the planet, so allow that much change.
    expect(Math.abs(after.ax - before.ax) / Math.abs(before.ax)).toBeLessThan(0.02)
    expect(after.ay).toBeCloseTo(before.ay, 6)
    // Without wrap the same crossing is a jump: the planet no longer pulls left.
    expect(gravityAccelAt(0.1, 300, p, DEFAULT_TUNING).ax).toBeGreaterThan(0)
    expect(before.ax).toBeLessThan(0)
    expect(after.ax).toBeLessThan(0)
  })

  it('carries the ship across the edge with velocity preserved', () => {
    const next = stepShip({ x: GAME_W - 1, y: 300, vx: 200, vy: 0 }, [], wrap, null, 5, 0.05)
    expect(next.x).toBeCloseTo(9, 6)
    expect(next.vx).toBeCloseTo(200, 6)
  })

  it('leaves bounded-mode motion unwrapped', () => {
    const next = stepShip({ x: GAME_W - 1, y: 300, vx: 200, vy: 0 }, [], DEFAULT_TUNING, null, 5, 0.05)
    expect(next.x).toBeCloseTo(GAME_W + 9, 6)
  })

  it('continues the forecast across the seam and marks the break', () => {
    const roomy: Tuning = { ...wrap, forecastRange: 1e9 }
    const pts = projectForecast({ x: GAME_W - 10, y: 360, vx: 240, vy: 0 }, [], roomy)
    expect(pts).toHaveLength(FORECAST_MAX_STEPS + 1)
    const seam = pts.findIndex((p) => p.brk)
    expect(seam).toBeGreaterThan(0)
    expect(pts[seam].x).toBeLessThan(20)
    expect(pts.every((p) => p.x >= 0 && p.x < GAME_W)).toBe(true)
  })

  it('does not wrap the forecast in bounded mode', () => {
    const roomy: Tuning = { ...cloneTuning(), forecastRange: 1e9 }
    const pts = projectForecast({ x: GAME_W - 10, y: 360, vx: 240, vy: 0 }, [], roomy)
    expect(pts.some((p) => p.brk)).toBe(false)
  })
})

describe('thrustDirection', () => {
  const ship = { x: 5, y: 360 }

  it('relative: follows the drag vector regardless of ship position', () => {
    const d = thrustDirection('relative', ship, { x: 200, y: 360 }, { x: 150, y: 360 }, null, 14)
    expect(d!.x).toBeCloseTo(-1, 10)
    expect(d!.y).toBeCloseTo(0, 10)
  })

  it('relative: throttle ramps with drag distance up to full', () => {
    const origin = { x: 200, y: 360 }
    const at = (d: number) => thrustDirection('relative', ship, origin, { x: 200 + d, y: 360 }, null, 20, 100)!
    // Halfway through the ramp is a quarter throttle — gentle near the deadzone.
    expect(at(60).x).toBeCloseTo(0.25, 10)
    expect(at(60).y).toBeCloseTo(0, 10)
    expect(at(21).x).toBeLessThan(0.05)
    expect(at(100).x).toBeCloseTo(1, 10)
    expect(at(300).x).toBeCloseTo(1, 10)
  })

  it('relative: no thrust inside the deadzone', () => {
    expect(thrustDirection('relative', ship, { x: 200, y: 360 }, { x: 205, y: 362 }, null, 14)).toBeNull()
  })

  it('direct: points from the ship to the pointer', () => {
    const d = thrustDirection('direct', { x: 100, y: 100 }, null, { x: 100, y: 300 }, null, 18)
    expect(d!.x).toBeCloseTo(0, 10)
    expect(d!.y).toBeCloseTo(1, 10)
  })

  it('direct: holds the last direction when the finger covers the ship', () => {
    const last = { x: 0.6, y: 0.8 }
    expect(thrustDirection('direct', { x: 100, y: 100 }, null, { x: 103, y: 98 }, last, 18)).toBe(last)
  })

  it('returns null when nothing is held', () => {
    expect(thrustDirection('direct', ship, null, null, { x: 1, y: 0 }, 18)).toBeNull()
  })
})

describe('shields', () => {
  const t = DEFAULT_TUNING
  const p = planet(200, 200, 40)
  const surface = 200 + 40 + t.shipRadius - 1

  it('treats a fast skim along the surface as glancing', () => {
    // Moving almost purely tangentially (the normal here is +x).
    expect(classifyImpact({ x: surface, y: 200, vx: -30, vy: 230 }, p, t)).toBe('glancing')
  })

  it('treats a fast straight-in drop as direct', () => {
    expect(classifyImpact({ x: surface, y: 200, vx: -200, vy: 10 }, p, t)).toBe('direct')
  })

  it('knocks the ship clear: outside the surface, moving out and along', () => {
    const hit = { x: surface, y: 200, vx: -40, vy: 120 }
    const out = resolveGlancingImpact(hit, p, t)
    expect(Math.hypot(out.x - p.x, out.y - p.y)).toBeGreaterThan(p.r + t.shipRadius)
    expect(out.vx).toBeGreaterThan(0) // outward (+x normal)
    expect(out.vy).toBeGreaterThan(0) // same way it was sliding
    expect(Math.hypot(out.vx, out.vy)).toBeLessThanOrEqual(t.maxSpeed + 1e-9)
  })

  it('gives a tangential kick even on a dead-on contact', () => {
    const out = resolveGlancingImpact({ x: surface, y: 200, vx: -50, vy: 0 }, p, t)
    expect(Math.abs(out.vy)).toBeGreaterThan(50)
    expect(out.vx).toBeGreaterThan(0)
  })
})

describe('orbit capture', () => {
  const t = DEFAULT_TUNING
  const p = planet(200, 360, 40)
  const [ring] = orbitRings([p], t)

  it('scales ring height with planet size, so small planets orbit lower and slower', () => {
    expect(ring.R).toBeCloseTo(40 + Math.max((t.orbitHeight * 40) / PLANET_MAX_R, MIN_RING_HEIGHT), 10)
    const [small] = orbitRings([planet(200, 360, 24)], t)
    const [big] = orbitRings([planet(200, 360, PLANET_MAX_R)], t)
    expect(small.R - 24).toBeLessThan(big.R - PLANET_MAX_R)
    expect(small.vc).toBeLessThan(big.vc)
  })

  it('uses the true circular speed, so a released ship keeps orbiting', () => {
    const GM = t.G * p.baseArea * t.massScale
    expect(ring.vc).toBeCloseTo(Math.sqrt(GM / ring.R), 6)
    let ship = advanceOrbit({ planetIdx: 0, angle: 0, dir: 1 }, ring, t, 0).ship
    for (let i = 0; i < 20 * 120; i++) {
      ship = stepShip(ship, [p], t, null, 0, 1 / 120)
      expect(Math.abs(ringOffset(ship, ring, t))).toBeLessThan(2)
    }
  })

  it('raises a ring whose orbit would need more than maxSpeed, rather than faking the speed', () => {
    const strong: Tuning = { ...cloneTuning(), G: 3000 }
    const [r] = orbitRings([p], strong)
    const base = 40 + Math.max((strong.orbitHeight * 40) / PLANET_MAX_R, MIN_RING_HEIGHT)
    expect(r.R).toBeGreaterThan(base)
    expect(r.vc).toBeLessThan(strong.maxSpeed)
    const GM = strong.G * p.baseArea * strong.massScale
    expect(r.vc).toBeCloseTo(Math.sqrt(GM / r.R), 6)
  })

  it('drops a ring that does not fit inside its influence zone', () => {
    // A small planet near a big one: the ring clears the big planet's surface,
    // but the big planet's pull owns most of the gap, so the small zone is too tight.
    const crowded = [planet(100, 360, 24), planet(250, 360, 54)]
    expect(orbitRings(crowded, t).map((r) => r.planetIdx)).not.toContain(0)
    const off = orbitRings(crowded, { ...cloneTuning(), influenceZones: false })
    expect(off.map((r) => r.planetIdx)).toContain(0)
  })

  it('holds released orbits in generated layouts when influence zones are on', () => {
    for (const seed of [1, 2, 7, 42]) {
      const ps = generatePlanets(GAME_W, GAME_H, t, seeded(seed))
      for (const r of orbitRings(ps, t)) {
        let ship = advanceOrbit({ planetIdx: r.planetIdx, angle: 0.5, dir: 1 }, r, t, 0).ship
        for (let i = 0; i < 15 * 120; i++) ship = stepShip(ship, ps, t, null, 0, 1 / 120)
        expect(Math.abs(ringOffset(ship, r, t))).toBeLessThan(3)
      }
    }
  })

  it('culls a ring that would pass through another planet', () => {
    const rings = orbitRings([p, planet(200 + ring.R + 30, 360, 25)], { ...cloneTuning(), influenceZones: false })
    expect(rings.map((r) => r.planetIdx)).not.toContain(0)
  })

  it('captures a tangent approach at the circular speed inside the band', () => {
    const ship = { x: 200 + ring.R + 5, y: 360, vx: 0, vy: ring.vc }
    const lock = tryCapture(ship, [ring], t)
    expect(lock).not.toBeNull()
    expect(lock!.dir).toBe(1)
  })

  it('does not capture a steep approach, a wrong speed, or outside the band', () => {
    const steep = { x: 200 + ring.R, y: 360, vx: -ring.vc, vy: ring.vc * 0.3 }
    const slow = { x: 200 + ring.R, y: 360, vx: 0, vy: ring.vc * 0.2 }
    const far = { x: 200 + ring.R + t.captureBand + 5, y: 360, vx: 0, vy: ring.vc }
    expect(tryCapture(steep, [ring], t)).toBeNull()
    expect(tryCapture(slow, [ring], t)).toBeNull()
    expect(tryCapture(far, [ring], t)).toBeNull()
  })

  it('skips the ring the ship was just released from', () => {
    const ship = { x: 200 + ring.R, y: 360, vx: 0, vy: ring.vc }
    expect(tryCapture(ship, [ring], t, 0)).toBeNull()
  })

  it('holds the ship exactly on the ring while locked', () => {
    let lock = tryCapture({ x: 200 + ring.R + 5, y: 360, vx: 0, vy: ring.vc }, [ring], t)!
    for (let i = 0; i < 2000; i++) {
      const res = advanceOrbit(lock, ring, t, 1 / 120)
      lock = res.lock
      expect(Math.abs(ringOffset(res.ship, ring, t))).toBeLessThan(1e-6)
      expect(Math.hypot(res.ship.vx, res.ship.vy)).toBeCloseTo(ring.vc, 6)
    }
  })

  it('fades locked scoring to zero over the configured arc', () => {
    expect(orbitScoreFactor(0, 180)).toBe(1)
    expect(orbitScoreFactor(Math.PI / 2, 180)).toBeCloseTo(0.5, 10)
    expect(orbitScoreFactor(Math.PI, 180)).toBeCloseTo(0, 10)
    expect(orbitScoreFactor(3 * Math.PI, 180)).toBe(0)
    expect(orbitScoreFactor(Math.PI, 360)).toBeCloseTo(0.5, 10)
  })
})

describe('offscreenIndicator', () => {
  it('is null while the ship is on screen', () => {
    expect(offscreenIndicator({ x: 200, y: 360 })).toBeNull()
  })

  it('anchors to the nearest edge and points at the ship', () => {
    const ind = offscreenIndicator({ x: GAME_W + 50, y: 300 })!
    expect(ind.x).toBe(GAME_W - 14)
    expect(ind.y).toBe(300)
    expect(ind.angle).toBeCloseTo(0, 10)
    expect(ind.overshoot).toBe(50)
  })

  it('escalates danger toward the out-of-bounds margin', () => {
    const near = offscreenIndicator({ x: -20, y: 300 })!
    const far = offscreenIndicator({ x: -OUT_OF_BOUNDS_MARGIN + 5, y: 300 })!
    expect(far.danger).toBeGreaterThan(near.danger)
    expect(far.danger).toBeLessThanOrEqual(1)
  })
})
