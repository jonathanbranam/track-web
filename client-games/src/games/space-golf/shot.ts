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
  /** Vector shots: unit direction of the launch impulse. Absent = prograde. */
  dir?: { x: number; y: number }
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
  /** Full-throttle seconds of nudging (always 0 for a simulated, un-nudged shot). */
  fuelUsed: number
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

/**
 * The ship at release, on the ring at the release angle. Prograde: moving along
 * the orbit at launchSpeed. Vector: the orbital velocity plus an impulse of
 * power × launchBoost along `dir`, clamped to maxSpeed.
 */
export function launchState(course: Course, lie: Lie, shot: ShotInput, tuning: Tuning) {
  const ring = course.rings[lie.planet]
  if (!ring) throw new Error(`planet ${lie.planet} has no ring`)
  if (!shot.dir) return onRing(ring, shot.angle, lie.dir, launchSpeed(ring.vc, shot.power, tuning), course.wrapX)
  const at = onRing(ring, shot.angle, lie.dir, ring.vc, course.wrapX)
  const boost = Math.max(0, Math.min(1, shot.power)) * tuning.launchBoost
  const [vx, vy] = clampSpeed(at.vx + shot.dir.x * boost, at.vy + shot.dir.y * boost, tuning.maxSpeed)
  return { ...at, vx, vy }
}

/** Hull lost for hitting a surface with this into-surface speed. */
export function collisionDamage(inward: number, rate: number, tuning: Tuning): number {
  return Math.max(0, inward - tuning.damageThreshold) * rate
}

/** Everything a flight carries from one step to the next. Mutated by stepFlight. */
export interface FlightState {
  x: number
  y: number
  vx: number
  vy: number
  hull: number
  /** Per star: collected before or during this flight. */
  taken: boolean[]
  /** Signed distance from each ring at the last step, to detect a crossing. */
  prevOff: number[]
  /** The launch ring ignores the ship until it has left the band once. */
  blocked: number | null
  /** Steps taken so far. */
  step: number
  maxSteps: number
  /** Distance travelled. */
  length: number
  /** Full-throttle seconds of nudging so far. */
  fuelUsed: number
}

/** A thrust vector: direction scaled by throttle (0..1]. */
export interface Thrust {
  x: number
  y: number
}

export interface StepResult {
  x: number
  y: number
  hull: number
  zone: number
  events: ShotEvent[]
  /** Set on the step the flight ends; null while it goes on. */
  outcome: Outcome | null
}

/** The ship at the release point, ready for stepFlight. */
export function startFlight(course: Course, lie: Lie, shot: ShotInput, opts: SimOptions, tuning: Tuning): FlightState {
  const { x, y, vx, vy } = launchState(course, lie, shot, tuning)
  return {
    x,
    y,
    vx,
    vy,
    hull: opts.hull,
    taken: course.stars.map((_, i) => opts.collected[i] ?? false),
    prevOff: course.rings.map((r) => (r ? Math.hypot(displacement(r.x, r.y, x, y, course.wrapX).dx, y - r.y) - r.R : 0)),
    blocked: lie.planet,
    step: 0,
    maxSteps: Math.ceil(tuning.maxFlightSec / SIM_DT),
    length: 0,
    fuelUsed: 0,
  }
}

/**
 * One fixed step of flight — the only step rule. The forecast, an un-nudged
 * flight and a nudged flight all run through here, so they cannot disagree.
 * `thrust` (or null) is the nudge for this step. Mutates `s`.
 */
export function stepFlight(course: Course, s: FlightState, thrust: Thrust | null, tuning: Tuning): StepResult {
  const dt = SIM_DT
  const { planets, S, rings, wormhole: w, pieces, wrapX, height } = course
  const rS = tuning.shipRadius
  const step = ++s.step
  let { x, y, vx, vy, hull } = s
  const events: ShotEvent[] = []
  let outcome: Outcome | null = null

  // ── Forces at the current point ──
  const g = gravityAccelAt(x, y, planets, S, tuning, wrapX)
  let ax = g.ax
  let ay = g.ay
  const wd = displacement(x, y, w.x, w.y, wrapX)
  const wa = pullFrom(wd.dx, wd.dy, w.r, tuning.wormholePull, tuning)
  ax += wa.ax
  ay += wa.ay
  if (thrust) {
    // The component against the current velocity gets its own max (retro rockets).
    let tx = thrust.x * tuning.nudgeThrust
    let ty = thrust.y * tuning.nudgeThrust
    const speed = Math.hypot(vx, vy)
    if (speed > 0) {
      const ux = vx / speed
      const uy = vy / speed
      const brake = -(thrust.x * ux + thrust.y * uy)
      if (brake > 0) {
        const extra = brake * (tuning.nudgeBrakeThrust - tuning.nudgeThrust)
        tx += ux * -extra
        ty += uy * -extra
      }
    }
    ax += tx
    ay += ty
    s.fuelUsed += Math.hypot(thrust.x, thrust.y) * dt
  }

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
  s.length += stepLen
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
    if (s.taken[i]) continue
    const st = course.stars[i]
    const { dx, dy } = displacement(x, y, st.x, st.y, wrapX)
    if (Math.hypot(dx, dy) <= rS + STAR_R) {
      s.taken[i] = true
      events.push({ step, kind: 'star', star: i })
    }
  }

  s.vx = vx
  s.vy = vy
  s.hull = hull
  const done = (o: Outcome, at = { x, y }): StepResult => {
    s.x = at.x
    s.y = at.y
    return { x: at.x, y: at.y, hull, zone, events, outcome: o }
  }

  if (hull <= 0) return done({ kind: 'destroyed' })

  // ── Wormhole ──
  const wd2 = displacement(x, y, w.x, w.y, wrapX)
  if (Math.hypot(wd2.dx, wd2.dy) <= w.r) return done({ kind: 'wormhole' })

  // ── Capture ──
  const speed = Math.hypot(vx, vy)
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i]
    if (!r) continue
    const { dx, dy } = displacement(r.x, r.y, x, y, wrapX)
    const off = Math.hypot(dx, dy) - r.R
    const prev = s.prevOff[i]
    s.prevOff[i] = off
    if (s.blocked === i) {
      if (Math.abs(off) > tuning.captureBand) s.blocked = null
      continue
    }
    const onBand = Math.abs(off) <= tuning.captureBand || Math.sign(off) !== Math.sign(prev)
    if (!onBand || speed > tuning.captureSpeedRatio * r.vc) continue
    const angle = Math.atan2(dy, dx)
    // Tangent (−sin, cos) is the +1 direction; the sign of v along it picks the way round.
    const along = -vx * Math.sin(angle) + vy * Math.cos(angle)
    const dir: 1 | -1 = along >= 0 ? 1 : -1
    const at = onRing(r, angle, dir, r.vc, wrapX)
    return done({ kind: 'lock', lie: { planet: i, angle, dir } }, { x: at.x, y: at.y })
  }

  // ── Out of bounds ──
  if (y < -tuning.obMargin || y > height + tuning.obMargin) return done({ kind: 'out-of-bounds' })

  s.x = x
  s.y = y
  if (step >= s.maxSteps) return { x, y, hull, zone, events, outcome: { kind: 'adrift' } }
  return { x, y, hull, zone, events, outcome: null }
}

export function simulateShot(course: Course, lie: Lie, shot: ShotInput, opts: SimOptions, tuning: Tuning): ShotResult {
  const s = startFlight(course, lie, shot, opts, tuning)
  const xs = [s.x]
  const ys = [s.y]
  const hulls = [s.hull]
  const zones = [0]
  const events: ShotEvent[] = []
  const stars: number[] = []
  let outcome: Outcome | null = null

  while (!outcome) {
    const r = stepFlight(course, s, null, tuning)
    xs.push(r.x)
    ys.push(r.y)
    hulls.push(r.hull)
    zones.push(r.zone)
    for (const e of r.events) {
      events.push(e)
      if (e.kind === 'star') stars.push(e.star)
    }
    outcome = r.outcome
    if (!outcome && opts.maxLength !== undefined && s.length >= opts.maxLength) break
  }

  return { xs, ys, hull: hulls, zone: zones, events, outcome, stars, length: s.length, finalHull: s.hull, fuelUsed: s.fuelUsed }
}
