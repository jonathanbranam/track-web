import { STAR_R, type Course } from './levels'
import {
  COURSE_W,
  clampSpeed,
  displacement,
  gravityAccelAt,
  onRing,
  pullFrom,
  wrapCoord,
  type Tuning,
} from './physics'

/**
 * The shot: one pure function computes a whole flight before the ship moves.
 * The forecast draws a truncated run of it and the scene replays the full run,
 * so what the player sees is exactly what happens (design §3).
 */

/** Fixed simulation step, seconds. Same for forecast and flight — never change one alone. */
export const SIM_DT = 1 / 120

/** Where the ship rests between shots: a planet's ring, an angle on it, a direction. */
export interface Lie {
  planet: number
  /** Radians. */
  angle: number
  dir: 1 | -1
}

export interface ShotInput {
  /** Release point on the lie's ring, radians. */
  angle: number
  /** 0..1. */
  power: number
}

export type ShotEvent =
  | { step: number; kind: 'star'; star: number }
  | { step: number; kind: 'bounce'; planet: number; x: number; y: number; damage: number }
  | { step: number; kind: 'wall'; x: number; y: number; damage: number }

export type Outcome =
  | { kind: 'lock'; lie: Lie }
  | { kind: 'wormhole' }
  | { kind: 'out-of-bounds' }
  | { kind: 'adrift' }
  | { kind: 'destroyed' }

/** Bits in ShotResult.zone: what the ship was inside at each point. */
export const ZONE_WIND = 1
export const ZONE_ASTEROIDS = 2
export const ZONE_RADIATION = 4

export interface ShotResult {
  /** One point per step; index 0 is the release point. */
  xs: number[]
  ys: number[]
  /** Hull at each point. */
  hull: number[]
  zone: number[]
  events: ShotEvent[]
  /** Null when the run was cut short by maxLength before anything ended it. */
  outcome: Outcome | null
  /** Star indices collected on this shot, in order. */
  stars: number[]
  /** Distance travelled. */
  length: number
  finalHull: number
}

export interface SimOptions {
  hull: number
  /** Stars already collected before this shot. */
  collected: readonly boolean[]
  /** Stop once this far has been travelled (the forecast). */
  maxLength?: number
}

/** Launch speed for a power on a ring. */
export function launchSpeed(vc: number, power: number, tuning: Tuning): number {
  return Math.min(vc + Math.max(0, Math.min(1, power)) * tuning.launchBoost, tuning.maxSpeed)
}

/** The ship at release: on the ring at the release angle, moving prograde. */
export function launchState(course: Course, lie: Lie, shot: ShotInput, tuning: Tuning) {
  const ring = course.rings[lie.planet]
  if (!ring) throw new Error(`planet ${lie.planet} has no ring`)
  return onRing(ring, shot.angle, lie.dir, launchSpeed(ring.vc, shot.power, tuning), course.wrapX)
}

/** Hull lost for hitting a surface with this into-surface speed. */
export function collisionDamage(inward: number, rate: number, tuning: Tuning): number {
  return Math.max(0, inward - tuning.damageThreshold) * rate
}

export function simulateShot(course: Course, lie: Lie, shot: ShotInput, opts: SimOptions, tuning: Tuning): ShotResult {
  const dt = SIM_DT
  const { planets, S, rings, wormhole: w, pieces, wrapX, height } = course
  const rS = tuning.shipRadius
  let { x, y, vx, vy } = launchState(course, lie, shot, tuning)
  let hull = opts.hull

  const xs = [x]
  const ys = [y]
  const hulls = [hull]
  const zones = [0]
  const events: ShotEvent[] = []
  const stars: number[] = []
  const taken = course.stars.map((_, i) => opts.collected[i] ?? false)

  // Signed distance from each ring, to detect a crossing between two steps.
  const prevOff = rings.map((r) => (r ? Math.hypot(displacement(r.x, r.y, x, y, wrapX).dx, y - r.y) - r.R : 0))
  // The launch ring ignores the ship until it has left the band once.
  let blocked: number | null = lie.planet

  const maxSteps = Math.ceil(tuning.maxFlightSec / dt)
  let length = 0
  let outcome: Outcome | null = null
  let truncated = false

  for (let step = 1; step <= maxSteps; step++) {
    // ── Forces at the current point ──
    const g = gravityAccelAt(x, y, planets, S, tuning, wrapX)
    let ax = g.ax
    let ay = g.ay
    const wd = displacement(x, y, w.x, w.y, wrapX)
    const wa = pullFrom(wd.dx, wd.dy, w.r, tuning.wormholePull, tuning)
    ax += wa.ax
    ay += wa.ay

    let zone = 0
    for (const p of pieces) {
      if (p.kind === 'radiation') {
        if (Math.hypot(x - p.x, y - p.y) <= p.r) zone |= ZONE_RADIATION
      } else if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        if (p.kind === 'wind') {
          ax += p.ax
          ay += p.ay
          zone |= ZONE_WIND
        } else {
          zone |= ZONE_ASTEROIDS
        }
      }
    }

    vx += ax * dt
    vy += ay * dt
    if (zone & ZONE_ASTEROIDS) {
      const k = Math.exp(-tuning.asteroidDrag * dt)
      vx *= k
      vy *= k
    }
    ;[vx, vy] = clampSpeed(vx, vy, tuning.maxSpeed)

    const px = x
    const py = y
    x += vx * dt
    y += vy * dt
    const stepLen = Math.hypot(x - px, y - py)
    length += stepLen
    let damage = 0

    // ── Side edges ──
    if (wrapX) {
      x = wrapCoord(x, COURSE_W)
    } else if (x < rS && vx < 0) {
      const d = collisionDamage(-vx, tuning.wallDamageRate, tuning)
      vx = -vx * tuning.restitution
      x = rS
      damage += d
      events.push({ step, kind: 'wall', x, y, damage: d })
    } else if (x > COURSE_W - rS && vx > 0) {
      const d = collisionDamage(vx, tuning.wallDamageRate, tuning)
      vx = -vx * tuning.restitution
      x = COURSE_W - rS
      damage += d
      events.push({ step, kind: 'wall', x, y, damage: d })
    }

    // ── Planet bounces ──
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i]
      const { dx, dy } = displacement(p.x, p.y, x, y, wrapX)
      const dist = Math.hypot(dx, dy)
      const rest = p.r + rS
      if (dist >= rest) continue
      const nx = dist > 0 ? dx / dist : 0
      const ny = dist > 0 ? dy / dist : -1
      const vn = vx * nx + vy * ny
      if (vn < 0) {
        const d = collisionDamage(-vn, tuning.planetDamageRate, tuning)
        vx -= (1 + tuning.restitution) * vn * nx
        vy -= (1 + tuning.restitution) * vn * ny
        damage += d
        events.push({ step, kind: 'bounce', planet: i, x: x, y: y, damage: d })
      }
      x = p.x + nx * (rest + 0.01)
      y = p.y + ny * (rest + 0.01)
      if (wrapX) x = wrapCoord(x, COURSE_W)
    }

    // ── Zone damage ──
    if (zone & ZONE_ASTEROIDS) damage += tuning.asteroidDamagePerUnit * stepLen
    if (zone & ZONE_RADIATION) damage += tuning.radiationDps * dt
    hull = Math.max(0, hull - damage)

    // ── Stars ──
    for (let i = 0; i < course.stars.length; i++) {
      if (taken[i]) continue
      const s = course.stars[i]
      const { dx, dy } = displacement(x, y, s.x, s.y, wrapX)
      if (Math.hypot(dx, dy) <= rS + STAR_R) {
        taken[i] = true
        stars.push(i)
        events.push({ step, kind: 'star', star: i })
      }
    }

    xs.push(x)
    ys.push(y)
    hulls.push(hull)
    zones.push(zone)

    if (hull <= 0) {
      outcome = { kind: 'destroyed' }
      break
    }

    // ── Wormhole ──
    const wd2 = displacement(x, y, w.x, w.y, wrapX)
    if (Math.hypot(wd2.dx, wd2.dy) <= w.r) {
      outcome = { kind: 'wormhole' }
      break
    }

    // ── Capture ──
    const speed = Math.hypot(vx, vy)
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i]
      if (!r) continue
      const { dx, dy } = displacement(r.x, r.y, x, y, wrapX)
      const off = Math.hypot(dx, dy) - r.R
      const prev = prevOff[i]
      prevOff[i] = off
      if (blocked === i) {
        if (Math.abs(off) > tuning.captureBand) blocked = null
        continue
      }
      const onBand = Math.abs(off) <= tuning.captureBand || Math.sign(off) !== Math.sign(prev)
      if (!onBand || speed > tuning.captureSpeedRatio * r.vc) continue
      const angle = Math.atan2(dy, dx)
      // Tangent (−sin, cos) is the +1 direction; the sign of v along it picks the way round.
      const along = -vx * Math.sin(angle) + vy * Math.cos(angle)
      const dir: 1 | -1 = along >= 0 ? 1 : -1
      const at = onRing(r, angle, dir, r.vc, wrapX)
      xs[xs.length - 1] = at.x
      ys[ys.length - 1] = at.y
      outcome = { kind: 'lock', lie: { planet: i, angle, dir } }
      break
    }
    if (outcome) break

    // ── Out of bounds ──
    if (y < -tuning.obMargin || y > height + tuning.obMargin) {
      outcome = { kind: 'out-of-bounds' }
      break
    }

    if (opts.maxLength !== undefined && length >= opts.maxLength) {
      truncated = true
      break
    }
  }

  if (!outcome && !truncated) outcome = { kind: 'adrift' }
  return { xs, ys, hull: hulls, zone: zones, events, outcome, stars, length, finalHull: hull }
}
