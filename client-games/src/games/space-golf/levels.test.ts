import { describe, it, expect } from 'vitest'
import { LEVELS } from './levelData'
import { validateLevel, LEVEL_HEIGHT_MAX, LEVEL_HEIGHT_MIN } from './levels'
import { DEFAULT_TUNING } from './physics'
import { solveLevel, starWitnesses } from './solver'
import { testLevel } from './testCourse'

const T = DEFAULT_TUNING

describe('validateLevel', () => {
  it('accepts a well-formed level', () => {
    expect(validateLevel(testLevel(), T)).toEqual([])
  })

  it('reports each kind of malformed level', () => {
    const bad = (over: Parameters<typeof testLevel>[0]) => validateLevel(testLevel(over), T).join('; ')
    expect(bad({ height: 500 })).toMatch(/height/)
    expect(bad({ height: 5000 })).toMatch(/height/)
    expect(bad({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 230, y: 1700, r: 30, color: 1 }] })).toMatch(/overlap/)
    expect(bad({ stars: [{ x: 205, y: 1700 }] })).toMatch(/star 0 inside planet 0/)
    expect(bad({ wormhole: { x: 200, y: 2500, r: 20 } })).toMatch(/wormhole outside/)
    expect(bad({ tee: { planet: 3, angleDeg: 0, dir: 1 } })).toMatch(/tee planet/)
    // Two planets so close that neither ring fits.
    expect(bad({ planets: [{ x: 200, y: 1700, r: 40, color: 0 }, { x: 200, y: 1600, r: 40, color: 1 }] })).toMatch(/no ring/)
  })
})

describe('shipped levels', () => {
  it('ships at least nine levels with unique ids', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(9)
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length)
  })

  it('every level is well-formed', () => {
    for (const l of LEVELS) {
      expect({ id: l.id, errors: validateLevel(l, T) }).toEqual({ id: l.id, errors: [] })
      expect(l.height).toBeGreaterThanOrEqual(LEVEL_HEIGHT_MIN)
      expect(l.height).toBeLessThanOrEqual(LEVEL_HEIGHT_MAX)
    }
  })

  it('the sequence uses every course piece and both side modes', () => {
    const kinds = new Set(LEVELS.flatMap((l) => l.pieces.map((p) => p.kind)))
    expect([...kinds].sort()).toEqual(['asteroids', 'radiation', 'wind'])
    expect(new Set(LEVELS.map((l) => l.sides))).toEqual(new Set(['bounce', 'wrap']))
  })

  it.each(LEVELS.map((l) => [l.id, l] as const))('%s can reach its wormhole', (_, level) => {
    const res = solveLevel(level, T, { angles: 48, powers: 10, maxDepth: 6 })
    expect(res.minStrokes).not.toBeNull()
  })

  // Stars are placed on flights the player can make: each has a shot, taken from
  // a lie reachable by locking shots, that simulateShot says collects it and
  // survives to a lock or the wormhole.
  it.each(LEVELS.slice(4).map((l) => [l.id, l] as const))('%s: every star lies on a flyable trajectory', (_, level) => {
    const w = starWitnesses(level, T, { angles: 72, powers: 12, maxDepth: 6 })
    expect(level.stars.filter((_, i) => !w[i])).toEqual([])
  }, 60_000)

  it('the new levels use bounce sides unless the design needs the seam', () => {
    const wrapped = LEVELS.filter((l) => l.sides === 'wrap').map((l) => l.id)
    expect(wrapped).toEqual(['tailwind', 'the-seam'])
  })
})
