// Pure, render-free physics for Space Golf. Forked from Orbital Dodger's
// physics.ts (gravity law, influence zones, reach, orbit rings) and cut down:
// no thrust, fuel, shields or score rate. Nothing here imports Phaser.
//
// Courses are 400 wide and taller than the screen. Only the x axis can wrap —
// the top and bottom of a course are out of bounds, never a seam.

/** Course width, and the logical canvas size the view is scaled from. */
export const COURSE_W = 400
export const VIEW_H = 720

export interface Planet {
  x: number
  y: number
  r: number
  /** r², precomputed — the planet's "area" term in the gravity law. */
  baseArea: number
  /** Gradient stops for the lit-sphere texture: [lit, shadow]. */
  color1: string
  color2: string
  /** Authored ring height above the surface; replaces the radius-derived one. */
  ringHeight?: number
}

export interface Vec {
  ax: number
  ay: number
}

/**
 * Every tunable constant. The tuning panel mutates a live instance; the scene
 * reads it when it simulates a shot, so edits apply from the next shot (and to
 * the forecast straight away).
 */
export interface Tuning {
  /** Global gravity constant. */
  G: number
  /** Extra multiplier on each planet's area term. */
  massScale: number
  /** Speed ceiling; velocity is scaled back to this, preserving direction. */
  maxSpeed: number
  /** Softening floor on distance, so acceleration stays finite near a center. */
  minDist: number
  shipRadius: number
  /** Each planet owns the space where its pull beats its neighbours'; deep inside
   *  it the neighbours are ignored. Off = every planet pulls everywhere. */
  influenceZones: boolean
  /** Fraction of the influence radius inside which neighbours are fully ignored. */
  influenceInner: number
  /** Distance from a surface beyond which a planet's pull has faded out. 0 = unlimited. */
  gravityReach: number
  /** Ring height above the largest planet; smaller planets get lower rings. */
  orbitHeight: number
  /** Wormhole pull, as an equivalent planet area (r²). */
  wormholePull: number

  /** Speed added to the ring's orbit speed at full power. */
  launchBoost: number
  /** Drag distance before power starts. */
  powerDeadzone: number
  /** Drag distance for full power. */
  powerFullDrag: number
  /** Below this power, letting go cancels the shot. */
  minPower: number

  /** In-flight nudge acceleration at full throttle. A nudge, not an engine. */
  nudgeThrust: number
  /** Drag distance before a nudge starts thrusting. */
  nudgeDeadzone: number
  /** Drag distance for full nudge throttle. */
  nudgeFullDrag: number

  /** A ring captures a ship at or below this multiple of its orbit speed. */
  captureSpeedRatio: number
  /** Distance either side of a ring's radius that counts as on the ring. */
  captureBand: number

  /** Fraction of the into-surface speed kept after a bounce. */
  restitution: number
  /** Into-surface speed below which a collision does no damage. */
  damageThreshold: number
  /** Hull per unit of into-surface speed above the threshold, for planets. */
  planetDamageRate: number
  /** The same for side walls. */
  wallDamageRate: number
  /** Hull lost for going out of bounds. */
  obHullPenalty: number
  /** How far past the top or bottom of a course the ship may go before it is out. */
  obMargin: number
  /** Hull lost per unit of distance flown through an asteroid field. */
  asteroidDamagePerUnit: number
  /** Asteroid drag, per second (velocity × e^(−drag·dt)). */
  asteroidDrag: number
  /** Hull lost per second inside a radiation zone. */
  radiationDps: number

  /** Length of the drawn forecast, in course units. A level may override it. */
  forecastLength: number
  /** A flight that has not ended by this many seconds is adrift. */
  maxFlightSec: number
  /** Replay speed multiplier (1 = real time). */
  flightSpeed: number

  starPoints: number
  allStarsBonus: number
  hullPoints: number
  strokeCost: number
  powerCost: number
  /** Points lost per full-throttle second of nudging. */
  fuelCost: number
}

/** Tuning keys whose value is a number — the ones a slider can drive. */
export type NumericTuningKey = {
  [K in keyof Tuning]: Tuning[K] extends number ? K : never
}[keyof Tuning]

/** Shipped defaults — a starting point for play-testing (design §15). */
export const DEFAULT_TUNING: Tuning = {
  G: 700,
  massScale: 1.35,
  maxSpeed: 600,
  minDist: 22,
  shipRadius: 6,
  influenceZones: true,
  influenceInner: 0.75,
  gravityReach: 220,
  orbitHeight: 36,
  wormholePull: 900,

  launchBoost: 320,
  powerDeadzone: 18,
  powerFullDrag: 140,
  minPower: 0.03,

  nudgeThrust: 90,
  nudgeDeadzone: 12,
  nudgeFullDrag: 90,

  captureSpeedRatio: 1.3,
  captureBand: 8,

  restitution: 0.6,
  damageThreshold: 40,
  planetDamageRate: 0.1,
  wallDamageRate: 0.08,
  obHullPenalty: 5,
  obMargin: 40,
  asteroidDamagePerUnit: 0.08,
  asteroidDrag: 0.6,
  radiationDps: 12,

  forecastLength: 900,
  maxFlightSec: 15,
  flightSpeed: 1.5,

  starPoints: 100,
  allStarsBonus: 200,
  hullPoints: 1,
  strokeCost: 25,
  powerCost: 10,
  fuelCost: 20,
}

export function cloneTuning(t: Tuning = DEFAULT_TUNING): Tuning {
  return { ...t }
}

/** Planet palettes: [lit side, shadow side]. */
export const PALETTES: [string, string][] = [
  ['#ffc2ad', '#a4543f'],
  ['#a3b9ff', '#4459a8'],
  ['#a6ffd0', '#3d946d'],
  ['#e8b8ff', '#8445a3'],
  ['#ffe8a3', '#a87d2c'],
]

export const PLANET_MAX_R = 54

// ─── Edge geometry ────────────────────────────────────────────────────────────

/** Map a displacement onto the shortest one across a wrapped axis of `size`. */
export function wrapDelta(d: number, size: number): number {
  const m = ((d % size) + size) % size
  return m > size / 2 ? m - size : m
}

/** Map a coordinate back into [0, size). An in-range value is returned untouched. */
export function wrapCoord(v: number, size: number): number {
  if (v >= 0 && v < size) return v
  return ((v % size) + size) % size
}

/**
 * Displacement from (x1, y1) to (x2, y2). On a wrapping course the x part is the
 * shortest way across the side seam; y never wraps.
 */
export function displacement(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wrapX: boolean,
): { dx: number; dy: number } {
  const dx = x2 - x1
  return { dx: wrapX ? wrapDelta(dx, COURSE_W) : dx, dy: y2 - y1 }
}

// ─── Gravity ──────────────────────────────────────────────────────────────────

/** Where a fade starts, as a fraction of gravityReach. */
const REACH_FADE_START = 0.6

function smoothstep(u: number): number {
  const c = Math.min(Math.max(u, 0), 1)
  return c * c * (3 - 2 * c)
}

/**
 * One body's pull, given the displacement from the point to its center:
 *   a = G * (area * massScale) / d²
 * d² is clamped to minDist² so the result stays finite at a center. With a
 * gravityReach set, the pull fades smoothly to zero at that surface distance.
 */
export function pullFrom(dx: number, dy: number, r: number, area: number, tuning: Tuning, reach = true): Vec {
  const minSq = tuning.minDist * tuning.minDist
  const distSq = Math.max(dx * dx + dy * dy, minSq)
  const dist = Math.sqrt(distSq)
  let f = (tuning.G * (area * tuning.massScale)) / distSq
  if (reach && tuning.gravityReach > 0) {
    const R = tuning.gravityReach
    const surf = Math.hypot(dx, dy) - r
    f *= 1 - smoothstep((surf - R * REACH_FADE_START) / (R * (1 - REACH_FADE_START)))
  }
  return { ax: (f * dx) / dist, ay: (f * dy) / dist }
}

/**
 * Each planet's influence radius: the distance, toward its most competitive
 * neighbour, at which the two pull equally. A lone planet's zone is unbounded.
 */
export function influenceRadii(planets: Planet[], wrapX: boolean): number[] {
  return planets.map((p, i) => {
    let S = Infinity
    planets.forEach((o, j) => {
      if (j === i) return
      const { dx, dy } = displacement(p.x, p.y, o.x, o.y, wrapX)
      S = Math.min(S, (Math.hypot(dx, dy) * p.r) / (p.r + o.r))
    })
    return S
  })
}

/** Neighbour pull at q = distance / influence radius: 0 inside the inner zone, 1 at the edge. */
export function neighbourWeight(q: number, inner: number): number {
  if (q >= 1) return 1
  if (inner >= 1) return 0
  return smoothstep((q - inner) / (1 - inner))
}

/**
 * Summed planet acceleration at a point. `S` is the planets' influence radii
 * (computed once per course), or null with zones off.
 */
export function gravityAccelAt(
  x: number,
  y: number,
  planets: Planet[],
  S: number[] | null,
  tuning: Tuning,
  wrapX: boolean,
): Vec {
  const n = planets.length
  const dxs = new Array<number>(n)
  const dys = new Array<number>(n)
  let owner = -1
  let others = 1
  for (let i = 0; i < n; i++) {
    const d = displacement(x, y, planets[i].x, planets[i].y, wrapX)
    dxs[i] = d.dx
    dys[i] = d.dy
    if (S && n > 1) {
      const q = Math.hypot(d.dx, d.dy) / S[i]
      if (q < 1) {
        owner = i
        others = neighbourWeight(q, tuning.influenceInner)
      }
    }
  }

  let ax = 0
  let ay = 0
  for (let i = 0; i < n; i++) {
    const k = owner < 0 || i === owner ? 1 : others
    if (k === 0) continue
    const p = planets[i]
    const a = pullFrom(dxs[i], dys[i], p.r, p.baseArea, tuning)
    ax += k * a.ax
    ay += k * a.ay
  }
  return { ax, ay }
}

// ─── Orbit rings ──────────────────────────────────────────────────────────────

export interface OrbitRing {
  planetIdx: number
  x: number
  y: number
  /** Ring radius, from the planet center. */
  R: number
  /** Circular orbit speed on this ring. */
  vc: number
}

/** Clearance a ring keeps from any other planet's surface. */
export const RING_CLEARANCE = 8
/** Lowest ring height above a surface. */
export const MIN_RING_HEIGHT = 20

/** Circular orbit speed at radius R around a lone planet: v² / R = a. */
export function circularSpeed(p: Planet, R: number, tuning: Tuning): number {
  const a = pullFrom(R, 0, p.r, p.baseArea, tuning)
  return Math.sqrt(R * Math.hypot(a.ax, a.ay))
}

/** A planet's ring height: its own, or scaled by radius. */
export function ringHeightFor(p: Planet, tuning: Tuning): number {
  return p.ringHeight ?? Math.max((tuning.orbitHeight * p.r) / PLANET_MAX_R, MIN_RING_HEIGHT)
}

export type RingDropReason = 'speed' | 'influence' | 'blocked'

/**
 * Planet i's ring, or why it has none. The ring turns at the true circular
 * speed for the planet's pull; with influence zones on it must sit in the
 * planet's inner zone; and it may not pass within RING_CLEARANCE of another
 * planet (on rails the ship ignores collision).
 */
export function ringFor(
  i: number,
  planets: Planet[],
  S: number[] | null,
  tuning: Tuning,
  wrapX: boolean,
): OrbitRing | { dropped: RingDropReason } {
  const p = planets[i]
  const R = p.r + ringHeightFor(p, tuning)
  const vc = circularSpeed(p, R, tuning)
  if (!(vc > 0) || vc > tuning.maxSpeed) return { dropped: 'speed' }
  if (S && R > S[i] * tuning.influenceInner) return { dropped: 'influence' }
  const blocked = planets.some((o, j) => {
    if (j === i) return false
    const { dx, dy } = displacement(p.x, p.y, o.x, o.y, wrapX)
    return Math.hypot(dx, dy) - o.r < R + tuning.shipRadius + RING_CLEARANCE
  })
  if (blocked) return { dropped: 'blocked' }
  return { planetIdx: i, x: p.x, y: p.y, R, vc }
}

/** Position and velocity on a ring at `angle`, travelling in `dir` (+1 / −1). */
export function onRing(ring: OrbitRing, angle: number, dir: number, speed = ring.vc, wrapX = false) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  let x = ring.x + ring.R * c
  if (wrapX) x = wrapCoord(x, COURSE_W)
  return { x, y: ring.y + ring.R * s, vx: -s * speed * dir, vy: c * speed * dir }
}

/** The angle after orbiting for dt seconds. */
export function advanceAngle(angle: number, ring: OrbitRing, dir: number, dt: number): number {
  return angle + (dir * ring.vc * dt) / ring.R
}

/** Clamp a velocity to maxSpeed, preserving direction. */
export function clampSpeed(vx: number, vy: number, maxSpeed: number): [number, number] {
  const speed = Math.hypot(vx, vy)
  if (speed <= maxSpeed || speed === 0) return [vx, vy]
  return [(vx / speed) * maxSpeed, (vy / speed) * maxSpeed]
}
