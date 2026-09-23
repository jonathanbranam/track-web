// Pure, render-free game logic for Orbital Dodger. Kept separate from the Phaser
// scene so the rules can be unit-tested without a canvas.
//
// Motion is integrated here rather than by a physics engine: gravity is per-planet
// inverse-square (not the uniform field Matter/Arcade model), shaped by influence
// zones and an optional reach so orbits stay stable in a crowded field.

/** Logical play field. The canvas is scaled to fit the viewport. */
export const GAME_W = 400
export const GAME_H = 720

export interface Planet {
  x: number
  y: number
  r: number
  /** r², precomputed — the planet's "area" term in the gravity law. */
  baseArea: number
  /** Gradient stops for the lit-sphere texture: [lit, shadow]. */
  color1: string
  color2: string
}

export interface Star {
  x: number
  y: number
  r: number
  collected: boolean
}

export interface Ship {
  x: number
  y: number
  vx: number
  vy: number
}

export interface Vec {
  ax: number
  ay: number
}

export type LossReason = 'crash' | 'out-of-bounds' | 'out-of-fuel'

/** A planet overlap. Not a loss by itself — shields decide whether it is fatal. */
export interface Contact {
  contact: number
}

export type ControlMode = 'relative' | 'direct'
export type EdgeMode = 'bounded' | 'wrap'

/**
 * Every tunable gameplay parameter. The dev panel mutates a live instance of this
 * and the scene re-reads it each sub-step, so edits apply mid-run.
 */
export interface Tuning {
  /** Global gravity constant. */
  G: number
  /** Extra multiplier on each planet's area term. */
  massScale: number
  /** Thrust acceleration applied toward the pointer while held. */
  thrust: number
  /** Speed ceiling; velocity is scaled back to this, preserving direction. */
  maxSpeed: number
  /** Softening floor on distance, so acceleration stays finite near a center. */
  minDist: number
  shipRadius: number
  /**
   * Sphere of influence: each planet owns the region where its pull beats its
   * nearest neighbour's. Deep inside that region the neighbours are ignored, so
   * orbits around a planet are genuinely stable. Off = every planet pulls everywhere.
   */
  influenceZones: boolean
  /** Fraction of the influence radius inside which neighbours are fully ignored;
   *  their pull fades back in over the rest of it. 1 = hard edge. */
  influenceInner: number
  /** Distance from a planet's surface beyond which its pull has faded to nothing.
   *  The fade starts at 60% of this. 0 = unlimited reach. */
  gravityReach: number
  /** Planets per layout. Read only at generation, so it applies to the next layout. */
  planetCount: number
  /** Seconds of continuous thrust available per run. */
  maxFuel: number
  /** Seconds the run continues after the tank runs dry, before ending out of fuel. */
  fuelGraceSec: number
  /** Points per second accrued anywhere in the field. */
  scoreBase: number
  /** Additional points per second at a planet's surface, fading to 0 at scoreRange. */
  scoreBonus: number
  scoreRange: number
  /** How far ahead the gravity-only forecast path projects. 0 disables it. */
  forecastRange: number
  /** Flat bonus for collecting a star. */
  starBonus: number

  /** Shield charges at the start of a run. Read at run start, so applies next run. */
  shieldCharges: number
  /** Inward normal speed above which a contact is a direct (fatal) hit. */
  lethalImpactSpeed: number
  /** Outward speed given by a glancing hit. */
  bounceOut: number
  /** Minimum along-surface speed given by a glancing hit. */
  kickTangential: number
  /** Seconds after a glancing hit during which contact is harmless. */
  shieldGraceSec: number

  /** Orbit ring height above the surface of the largest planet; smaller planets
   *  get proportionally lower rings (never below MIN_RING_HEIGHT). */
  orbitHeight: number
  /** How far from the ring's radius the ship may be and still be captured. */
  captureBand: number
  /** Max angle between the ship's heading and the ring tangent for capture. */
  captureAngleDeg: number
  /** Allowed fractional deviation from the circular orbit speed for capture. */
  captureSpeedTol: number
  /** Degrees of locked travel over which scoring fades to zero. Past this, a locked orbit earns nothing. */
  orbitScoreArcDeg: number

  controlMode: ControlMode
  /** Relative: drag distance before thrust starts. Direct: radius around the ship
   *  inside which the last thrust direction is held. */
  controlDeadzone: number
  /** Relative mode: drag distance at which thrust reaches full strength. */
  controlFullDrag: number
  edgeMode: EdgeMode
}

/** Tuning keys whose value is a number — the ones a slider can drive. */
export type NumericTuningKey = {
  [K in keyof Tuning]: Tuning[K] extends number ? K : never
}[keyof Tuning]

/**
 * Shipped defaults. Seeded from the prototype and then re-calibrated for the
 * 400x720 logical field — the prototype was tuned against a viewport-sized field
 * in CSS pixels, so its literals do not transfer directly.
 */
export const DEFAULT_TUNING: Tuning = {
  G: 700,
  massScale: 1.35,
  thrust: 165,
  maxSpeed: 240,
  minDist: 22,
  shipRadius: 6,
  influenceZones: true,
  influenceInner: 0.75,
  gravityReach: 0,
  planetCount: 4,
  maxFuel: 6,
  fuelGraceSec: 5,
  scoreBase: 4,
  scoreBonus: 40,
  scoreRange: 220,
  forecastRange: 260,
  starBonus: 50,

  shieldCharges: 3,
  lethalImpactSpeed: 120,
  bounceOut: 90,
  kickTangential: 200,
  shieldGraceSec: 0.6,

  orbitHeight: 36,
  captureBand: 14,
  captureAngleDeg: 30,
  captureSpeedTol: 0.45,
  orbitScoreArcDeg: 180,

  controlMode: 'relative',
  controlDeadzone: 18,
  controlFullDrag: 100,
  edgeMode: 'bounded',
}

export function cloneTuning(t: Tuning = DEFAULT_TUNING): Tuning {
  return { ...t }
}

/** Planet palettes: [lit side, shadow side]. */
const PALETTES: [string, string][] = [
  ['#ffc2ad', '#a4543f'],
  ['#a3b9ff', '#4459a8'],
  ['#a6ffd0', '#3d946d'],
  ['#e8b8ff', '#8445a3'],
  ['#ffe8a3', '#a87d2c'],
]

/** Injectable randomness so layout generation is deterministic under test. */
export type Rng = () => number

function rand(rng: Rng, a: number, b: number): number {
  return a + rng() * (b - a)
}

// ─── Layout generation ────────────────────────────────────────────────────────

/** Preferred gap between two planets' surfaces, so there is always a way through. */
export const PLANET_CLEARANCE = 110
/**
 * Hard floor on that gap. The preferred clearance is relaxed toward this as
 * attempts fail, but a layout never goes below it — overlapping planets are not a
 * valid layout, they are a broken one.
 */
export const MIN_PLANET_CLEARANCE = 14
/**
 * No planet may come within this of the ship's start point. Never relaxed.
 * Calibrated for the 400x720 field: at 110 the worst case (a max-radius planet
 * at exactly this distance) captured the ship in 1.5s, which is not enough time
 * to read the forecast line before committing. 150 gives ~2.1s.
 */
export const START_CLEARANCE = 150
/** Placement attempts per planet before the planet is skipped. */
const PLACE_ATTEMPTS = 200

export const PLANET_MIN_R = 24
export const PLANET_MAX_R = 54

/**
 * Place up to `tuning.planetCount` planets that never overlap each other and never
 * encroach on the ship's start point at the field center.
 *
 * Placement is bounded, and it does NOT fall back to accepting a bad candidate: an
 * overlapping planet or one sitting on the spawn point is an unplayable layout, not
 * a degraded one. Instead the required gap is relaxed from PLANET_CLEARANCE toward
 * MIN_PLANET_CLEARANCE as attempts fail, and a planet that still cannot be placed is
 * skipped — a crowded field yields fewer planets, never a broken one. Candidate radii
 * also shrink as attempts fail, so a tight field fills with smaller planets.
 */
export function generatePlanets(
  width: number,
  height: number,
  tuning: Tuning,
  rng: Rng = Math.random,
): Planet[] {
  const planets: Planet[] = []
  const cx = width / 2
  const cy = height / 2

  for (let i = 0; i < tuning.planetCount; i++) {
    const [color1, color2] = PALETTES[i % PALETTES.length]

    for (let tries = 0; tries < PLACE_ATTEMPTS; tries++) {
      // Relax toward the floor over the attempt budget, and bias radius smaller.
      const t = tries / PLACE_ATTEMPTS
      const gap = PLANET_CLEARANCE + (MIN_PLANET_CLEARANCE - PLANET_CLEARANCE) * t
      const maxR = PLANET_MAX_R + (PLANET_MIN_R - PLANET_MAX_R) * t

      const r = rand(rng, PLANET_MIN_R, Math.max(PLANET_MIN_R, maxR))
      const x = rand(rng, width * 0.15, width * 0.85)
      const y = rand(rng, height * 0.15, height * 0.85)

      const clearOfOthers = planets.every(
        (o) => Math.hypot(o.x - x, o.y - y) > o.r + r + gap,
      )
      const clearOfStart = Math.hypot(x - cx, y - cy) >= START_CLEARANCE + r

      if (clearOfOthers && clearOfStart) {
        planets.push({ x, y, r, baseArea: r * r, color1, color2 })
        break
      }
    }
  }

  return planets
}

/** Clearance a star keeps from any planet surface, so it is always reachable. */
export const STAR_CLEARANCE = 40
export const STAR_R = 5
const STAR_ATTEMPTS = 40

/** Place a single star clear of every planet. Bounded retries, last candidate wins. */
export function spawnStar(
  width: number,
  height: number,
  planets: Planet[],
  rng: Rng = Math.random,
): Star {
  let candidate: Star = { x: width / 2, y: height / 2, r: STAR_R, collected: false }

  for (let tries = 0; tries < STAR_ATTEMPTS; tries++) {
    candidate = {
      x: rand(rng, width * 0.08, width * 0.92),
      y: rand(rng, height * 0.08, height * 0.92),
      r: STAR_R,
      collected: false,
    }
    const clear = planets.every(
      (p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) > p.r + STAR_CLEARANCE,
    )
    if (clear) return candidate
  }

  return candidate
}

export const STARS_PER_SET = 6

export function spawnStarSet(
  width: number,
  height: number,
  planets: Planet[],
  rng: Rng = Math.random,
): Star[] {
  return Array.from({ length: STARS_PER_SET }, () => spawnStar(width, height, planets, rng))
}

// ─── Edge geometry ────────────────────────────────────────────────────────────

/** Map a displacement onto the shortest one across a wrapped axis of `size`. */
export function wrapDelta(d: number, size: number): number {
  const m = ((d % size) + size) % size
  return m > size / 2 ? m - size : m
}

/** Map a coordinate back into [0, size). */
export function wrapCoord(v: number, size: number): number {
  return ((v % size) + size) % size
}

/**
 * Displacement from (x1, y1) to (x2, y2). In wrap mode this is the minimum image:
 * the shortest vector across the torus, so every distance-based rule (gravity,
 * contact, scoring, capture) is continuous across the seam.
 */
export function displacement(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): { dx: number; dy: number } {
  const dx = x2 - x1
  const dy = y2 - y1
  if (tuning.edgeMode !== 'wrap') return { dx, dy }
  return { dx: wrapDelta(dx, width), dy: wrapDelta(dy, height) }
}

// ─── Gravity ──────────────────────────────────────────────────────────────────

/** Where a fade starts, as a fraction of gravityReach. */
const REACH_FADE_START = 0.6

function smoothstep(u: number): number {
  const c = Math.min(Math.max(u, 0), 1)
  return c * c * (3 - 2 * c)
}

/**
 * One planet's pull, given the displacement from the point to its center:
 *   a = G * (r² * massScale) / d²
 * Each planet's pull scales with its area, so bigger planets pull harder at equal
 * distance. d² is clamped to minDist² so the result stays finite at a center.
 * With a gravityReach set, the pull fades smoothly to zero at that surface distance.
 */
function pullFrom(dx: number, dy: number, p: Planet, tuning: Tuning): Vec {
  const minSq = tuning.minDist * tuning.minDist
  const distSq = Math.max(dx * dx + dy * dy, minSq)
  const dist = Math.sqrt(distSq)
  let f = (tuning.G * (p.baseArea * tuning.massScale)) / distSq
  if (tuning.gravityReach > 0) {
    const reach = tuning.gravityReach
    const surf = Math.hypot(dx, dy) - p.r
    f *= 1 - smoothstep((surf - reach * REACH_FADE_START) / (reach * (1 - REACH_FADE_START)))
  }
  return { ax: (f * dx) / dist, ay: (f * dy) / dist }
}

/**
 * Each planet's influence radius: the distance, toward its most competitive
 * neighbour, at which the two pull equally. Pull goes as r²/d², so that point
 * splits the center distance in the ratio of the radii. Two planets' zones can
 * touch but never overlap. A lone planet's zone is unbounded.
 */
export function influenceRadii(
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): number[] {
  return planets.map((p, i) => {
    let S = Infinity
    planets.forEach((o, j) => {
      if (j === i) return
      const { dx, dy } = displacement(p.x, p.y, o.x, o.y, tuning, width, height)
      S = Math.min(S, (Math.hypot(dx, dy) * p.r) / (p.r + o.r))
    })
    return S
  })
}

/**
 * How much neighbours pull at `q` = distance / influence radius: 0 inside the
 * inner zone, easing to 1 at the zone's edge, so the field has no seam.
 */
export function neighbourWeight(q: number, inner: number): number {
  if (q >= 1) return 1
  if (inner >= 1) return 0
  return smoothstep((q - inner) / (1 - inner))
}

/**
 * Summed acceleration toward every planet. With influenceZones on, a point
 * inside a planet's zone feels that planet at full strength and its neighbours
 * scaled by neighbourWeight — which is what lets an orbit survive a crowded field.
 */
export function gravityAccelAt(
  x: number,
  y: number,
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): Vec {
  const disp = planets.map((p) => displacement(x, y, p.x, p.y, tuning, width, height))

  let owner = -1
  let others = 1
  if (tuning.influenceZones && planets.length > 1) {
    const S = influenceRadii(planets, tuning, width, height)
    disp.forEach(({ dx, dy }, i) => {
      const q = Math.hypot(dx, dy) / S[i]
      if (q < 1) {
        owner = i
        others = neighbourWeight(q, tuning.influenceInner)
      }
    })
  }

  let ax = 0
  let ay = 0
  planets.forEach((p, i) => {
    const k = owner < 0 || i === owner ? 1 : others
    if (k === 0) return
    const a = pullFrom(disp[i].dx, disp[i].dy, p, tuning)
    ax += k * a.ax
    ay += k * a.ay
  })

  return { ax, ay }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Points per second at a position: a base rate everywhere plus a proximity bonus
 * that peaks at a planet's surface and fades to zero at scoreRange. The ramp is
 * quadratic, so a close orbit is worth disproportionately more than a moderate
 * approach — that is what makes tight flying the scoring strategy.
 */
export function scoreRateAt(
  x: number,
  y: number,
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): number {
  if (planets.length === 0) return tuning.scoreBase

  let minSurf = Infinity
  for (const p of planets) {
    const { dx, dy } = displacement(x, y, p.x, p.y, tuning, width, height)
    const d = Math.hypot(dx, dy) - p.r - tuning.shipRadius
    if (d < minSurf) minSurf = d
  }
  minSurf = Math.max(minSurf, 0)

  const t = Math.max(0, 1 - minSurf / Math.max(tuning.scoreRange, 1))
  return tuning.scoreBase + t * t * tuning.scoreBonus
}

/**
 * Multiplier on the whole score rate after travelling `arcRad` radians in a locked
 * orbit: 1 at capture, falling linearly to 0 at maxArcDeg and staying there. A
 * locked orbit is free and never ends, so without this it would farm points forever.
 */
export function orbitScoreFactor(arcRad: number, maxArcDeg: number): number {
  if (maxArcDeg <= 0) return 0
  return Math.max(0, 1 - (arcRad * 180) / Math.PI / maxArcDeg)
}

// ─── Control ──────────────────────────────────────────────────────────────────

export interface Dir {
  x: number
  y: number
}

/**
 * Thrust vector for the current press — direction scaled by throttle (0..1] — or
 * null for "no thrust".
 *
 * - relative: along the drag vector from where the press began. Inside the
 *   deadzone there is no thrust, so a tap (e.g. to break orbit) burns no fuel.
 *   Past it, throttle ramps quadratically to full at `fullDrag`, so a small drag
 *   is a gentle nudge rather than full burn. Where the ship is on screen does not
 *   matter, so the edges never block a direction.
 * - direct: toward the pointer from the ship. With the finger over the ship the
 *   raw direction flails on tiny offsets, so inside the deadzone the last
 *   direction is held instead. Always full throttle.
 */
export function thrustDirection(
  mode: ControlMode,
  ship: { x: number; y: number },
  pressOrigin: { x: number; y: number } | null,
  pointer: { x: number; y: number } | null,
  lastDir: Dir | null,
  deadzone: number,
  fullDrag = deadzone,
): Dir | null {
  if (!pointer) return null

  if (mode === 'relative') {
    if (!pressOrigin) return null
    const dx = pointer.x - pressOrigin.x
    const dy = pointer.y - pressOrigin.y
    const d = Math.hypot(dx, dy)
    if (d < deadzone || d === 0) return null
    const span = fullDrag - deadzone
    const t = span > 0 ? Math.min((d - deadzone) / span, 1) : 1
    // Never exactly zero past the deadzone, so the guide and fuel agree thrust is on.
    const throttle = Math.max(t * t, 0.02)
    return { x: (dx / d) * throttle, y: (dy / d) * throttle }
  }

  const dx = pointer.x - ship.x
  const dy = pointer.y - ship.y
  const d = Math.hypot(dx, dy)
  if (d < deadzone || d === 0) return lastDir
  return { x: dx / d, y: dy / d }
}

// ─── Motion ───────────────────────────────────────────────────────────────────

/** Clamp a velocity to maxSpeed, preserving direction. */
function clampSpeed(vx: number, vy: number, maxSpeed: number): [number, number] {
  const speed = Math.hypot(vx, vy)
  if (speed <= maxSpeed || speed === 0) return [vx, vy]
  return [(vx / speed) * maxSpeed, (vy / speed) * maxSpeed]
}

/**
 * Advance the ship one sub-step under gravity plus optional thrust along
 * `thrustDir`, whose length is the throttle (1 = full thrust). Thrust is ignored when `fuel <= 0`. Semi-implicit Euler:
 * velocity is updated first, then position from the new velocity. In wrap mode
 * the position is folded back into the field.
 */
export function stepShip(
  ship: Ship,
  planets: Planet[],
  tuning: Tuning,
  thrustDir: Dir | null,
  fuel: number,
  dt: number,
  width = GAME_W,
  height = GAME_H,
): Ship {
  const { ax: gax, ay: gay } = gravityAccelAt(ship.x, ship.y, planets, tuning, width, height)
  let ax = gax
  let ay = gay

  if (thrustDir && fuel > 0) {
    ax += tuning.thrust * thrustDir.x
    ay += tuning.thrust * thrustDir.y
  }

  const [vx, vy] = clampSpeed(ship.vx + ax * dt, ship.vy + ay * dt, tuning.maxSpeed)
  let x = ship.x + vx * dt
  let y = ship.y + vy * dt
  if (tuning.edgeMode === 'wrap') {
    x = wrapCoord(x, width)
    y = wrapCoord(y, height)
  }
  return { x, y, vx, vy }
}

/** How far outside the field the ship may drift before the run ends. */
export const OUT_OF_BOUNDS_MARGIN = 260

/** Index of the first planet the ship overlaps, or -1. */
export function findContact(
  ship: { x: number; y: number },
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): number {
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i]
    const { dx, dy } = displacement(ship.x, ship.y, p.x, p.y, tuning, width, height)
    if (Math.hypot(dx, dy) < p.r + tuning.shipRadius) return i
  }
  return -1
}

/**
 * Which loss condition, if any, currently holds — or a planet contact, which the
 * caller resolves against shields. Checked every sub-step rather than once per
 * frame, so a fast ship cannot tunnel through a small planet. Contact outranks
 * the other reasons, so touching a planet on the last drop of fuel is a crash.
 *
 * An empty tank is not immediately fatal: the run ends out of fuel only once
 * `emptySec` (time since the tank ran dry) reaches fuelGraceSec.
 */
export function checkLoss(
  ship: Ship,
  planets: Planet[],
  tuning: Tuning,
  fuel: number,
  emptySec = 0,
  width = GAME_W,
  height = GAME_H,
): LossReason | Contact | null {
  const hit = findContact(ship, planets, tuning, width, height)
  if (hit >= 0) return { contact: hit }
  if (tuning.edgeMode !== 'wrap') {
    const m = OUT_OF_BOUNDS_MARGIN
    if (ship.x < -m || ship.x > width + m || ship.y < -m || ship.y > height + m) return 'out-of-bounds'
  }
  if (fuel <= 0 && emptySec >= tuning.fuelGraceSec) return 'out-of-fuel'
  return null
}

// ─── Shields ──────────────────────────────────────────────────────────────────

/** Outward unit normal from the planet's center to the ship. */
function surfaceNormal(ship: Ship, p: Planet, tuning: Tuning, width: number, height: number): Dir {
  const { dx, dy } = displacement(p.x, p.y, ship.x, ship.y, tuning, width, height)
  const d = Math.hypot(dx, dy)
  if (d === 0) return { x: 0, y: -1 }
  return { x: dx / d, y: dy / d }
}

/**
 * A contact is glancing when the ship's speed *into* the surface is at or below
 * lethalImpactSpeed. Total speed is deliberately not used: a fast skim along the
 * surface is exactly the near-miss that should be forgiven.
 */
export function classifyImpact(
  ship: Ship,
  p: Planet,
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): 'glancing' | 'direct' {
  const n = surfaceNormal(ship, p, tuning, width, height)
  const inward = -(ship.vx * n.x + ship.vy * n.y)
  return inward > tuning.lethalImpactSpeed ? 'direct' : 'glancing'
}

/**
 * Knock the ship off a planet after a survived contact: back onto the surface,
 * inward velocity removed, then an outward push plus at least kickTangential along
 * the surface in the direction it was already sliding.
 */
export function resolveGlancingImpact(
  ship: Ship,
  p: Planet,
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): Ship {
  const n = surfaceNormal(ship, p, tuning, width, height)
  const vn = ship.vx * n.x + ship.vy * n.y
  const tx = ship.vx - vn * n.x
  const ty = ship.vy - vn * n.y
  const tLen = Math.hypot(tx, ty)
  // Dead-on with no slide: pick a side rather than bouncing straight back in.
  const tHat = tLen > 1e-6 ? { x: tx / tLen, y: ty / tLen } : { x: -n.y, y: n.x }
  const along = Math.max(tLen, tuning.kickTangential)

  const [vx, vy] = clampSpeed(
    n.x * tuning.bounceOut + tHat.x * along,
    n.y * tuning.bounceOut + tHat.y * along,
    tuning.maxSpeed,
  )

  const rest = p.r + tuning.shipRadius + 0.5
  let x = p.x + n.x * rest
  let y = p.y + n.y * rest
  if (tuning.edgeMode === 'wrap') {
    x = wrapCoord(x, width)
    y = wrapCoord(y, height)
  }
  return { x, y, vx, vy }
}

// ─── Orbit capture ────────────────────────────────────────────────────────────

export interface OrbitRing {
  planetIdx: number
  x: number
  y: number
  /** Ring radius, from the planet center. */
  R: number
  /** True circular orbit speed on this ring (always below maxSpeed). */
  vc: number
}

/** Clearance a ring keeps from any other planet's surface. */
export const RING_CLEARANCE = 8
/** Lowest ring height above a surface, so the capture band never reaches it. */
export const MIN_RING_HEIGHT = 20
/** Largest amount a ring may be raised to bring its orbit speed under the cap. */
const RING_RAISE_LIMIT = 200

/** Circular orbit speed at radius R around a lone planet: v² / R = a. */
function circularSpeed(p: Planet, R: number, tuning: Tuning): number {
  const a = pullFrom(R, 0, p, tuning)
  return Math.sqrt(R * Math.hypot(a.ax, a.ay))
}

/**
 * One capture ring per planet, sized so its circular orbit is a real one:
 *
 * - Height scales with the planet (orbitHeight is the largest planet's), so
 *   small planets get lower rings; their lower mass then makes them slower.
 * - The speed is the true circular speed for the planet's pull at that radius,
 *   so a released ship keeps orbiting. If that exceeds the speed cap, the ring
 *   is raised until it does not, rather than orbiting at a speed physics won't hold.
 * - With influence zones on, a ring must sit in the planet's inner zone, where
 *   neighbours do not pull; one that cannot fit there is dropped.
 * - A ring that would pass within RING_CLEARANCE of another planet is dropped —
 *   on rails the ship ignores collision, so a ring through a planet would fly
 *   the ship through it.
 */
export function orbitRings(
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): OrbitRing[] {
  const rings: OrbitRing[] = []
  const S = tuning.influenceZones ? influenceRadii(planets, tuning, width, height) : null
  const cap = tuning.maxSpeed * 0.95

  planets.forEach((p, i) => {
    const h = Math.max((tuning.orbitHeight * p.r) / PLANET_MAX_R, MIN_RING_HEIGHT)
    let R = p.r + h
    let vc = circularSpeed(p, R, tuning)
    for (let raise = 0; vc > cap && raise < RING_RAISE_LIMIT; raise++) {
      R += 1
      vc = circularSpeed(p, R, tuning)
    }
    if (vc > cap || !(vc > 0)) return
    if (S && R > S[i] * tuning.influenceInner) return

    const blocked = planets.some((o, j) => {
      if (j === i) return false
      const { dx, dy } = displacement(p.x, p.y, o.x, o.y, tuning, width, height)
      return Math.hypot(dx, dy) - o.r < R + tuning.shipRadius + RING_CLEARANCE
    })
    if (blocked) return
    rings.push({ planetIdx: i, x: p.x, y: p.y, R, vc })
  })
  return rings
}

export interface OrbitLock {
  planetIdx: number
  /** Current angle around the planet, radians. */
  angle: number
  /** +1 or -1: direction of travel around the ring. */
  dir: number
}

/** Signed distance of the ship from a ring's radius. */
export function ringOffset(
  ship: { x: number; y: number },
  ring: OrbitRing,
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): number {
  const { dx, dy } = displacement(ring.x, ring.y, ship.x, ship.y, tuning, width, height)
  return Math.hypot(dx, dy) - ring.R
}

/**
 * The first ring that captures a coasting ship: within captureBand of the radius,
 * heading within captureAngleDeg of the tangent, and at a speed within
 * captureSpeedTol of the ring's circular speed. `blockedPlanet` is the ring the
 * ship was just released from, which may not recapture until it has left its band.
 */
export function tryCapture(
  ship: Ship,
  rings: OrbitRing[],
  tuning: Tuning,
  blockedPlanet: number | null = null,
  width = GAME_W,
  height = GAME_H,
): OrbitLock | null {
  const speed = Math.hypot(ship.vx, ship.vy)
  if (speed === 0) return null
  const maxRadial = Math.sin((tuning.captureAngleDeg * Math.PI) / 180)

  for (const ring of rings) {
    if (ring.planetIdx === blockedPlanet) continue
    const { dx, dy } = displacement(ring.x, ring.y, ship.x, ship.y, tuning, width, height)
    const d = Math.hypot(dx, dy)
    if (d === 0 || Math.abs(d - ring.R) > tuning.captureBand) continue

    const nx = dx / d
    const ny = dy / d
    const radial = ship.vx * nx + ship.vy * ny
    if (Math.abs(radial) / speed > maxRadial) continue

    const ratio = speed / ring.vc
    if (ratio < 1 - tuning.captureSpeedTol || ratio > 1 + tuning.captureSpeedTol) continue

    // Tangent (-ny, nx) is the +1 direction; the sign of v along it picks the way round.
    const along = -ship.vx * ny + ship.vy * nx
    return { planetIdx: ring.planetIdx, angle: Math.atan2(dy, dx), dir: along >= 0 ? 1 : -1 }
  }
  return null
}

/**
 * Advance a locked orbit by dt and return the new lock and the ship on the rail.
 * Kinematic: no gravity, no collision, no fuel — the point is that it is stable.
 */
export function advanceOrbit(
  lock: OrbitLock,
  ring: OrbitRing,
  tuning: Tuning,
  dt: number,
  width = GAME_W,
  height = GAME_H,
): { lock: OrbitLock; ship: Ship } {
  const angle = lock.angle + (lock.dir * ring.vc * dt) / ring.R
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  let x = ring.x + ring.R * c
  let y = ring.y + ring.R * s
  if (tuning.edgeMode === 'wrap') {
    x = wrapCoord(x, width)
    y = wrapCoord(y, height)
  }
  return {
    lock: { ...lock, angle },
    ship: { x, y, vx: -s * ring.vc * lock.dir, vy: c * ring.vc * lock.dir },
  }
}

// ─── Off-screen indicator ─────────────────────────────────────────────────────

export interface OffscreenIndicator {
  /** Anchor inside the field, on the edge nearest the ship. */
  x: number
  y: number
  /** Direction from the anchor to the ship, radians. */
  angle: number
  /** How far past the edge the ship is. */
  overshoot: number
  /** overshoot / OUT_OF_BOUNDS_MARGIN, clamped to [0, 1] — 1 is the point of no return. */
  danger: number
}

/** Where to draw the "your ship is over there" marker, or null while it is on screen. */
export function offscreenIndicator(
  ship: { x: number; y: number },
  inset = 14,
  width = GAME_W,
  height = GAME_H,
): OffscreenIndicator | null {
  const overshoot = Math.max(-ship.x, ship.x - width, -ship.y, ship.y - height, 0)
  if (overshoot === 0) return null
  const x = Math.min(Math.max(ship.x, inset), width - inset)
  const y = Math.min(Math.max(ship.y, inset), height - inset)
  return {
    x,
    y,
    angle: Math.atan2(ship.y - y, ship.x - x),
    overshoot,
    danger: Math.min(overshoot / OUT_OF_BOUNDS_MARGIN, 1),
  }
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

/** Integration step for the forecast projection, in seconds. */
const FORECAST_DT = 0.035
/** Hard cap on projection steps, so per-frame cost stays bounded. */
export const FORECAST_MAX_STEPS = 150

/** A forecast point. `brk` marks a point that must not be joined to the one before (a wrap seam). */
export interface ForecastPt {
  x: number
  y: number
  brk?: true
}

/**
 * Where gravity *alone* would carry the ship — thrust is deliberately excluded so
 * the path answers "what happens if I let go?". Terminates at the forecast range,
 * on planet intersection, on leaving the field (bounded mode), or at the step cap.
 * In wrap mode the path continues across edges, flagging each seam crossing.
 */
export function projectForecast(
  ship: Ship,
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): ForecastPt[] {
  const pts: ForecastPt[] = [{ x: ship.x, y: ship.y }]
  if (tuning.forecastRange <= 0) return pts

  const wrap = tuning.edgeMode === 'wrap'
  let { x, y, vx, vy } = ship
  let traveled = 0

  for (let i = 0; i < FORECAST_MAX_STEPS && traveled < tuning.forecastRange; i++) {
    const { ax, ay } = gravityAccelAt(x, y, planets, tuning, width, height)
    ;[vx, vy] = clampSpeed(vx + ax * FORECAST_DT, vy + ay * FORECAST_DT, tuning.maxSpeed)

    let nx = x + vx * FORECAST_DT
    let ny = y + vy * FORECAST_DT
    traveled += Math.hypot(nx - x, ny - y)

    let brk = false
    if (wrap) {
      const wx = wrapCoord(nx, width)
      const wy = wrapCoord(ny, height)
      brk = wx !== nx || wy !== ny
      nx = wx
      ny = wy
    }
    x = nx
    y = ny
    pts.push(brk ? { x, y, brk: true } : { x, y })

    if (findContact({ x, y }, planets, tuning, width, height) >= 0) break
    if (!wrap && (x < -300 || x > width + 300 || y < -300 || y > height + 300)) break
  }

  return pts
}
