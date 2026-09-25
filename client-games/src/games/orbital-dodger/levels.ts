import {
  GAME_W,
  GAME_H,
  PALETTES,
  START_CLEARANCE,
  STAR_R,
  advanceOrbit,
  circularSpeed,
  generatePlanets,
  ringFor,
  ringHeightFor,
  spawnStarSet,
  wrapCoord,
  type OrbitLock,
  type OrbitRing,
  type Planet,
  type Rng,
  type RingDropReason,
  type Ship,
  type Star,
  type Tuning,
} from './physics'

/**
 * Saved levels: the stored layout document, conversion to and from the scene's
 * runtime planets and stars, the editor's id-keyed draft, validation that
 * mirrors the server, the start state of a run, and per-browser memory of the
 * last level played.
 */

// ─── Stored shape (v1) ────────────────────────────────────────────────────────

export type LevelStart =
  | { kind: 'point'; x: number; y: number }
  /** `planet` indexes `planets`; `dir` +1 / -1 matches OrbitLock.dir. */
  | { kind: 'orbit'; planet: number; angleDeg: number; dir: 1 | -1 }

export interface LevelPlanet {
  x: number
  y: number
  r: number
  /** Index into PALETTES. */
  color: number
  ringHeight?: number
}

export interface LevelLayout {
  v: 1
  start: LevelStart
  planets: LevelPlanet[]
  stars: { x: number; y: number }[]
}

/** A level as the server returns it. */
export interface OrbitalLevel {
  id: number
  name: string
  layout: LevelLayout
  updatedAt: string
}

/**
 * Mirrors LEVEL_LIMITS in src/routes/orbitalLevels.ts — keep in sync. Both
 * sides' tests pin the values.
 */
export const LEVEL_LIMITS = {
  width: 400,
  height: 720,
  minRadius: 12,
  maxRadius: 90,
  minRingHeight: 20,
  maxRingHeight: 200,
  minStars: 1,
  maxStars: 30,
  maxPlanets: 12,
  maxBytes: 16 * 1024,
} as const

// ─── Runtime conversion ───────────────────────────────────────────────────────

export function toRuntimePlanets(layout: LevelLayout): Planet[] {
  return layout.planets.map((p) => {
    const [color1, color2] = PALETTES[p.color] ?? PALETTES[0]
    const planet: Planet = { x: p.x, y: p.y, r: p.r, baseArea: p.r * p.r, color1, color2 }
    if (p.ringHeight !== undefined) planet.ringHeight = p.ringHeight
    return planet
  })
}

export function toRuntimeStars(layout: LevelLayout): Star[] {
  return layout.stars.map((s) => ({ x: s.x, y: s.y, r: STAR_R, collected: false }))
}

/** The palette index a runtime planet was drawn from (0 when unknown). */
function paletteIndex(p: Planet): number {
  const i = PALETTES.findIndex(([c1, c2]) => c1 === p.color1 && c2 === p.color2)
  return i < 0 ? 0 : i
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * A layout from runtime geometry. Collected stars are kept (a saved level
 * holds every star), and values are rounded to a tenth so they stay small.
 */
export function layoutFromRuntime(planets: Planet[], stars: Star[], start: LevelStart): LevelLayout {
  return {
    v: 1,
    start,
    planets: planets.map((p) => {
      const out: LevelPlanet = { x: round1(p.x), y: round1(p.y), r: round1(p.r), color: paletteIndex(p) }
      if (p.ringHeight !== undefined) out.ringHeight = p.ringHeight
      return out
    }),
    stars: stars.map((s) => ({ x: round1(s.x), y: round1(s.y) })),
  }
}

export const centerStart = (width = GAME_W, height = GAME_H): Extract<LevelStart, { kind: 'point' }> => ({
  kind: 'point',
  x: width / 2,
  y: height / 2,
})

/** A freshly generated layout with a center start: the seed for Create new. */
export function generatedLayout(tuning: Tuning, rng: Rng = Math.random, width = GAME_W, height = GAME_H): LevelLayout {
  const planets = generatePlanets(width, height, tuning, rng)
  const stars = spawnStarSet(width, height, planets, rng)
  return layoutFromRuntime(planets, stars, centerStart(width, height))
}

// ─── Editor draft ─────────────────────────────────────────────────────────────
// The editor keys planets and stars by stable ids so that deleting or
// reordering never misdirects the orbit start's planet reference. The order of
// the arrays is the layout order, so a scene index maps straight to a draft item.

export interface DraftPlanet extends LevelPlanet {
  id: number
}

export interface DraftStar {
  id: number
  x: number
  y: number
}

export type DraftStart =
  | { kind: 'point'; x: number; y: number }
  | { kind: 'orbit'; planetId: number; angleDeg: number; dir: 1 | -1 }

export interface LevelDraft {
  start: DraftStart
  planets: DraftPlanet[]
  stars: DraftStar[]
  /** Next free id, shared by planets and stars. */
  nextId: number
}

export function layoutToDraft(layout: LevelLayout): LevelDraft {
  let nextId = 1
  const planets = layout.planets.map((p) => ({ ...p, id: nextId++ }))
  const stars = layout.stars.map((s) => ({ ...s, id: nextId++ }))
  const s = layout.start
  const start: DraftStart =
    s.kind === 'orbit' && planets[s.planet]
      ? { kind: 'orbit', planetId: planets[s.planet].id, angleDeg: s.angleDeg, dir: s.dir }
      : s.kind === 'orbit'
        ? centerStart()
        : { ...s }
  return { start, planets, stars, nextId }
}

export function draftToLayout(draft: LevelDraft): LevelLayout {
  const planets = draft.planets.map(({ id: _id, ...p }) => p)
  const stars = draft.stars.map(({ x, y }) => ({ x, y }))
  const s = draft.start
  let start: LevelStart
  if (s.kind === 'orbit') {
    const idx = draft.planets.findIndex((p) => p.id === s.planetId)
    start = idx >= 0 ? { kind: 'orbit', planet: idx, angleDeg: s.angleDeg, dir: s.dir } : centerStart()
  } else {
    start = { kind: 'point', x: s.x, y: s.y }
  }
  return { v: 1, start, planets, stars }
}

/** Canonical comparison of two layouts, for dirty tracking. */
export function layoutsEqual(a: LevelLayout, b: LevelLayout): boolean {
  const canon = (l: LevelLayout) =>
    JSON.stringify({
      start: l.start.kind === 'point'
        ? ['point', l.start.x, l.start.y]
        : ['orbit', l.start.planet, l.start.angleDeg, l.start.dir],
      planets: l.planets.map((p) => [p.x, p.y, p.r, p.color, p.ringHeight ?? null]),
      stars: l.stars.map((s) => [s.x, s.y]),
    })
  return canon(a) === canon(b)
}

export function clampToField(x: number, y: number, width = GAME_W, height = GAME_H): { x: number; y: number } {
  return { x: Math.min(Math.max(x, 0), width), y: Math.min(Math.max(y, 0), height) }
}

/**
 * Remove a planet. If the start orbits it, the start becomes a point where it
 * was shown, so deleting a planet never moves the start.
 */
export function deletePlanet(draft: LevelDraft, planetId: number, tuning: Tuning): LevelDraft {
  let start = draft.start
  if (start.kind === 'orbit' && start.planetId === planetId) {
    const layout = draftToLayout(draft)
    const planets = toRuntimePlanets(layout)
    const { ship } = startState(layout, planets, tuning)
    start = { kind: 'point', ...clampToField(ship.x, ship.y) }
  }
  return { ...draft, start, planets: draft.planets.filter((p) => p.id !== planetId) }
}

// ─── Validation (mirrors the server) ──────────────────────────────────────────

/** The first reason the server would refuse this layout, or null. */
export function validateLayout(layout: LevelLayout): string | null {
  const L = LEVEL_LIMITS
  const inField = (p: { x: number; y: number }) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= L.width && p.y >= 0 && p.y <= L.height
  if (layout.start.kind === 'point' && !inField(layout.start)) return 'The start must be inside the play area'
  if (layout.planets.length > L.maxPlanets) return `A level can have at most ${L.maxPlanets} planets`
  for (const p of layout.planets) {
    if (!inField(p)) return 'Planets must be inside the play area'
    if (!(p.r >= L.minRadius && p.r <= L.maxRadius)) return `Planet radius must be ${L.minRadius}–${L.maxRadius}`
    if (!Number.isInteger(p.color) || p.color < 0 || p.color > 4) return 'Planet color is invalid'
    if (p.ringHeight !== undefined && !(p.ringHeight >= L.minRingHeight && p.ringHeight <= L.maxRingHeight)) {
      return `Ring height must be ${L.minRingHeight}–${L.maxRingHeight}`
    }
  }
  if (layout.stars.length < L.minStars) return 'A level needs at least one star'
  if (layout.stars.length > L.maxStars) return `A level can have at most ${L.maxStars} stars`
  for (const s of layout.stars) if (!inField(s)) return 'Stars must be inside the play area'
  if (layout.start.kind === 'orbit') {
    const s = layout.start
    if (!Number.isInteger(s.planet) || s.planet < 0 || s.planet >= layout.planets.length) {
      return 'The orbit start names a planet the level does not have'
    }
    if (!Number.isFinite(s.angleDeg) || (s.dir !== 1 && s.dir !== -1)) return 'The orbit start is invalid'
  }
  if (JSON.stringify(layout).length > L.maxBytes) return 'Level is too large'
  return null
}

// ─── Start state ──────────────────────────────────────────────────────────────

/**
 * How a run begins. A point start is at rest. An orbit start with a ring under
 * the current tuning is on the rail and locked. Without a ring, the ship sits
 * at the planet's ring height (own, or derived without the speed-cap raise)
 * moving along the tangent at circular speed, in free flight.
 */
export function startState(
  layout: LevelLayout,
  planets: Planet[],
  tuning: Tuning,
  width = GAME_W,
  height = GAME_H,
): { ship: Ship; lock: OrbitLock | null; ring: OrbitRing | null } {
  const s = layout.start
  if (s.kind === 'point' || !planets[s.planet]) {
    const at = s.kind === 'point' ? s : centerStart(width, height)
    return { ship: { x: at.x, y: at.y, vx: 0, vy: 0 }, lock: null, ring: null }
  }
  const angle = (s.angleDeg * Math.PI) / 180
  const ring = ringFor(s.planet, planets, tuning, width, height)
  if (!('dropped' in ring)) {
    const res = advanceOrbit({ planetIdx: s.planet, angle, dir: s.dir }, ring, tuning, 0, width, height)
    return { ship: res.ship, lock: res.lock, ring }
  }
  const p = planets[s.planet]
  const R = p.r + ringHeightFor(p, tuning)
  const v = circularSpeed(p, R, tuning)
  const c = Math.cos(angle)
  const sn = Math.sin(angle)
  let x = p.x + R * c
  let y = p.y + R * sn
  if (tuning.edgeMode === 'wrap') {
    x = wrapCoord(x, width)
    y = wrapCoord(y, height)
  }
  return { ship: { x, y, vx: -sn * v * s.dir, vy: c * v * s.dir }, lock: null, ring: null }
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

/** Indices of planets inside the usual start clearance (the orbited planet excepted). */
export function startClearanceIntruders(layout: LevelLayout, planets: Planet[], tuning: Tuning): number[] {
  const { ship } = startState(layout, planets, tuning)
  const orbited = layout.start.kind === 'orbit' ? layout.start.planet : -1
  const out: number[] = []
  planets.forEach((p, i) => {
    if (i !== orbited && Math.hypot(p.x - ship.x, p.y - ship.y) < START_CLEARANCE + p.r) out.push(i)
  })
  return out
}

/** Pairs of planets whose bodies overlap. */
export function overlappingPlanets(planets: Planet[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i]
      const b = planets[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) out.push([i, j])
    }
  }
  return out
}

export const DROP_REASON_TEXT: Record<Exclude<RingDropReason, 'capture-off'>, string> = {
  blocked: 'its ring crosses another planet',
  influence: "its ring doesn't fit inside its influence zone",
  'speed-cap': 'no ring height keeps its orbit under the speed cap',
}

/** Human-readable editor warnings. None of them block a save. */
export function levelWarnings(layout: LevelLayout, tuning: Tuning): string[] {
  const planets = toRuntimePlanets(layout)
  const out: string[] = []
  const intruders = startClearanceIntruders(layout, planets, tuning)
  if (intruders.length) {
    out.push(`Start is close to planet ${intruders.map((i) => i + 1).join(', ')}`)
  }
  for (const [a, b] of overlappingPlanets(planets)) out.push(`Planets ${a + 1} and ${b + 1} overlap`)
  if (planets.length && !tuning.orbitCapture) {
    out.push('Orbit capture is off, so no planet has a ring')
  } else {
    planets.forEach((_, i) => {
      const res = ringFor(i, planets, tuning)
      if ('dropped' in res && res.dropped !== 'capture-off') out.push(`Planet ${i + 1} has no ring: ${DROP_REASON_TEXT[res.dropped]}`)
    })
  }
  return out
}

// ─── Play kind → leaderboard ──────────────────────────────────────────────────

export type PlayKind =
  | { kind: 'random' }
  | { kind: 'level'; level: OrbitalLevel }
  | { kind: 'test'; draft: LevelDraft; editing: OrbitalLevel | null }

/** The leaderboard level a run submits under, or null for a test run (no submission). */
export function leaderboardLevel(play: PlayKind): string | null {
  if (play.kind === 'random') return 'classic'
  if (play.kind === 'level') return `level-${play.level.id}`
  return null
}

// ─── Last level played (per browser) ──────────────────────────────────────────
// Storage can throw (private mode, blocked site data), so every access is
// guarded and a failure just means "no memory".

export const LAST_LEVEL_KEY = 'orbital-dodger:level-id'

export type LevelChoice = 'random' | number

export function loadLastLevel(): LevelChoice | null {
  try {
    const raw = localStorage.getItem(LAST_LEVEL_KEY)
    if (raw === null) return null
    if (raw === 'random') return 'random'
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function saveLastLevel(choice: LevelChoice): void {
  try {
    localStorage.setItem(LAST_LEVEL_KEY, String(choice))
  } catch {
    // Choice just won't persist.
  }
}

export function clearLastLevel(): void {
  try {
    localStorage.removeItem(LAST_LEVEL_KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * Which picker entry to pre-select. A remembered id that is no longer in the
 * list falls back to Random and is reported `stale` so the caller can forget it.
 * When levels failed to load, a remembered id cannot be checked and is kept.
 */
export function pickLastLevel(
  levels: OrbitalLevel[] | null,
  stored: LevelChoice | null,
): { choice: LevelChoice; stale: boolean } {
  if (stored === null || stored === 'random') return { choice: 'random', stale: false }
  if (levels === null) return { choice: 'random', stale: false }
  return levels.some((l) => l.id === stored) ? { choice: stored, stale: false } : { choice: 'random', stale: true }
}
