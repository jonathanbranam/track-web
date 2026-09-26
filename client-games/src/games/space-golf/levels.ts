import {
  COURSE_W,
  PALETTES,
  influenceRadii,
  ringFor,
  type OrbitRing,
  type Planet,
  type Tuning,
} from './physics'

/**
 * Level documents and the runtime course built from one. Levels ship as client
 * data (levelData.ts); validateLevel keeps them honest under test.
 */

export type SideMode = 'bounce' | 'wrap'

export interface LevelPlanet {
  x: number
  y: number
  r: number
  /** Index into PALETTES. */
  color: number
  ringHeight?: number
}

/** A rectangle with a steady push, in course units per second². */
export interface WindPiece {
  kind: 'wind'
  x: number
  y: number
  w: number
  h: number
  ax: number
  ay: number
}

/** A rectangle that drags and chips the hull per unit of distance flown. */
export interface AsteroidPiece {
  kind: 'asteroids'
  x: number
  y: number
  w: number
  h: number
}

/** A circle that damages the hull per second spent inside. */
export interface RadiationPiece {
  kind: 'radiation'
  x: number
  y: number
  r: number
}

export type Piece = WindPiece | AsteroidPiece | RadiationPiece

export interface Level {
  id: string
  name: string
  /** One-line hint shown in the picker. */
  blurb: string
  height: number
  sides: SideMode
  /** `planet` indexes `planets`; `dir` +1 / −1 is the way round. */
  tee: { planet: number; angleDeg: number; dir: 1 | -1 }
  planets: LevelPlanet[]
  stars: { x: number; y: number }[]
  wormhole: { x: number; y: number; r: number }
  pieces: Piece[]
  /** Overrides the tuning's forecast length on this level. */
  forecastLength?: number
}

export const LEVEL_HEIGHT_MIN = 720
export const LEVEL_HEIGHT_MAX = 4000
/** Star hit radius (the ship's radius is added on top). */
export const STAR_R = 8

// ─── Runtime course ───────────────────────────────────────────────────────────

/** Everything a shot needs, derived once per level and tuning. */
export interface Course {
  level: Level
  height: number
  wrapX: boolean
  planets: Planet[]
  /** Influence radii, or null with zones off. */
  S: number[] | null
  /** Per planet: its ring, or null if it has none. */
  rings: (OrbitRing | null)[]
  stars: { x: number; y: number }[]
  wormhole: { x: number; y: number; r: number }
  pieces: Piece[]
}

export function toRuntimePlanets(level: Level): Planet[] {
  return level.planets.map((p) => {
    const [color1, color2] = PALETTES[p.color % PALETTES.length]
    return { x: p.x, y: p.y, r: p.r, baseArea: p.r * p.r, color1, color2, ringHeight: p.ringHeight }
  })
}

export function buildCourse(level: Level, tuning: Tuning): Course {
  const wrapX = level.sides === 'wrap'
  const planets = toRuntimePlanets(level)
  const S = tuning.influenceZones ? influenceRadii(planets, wrapX) : null
  const rings = planets.map((_, i) => {
    const r = ringFor(i, planets, S, tuning, wrapX)
    return 'dropped' in r ? null : r
  })
  return {
    level,
    height: level.height,
    wrapX,
    planets,
    S,
    rings,
    stars: level.stars,
    wormhole: level.wormhole,
    pieces: level.pieces,
  }
}

export function forecastLengthFor(level: Level, tuning: Tuning): number {
  return level.forecastLength ?? tuning.forecastLength
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Every problem with a level under the given tuning; empty when it is well-formed. */
export function validateLevel(level: Level, tuning: Tuning): string[] {
  const errs: string[] = []
  if (!level.id) errs.push('missing id')
  if (!(level.height >= LEVEL_HEIGHT_MIN && level.height <= LEVEL_HEIGHT_MAX)) {
    errs.push(`height ${level.height} outside ${LEVEL_HEIGHT_MIN}–${LEVEL_HEIGHT_MAX}`)
  }
  const inCourse = (x: number, y: number) => x >= 0 && x <= COURSE_W && y >= 0 && y <= level.height

  level.planets.forEach((p, i) => {
    if (!inCourse(p.x, p.y)) errs.push(`planet ${i} outside the course`)
  })
  for (let i = 0; i < level.planets.length; i++) {
    for (let j = i + 1; j < level.planets.length; j++) {
      const a = level.planets[i]
      const b = level.planets[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) errs.push(`planets ${i} and ${j} overlap`)
    }
  }
  level.stars.forEach((s, i) => {
    if (!inCourse(s.x, s.y)) errs.push(`star ${i} outside the course`)
    level.planets.forEach((p, j) => {
      if (Math.hypot(s.x - p.x, s.y - p.y) < p.r + STAR_R) errs.push(`star ${i} inside planet ${j}`)
    })
  })

  const w = level.wormhole
  if (!inCourse(w.x, w.y)) errs.push('wormhole outside the course')
  level.planets.forEach((p, j) => {
    if (Math.hypot(w.x - p.x, w.y - p.y) < p.r + w.r) errs.push(`wormhole overlaps planet ${j}`)
  })

  const course = buildCourse(level, tuning)
  const tee = level.tee
  if (!level.planets[tee.planet]) errs.push('tee planet does not exist')
  course.rings.forEach((r, i) => {
    if (!r) errs.push(`planet ${i} has no ring`)
  })
  return errs
}
