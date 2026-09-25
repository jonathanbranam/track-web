import { describe, it, expect, afterEach, vi } from 'vitest'
import { DEFAULT_TUNING, GAME_W, GAME_H, circularSpeed, cloneTuning, ringFor, type Tuning } from './physics'
import {
  LEVEL_LIMITS,
  LAST_LEVEL_KEY,
  clearLastLevel,
  deletePlanet,
  draftToLayout,
  generatedLayout,
  layoutFromRuntime,
  layoutToDraft,
  layoutsEqual,
  leaderboardLevel,
  levelWarnings,
  loadLastLevel,
  overlappingPlanets,
  pickLastLevel,
  saveLastLevel,
  startClearanceIntruders,
  startState,
  toRuntimePlanets,
  toRuntimeStars,
  validateLayout,
  type LevelLayout,
  type OrbitalLevel,
} from './levels'

const T: Tuning = { ...cloneTuning(DEFAULT_TUNING), edgeMode: 'bounded', gravityReach: 0, orbitCapture: true, influenceZones: false }

const layout = (over: Partial<LevelLayout> = {}): LevelLayout => ({
  v: 1,
  start: { kind: 'orbit', planet: 0, angleDeg: 90, dir: -1 },
  planets: [{ x: 120, y: 200, r: 30, color: 1, ringHeight: 40 }, { x: 300, y: 560, r: 50, color: 3 }],
  stars: [{ x: 200, y: 360 }, { x: 50, y: 700 }],
  ...over,
})

const level = (id: number, l = layout()): OrbitalLevel => ({ id, name: `L${id}`, layout: l, updatedAt: '' })

describe('layout conversion', () => {
  it('round-trips through runtime geometry', () => {
    const l = layout()
    const back = layoutFromRuntime(toRuntimePlanets(l), toRuntimeStars(l), l.start)
    expect(back).toEqual(l)
    expect(toRuntimePlanets(l)[1]).toMatchObject({ r: 50, baseArea: 2500 })
    expect(toRuntimePlanets(l)[1].ringHeight).toBeUndefined()
  })

  it('round-trips through the editor draft, mapping the orbit planet to a stable id', () => {
    const d = layoutToDraft(layout())
    expect(d.start).toEqual({ kind: 'orbit', planetId: d.planets[0].id, angleDeg: 90, dir: -1 })
    expect(draftToLayout(d)).toEqual(layout())
    // Reordering planets keeps the start on the same planet.
    const swapped = { ...d, planets: [d.planets[1], d.planets[0]] }
    expect(draftToLayout(swapped).start).toMatchObject({ kind: 'orbit', planet: 1 })
  })

  it('compares layouts canonically', () => {
    expect(layoutsEqual(layout(), JSON.parse(JSON.stringify(layout())))).toBe(true)
    expect(layoutsEqual(layout(), layout({ stars: [{ x: 1, y: 1 }] }))).toBe(false)
  })

  it('generates a Create new seed with a center point start that validates', () => {
    const g = generatedLayout(T)
    expect(g.start).toEqual({ kind: 'point', x: GAME_W / 2, y: GAME_H / 2 })
    expect(g.planets.length).toBeLessThanOrEqual(T.planetCount)
    expect(g.stars.length).toBeGreaterThan(0)
    expect(validateLayout(g)).toBeNull()
  })
})

describe('validateLayout mirrors the server', () => {
  it('pins the limits shared with src/routes/orbitalLevels.ts', () => {
    expect(LEVEL_LIMITS).toEqual({
      width: 400, height: 720, minRadius: 12, maxRadius: 90, minRingHeight: 20, maxRingHeight: 200,
      minStars: 1, maxStars: 30, maxPlanets: 12, maxBytes: 16384,
    })
  })

  it('accepts a good layout and refuses the server cases with the same messages', () => {
    expect(validateLayout(layout())).toBeNull()
    expect(validateLayout(layout({ stars: [] }))).toBe('A level needs at least one star')
    expect(validateLayout(layout({ planets: [{ x: 500, y: 200, r: 30, color: 0 }], start: { kind: 'point', x: 1, y: 1 } })))
      .toBe('Planets must be inside the play area')
    expect(validateLayout(layout({ start: { kind: 'orbit', planet: 2, angleDeg: 0, dir: 1 } })))
      .toBe('The orbit start names a planet the level does not have')
    expect(validateLayout(layout({ planets: [{ x: 100, y: 100, r: 5, color: 0 }] }))).toMatch(/radius/)
    expect(validateLayout(layout({ planets: [{ x: 100, y: 100, r: 30, color: 0, ringHeight: 10 }] }))).toMatch(/Ring height/)
    expect(validateLayout(layout({ stars: Array.from({ length: 31 }, () => ({ x: 10, y: 10 })) }))).toMatch(/at most 30 stars/)
  })
})

describe('startState', () => {
  it('a point start is at rest', () => {
    const l = layout({ start: { kind: 'point', x: 50, y: 60 } })
    expect(startState(l, toRuntimePlanets(l), T)).toEqual({ ship: { x: 50, y: 60, vx: 0, vy: 0 }, lock: null, ring: null })
  })

  it('an orbit start with a ring is on the ring and locked', () => {
    const l = layout()
    const planets = toRuntimePlanets(l)
    const { ship, lock, ring } = startState(l, planets, T)
    expect(ring).not.toBeNull()
    expect(lock).toEqual({ planetIdx: 0, angle: Math.PI / 2, dir: -1 })
    // 90° is straight below the planet (y down), on the 30 + 40 ring.
    expect(ship.x).toBeCloseTo(120, 6)
    expect(ship.y).toBeCloseTo(270, 6)
    expect(Math.hypot(ship.vx, ship.vy)).toBeCloseTo(ring!.vc, 6)
  })

  it('an orbit start without a ring is tangent at circular speed and unlocked', () => {
    const l = layout()
    const planets = toRuntimePlanets(l)
    const off: Tuning = { ...T, orbitCapture: false }
    expect('dropped' in ringFor(0, planets, off)).toBe(true)
    const { ship, lock } = startState(l, planets, off)
    expect(lock).toBeNull()
    expect(ship.x).toBeCloseTo(120, 6)
    expect(ship.y).toBeCloseTo(270, 6)
    const v = circularSpeed(planets[0], 70, off)
    // Tangent at 90° with dir -1 points +x.
    expect(ship.vx).toBeCloseTo(v, 6)
    expect(ship.vy).toBeCloseTo(0, 6)
  })
})

describe('editor edits', () => {
  it('deleting the orbited planet converts the start to a point where it was shown', () => {
    const d = layoutToDraft(layout())
    const next = deletePlanet(d, d.planets[0].id, T)
    expect(next.planets).toHaveLength(1)
    expect(next.start.kind).toBe('point')
    if (next.start.kind !== 'point') return
    expect(next.start.x).toBeCloseTo(120, 6)
    expect(next.start.y).toBeCloseTo(270, 6)
  })

  it('deleting another planet keeps the orbit start on its planet', () => {
    const d = layoutToDraft(layout())
    const next = deletePlanet(d, d.planets[1].id, T)
    expect(draftToLayout(next).start).toEqual({ kind: 'orbit', planet: 0, angleDeg: 90, dir: -1 })
  })
})

describe('warnings', () => {
  it('flags planets inside the start clearance, but not the orbited one', () => {
    const l = layout({ start: { kind: 'point', x: 130, y: 300 } })
    expect(startClearanceIntruders(l, toRuntimePlanets(l), T)).toEqual([0])
    expect(startClearanceIntruders(layout(), toRuntimePlanets(layout()), T)).toEqual([])
  })

  it('flags overlapping planets', () => {
    const l = layout({ planets: [{ x: 100, y: 100, r: 30, color: 0 }, { x: 140, y: 100, r: 20, color: 1 }] })
    expect(overlappingPlanets(toRuntimePlanets(l))).toEqual([[0, 1]])
  })

  it('names why a ring is dropped, and changes with orbit capture', () => {
    const l = layout({
      start: { kind: 'point', x: 380, y: 20 },
      planets: [{ x: 100, y: 360, r: 40, color: 0, ringHeight: 60 }, { x: 230, y: 360, r: 25, color: 1 }],
    })
    expect(levelWarnings(l, T)).toContain('Planet 1 has no ring: its ring crosses another planet')
    expect(levelWarnings(l, { ...T, orbitCapture: false })).toContain('Orbit capture is off, so no planet has a ring')
  })
})

describe('leaderboardLevel', () => {
  it('is classic for Random, level-<id> for a saved level, and null for a test run', () => {
    expect(leaderboardLevel({ kind: 'random' })).toBe('classic')
    expect(leaderboardLevel({ kind: 'level', level: level(7) })).toBe('level-7')
    expect(leaderboardLevel({ kind: 'test', draft: layoutToDraft(layout()), editing: null })).toBeNull()
  })
})

describe('last level played', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stubStorage = () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    return store
  }

  it('round-trips random and ids through localStorage', () => {
    const store = stubStorage()
    saveLastLevel('random')
    expect(loadLastLevel()).toBe('random')
    saveLastLevel(7)
    expect(store.get(LAST_LEVEL_KEY)).toBe('7')
    expect(loadLastLevel()).toBe(7)
    clearLastLevel()
    expect(loadLastLevel()).toBeNull()
  })

  it('pre-selects the remembered level, and reports a stale id so it is cleared', () => {
    expect(pickLastLevel([level(7)], 7)).toEqual({ choice: 7, stale: false })
    expect(pickLastLevel([level(7)], 9)).toEqual({ choice: 'random', stale: true })
    expect(pickLastLevel([level(7)], null)).toEqual({ choice: 'random', stale: false })
    expect(pickLastLevel(null, 9)).toEqual({ choice: 'random', stale: false })
  })

  it('treats a throwing localStorage as no memory', () => {
    const boom = () => { throw new Error('blocked') }
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom })
    expect(loadLastLevel()).toBeNull()
    expect(() => saveLastLevel(3)).not.toThrow()
    expect(() => clearLastLevel()).not.toThrow()
  })
})
