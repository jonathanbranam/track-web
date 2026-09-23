// Pure, render-free game logic for Orbital Dodger. Kept separate from the Phaser
// scene so the rules can be unit-tested without a canvas.
//
// Motion is integrated here rather than by a physics engine: gravity is per-planet
// inverse-square (not the uniform field Matter/Arcade model), and touching a planet
// ends the run, so there is no collision *response* to solve for.

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
  /** Planets per layout. Read only at generation, so it applies to the next layout. */
  planetCount: number
  /** Seconds of continuous thrust available per run. */
  maxFuel: number
  /** Points per second accrued anywhere in the field. */
  scoreBase: number
  /** Additional points per second at a planet's surface, fading to 0 at scoreRange. */
  scoreBonus: number
  scoreRange: number
  /** How far ahead the gravity-only forecast path projects. 0 disables it. */
  forecastRange: number
  /** Flat bonus for collecting a star. */
  starBonus: number
}

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
  planetCount: 4,
  maxFuel: 6,
  scoreBase: 4,
  scoreBonus: 40,
  scoreRange: 220,
  forecastRange: 260,
  starBonus: 50,
}

export function cloneTuning(t: Tuning = DEFAULT_TUNING): Tuning {
  return { ...t }
}

/** Planet palettes: [lit side, shadow side]. */
const PALETTES: [string, string][] = [
  ['#ffb199', '#7a3b2e'],
  ['#8aa6ff', '#2c3a70'],
  ['#8effc1', '#2c6a4f'],
  ['#e0a3ff', '#5b2c70'],
  ['#ffe08a', '#7a5a1e'],
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

// ─── Gravity ──────────────────────────────────────────────────────────────────

/**
 * Summed inverse-square acceleration toward every planet:
 *   a = G * (r² * massScale) / d²
 * Each planet's pull scales with its area, so bigger planets pull harder at equal
 * distance. d² is clamped to minDist² so the result stays finite at a center.
 */
export function gravityAccelAt(x: number, y: number, planets: Planet[], tuning: Tuning): Vec {
  let ax = 0
  let ay = 0
  const minSq = tuning.minDist * tuning.minDist

  for (const p of planets) {
    const dx = p.x - x
    const dy = p.y - y
    const distSq = Math.max(dx * dx + dy * dy, minSq)
    const dist = Math.sqrt(distSq)
    const f = (tuning.G * (p.baseArea * tuning.massScale)) / distSq
    ax += (f * dx) / dist
    ay += (f * dy) / dist
  }

  return { ax, ay }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Points per second at a position: a base rate everywhere plus a proximity bonus
 * that peaks at a planet's surface and fades to zero at scoreRange. The ramp is
 * quadratic, so a close orbit is worth disproportionately more than a moderate
 * approach — that is what makes tight flying the scoring strategy.
 */
export function scoreRateAt(x: number, y: number, planets: Planet[], tuning: Tuning): number {
  if (planets.length === 0) return tuning.scoreBase

  let minSurf = Infinity
  for (const p of planets) {
    const d = Math.hypot(p.x - x, p.y - y) - p.r - tuning.shipRadius
    if (d < minSurf) minSurf = d
  }
  minSurf = Math.max(minSurf, 0)

  const t = Math.max(0, 1 - minSurf / Math.max(tuning.scoreRange, 1))
  return tuning.scoreBase + t * t * tuning.scoreBonus
}

// ─── Motion ───────────────────────────────────────────────────────────────────

/** Clamp a velocity to maxSpeed, preserving direction. */
function clampSpeed(vx: number, vy: number, maxSpeed: number): [number, number] {
  const speed = Math.hypot(vx, vy)
  if (speed <= maxSpeed || speed === 0) return [vx, vy]
  return [(vx / speed) * maxSpeed, (vy / speed) * maxSpeed]
}

/**
 * Advance the ship one sub-step under gravity plus optional thrust toward
 * `thrustTarget`. Thrust is ignored when `fuel <= 0`. Semi-implicit Euler:
 * velocity is updated first, then position from the new velocity.
 */
export function stepShip(
  ship: Ship,
  planets: Planet[],
  tuning: Tuning,
  thrustTarget: { x: number; y: number } | null,
  fuel: number,
  dt: number,
): Ship {
  const { ax: gax, ay: gay } = gravityAccelAt(ship.x, ship.y, planets, tuning)
  let ax = gax
  let ay = gay

  if (thrustTarget && fuel > 0) {
    const dx = thrustTarget.x - ship.x
    const dy = thrustTarget.y - ship.y
    const dist = Math.max(Math.hypot(dx, dy), 1)
    ax += (tuning.thrust * dx) / dist
    ay += (tuning.thrust * dy) / dist
  }

  const [vx, vy] = clampSpeed(ship.vx + ax * dt, ship.vy + ay * dt, tuning.maxSpeed)
  return { x: ship.x + vx * dt, y: ship.y + vy * dt, vx, vy }
}

/** How far outside the field the ship may drift before the run ends. */
export const OUT_OF_BOUNDS_MARGIN = 260

/**
 * Which loss condition, if any, currently holds. Checked every sub-step rather
 * than once per frame, so a fast ship cannot tunnel through a small planet.
 */
export function checkLoss(
  ship: Ship,
  planets: Planet[],
  tuning: Tuning,
  fuel: number,
  width = GAME_W,
  height = GAME_H,
): LossReason | null {
  for (const p of planets) {
    if (Math.hypot(p.x - ship.x, p.y - ship.y) < p.r + tuning.shipRadius) return 'crash'
  }
  const m = OUT_OF_BOUNDS_MARGIN
  if (ship.x < -m || ship.x > width + m || ship.y < -m || ship.y > height + m) return 'out-of-bounds'
  if (fuel <= 0) return 'out-of-fuel'
  return null
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

/** Integration step for the forecast projection, in seconds. */
const FORECAST_DT = 0.035
/** Hard cap on projection steps, so per-frame cost stays bounded. */
export const FORECAST_MAX_STEPS = 150

/**
 * Where gravity *alone* would carry the ship — thrust is deliberately excluded so
 * the path answers "what happens if I let go?". Terminates at the forecast range,
 * on planet intersection, on leaving the field, or at the step cap.
 */
export function projectForecast(
  ship: Ship,
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): { x: number; y: number }[] {
  const pts = [{ x: ship.x, y: ship.y }]
  if (tuning.forecastRange <= 0) return pts

  let { x, y, vx, vy } = ship
  let traveled = 0

  for (let i = 0; i < FORECAST_MAX_STEPS && traveled < tuning.forecastRange; i++) {
    const { ax, ay } = gravityAccelAt(x, y, planets, tuning)
    ;[vx, vy] = clampSpeed(vx + ax * FORECAST_DT, vy + ay * FORECAST_DT, tuning.maxSpeed)

    const nx = x + vx * FORECAST_DT
    const ny = y + vy * FORECAST_DT
    traveled += Math.hypot(nx - x, ny - y)
    x = nx
    y = ny
    pts.push({ x, y })

    if (planets.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + tuning.shipRadius)) break
    if (x < -300 || x > width + 300 || y < -300 || y > height + 300) break
  }

  return pts
}
