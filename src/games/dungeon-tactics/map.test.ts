import { describe, it, expect } from 'vitest'
import {
  regionSchema,
  mapSchema,
  mapSchemaForTerrain,
  encounterSchema,
  BUNDLED_MAP,
} from './map'

// Guards against drift between the content shape types and the Zod schemas:
// the bundled seed must validate against all three (the parity guard, like
// `unitDefs.test.ts`).
describe('dungeon-tactics content schemas', () => {
  it('BUNDLED_MAP region satisfies regionSchema', () => {
    expect(regionSchema.safeParse(BUNDLED_MAP.region).success).toBe(true)
  })

  it('BUNDLED_MAP map satisfies mapSchema', () => {
    expect(mapSchema.safeParse(BUNDLED_MAP.map).success).toBe(true)
  })

  it('BUNDLED_MAP map terrain is within the region terrainTypes', () => {
    const schema = mapSchemaForTerrain(BUNDLED_MAP.region.terrainTypes)
    expect(schema.safeParse(BUNDLED_MAP.map).success).toBe(true)
  })

  it('BUNDLED_MAP encounter satisfies encounterSchema', () => {
    expect(encounterSchema.safeParse(BUNDLED_MAP.encounter).success).toBe(true)
  })

  // ─── Map validation rejections ───

  it('rejects a terrain grid whose dimensions do not match size', () => {
    const bad = { ...BUNDLED_MAP.map, terrain: BUNDLED_MAP.map.terrain.slice(0, 7) }
    expect(mapSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a size smaller than 4×4', () => {
    const bad = { ...BUNDLED_MAP.map, size: { cols: 3, rows: 3 } }
    expect(mapSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a size larger than 16×16', () => {
    const bad = { ...BUNDLED_MAP.map, size: { cols: 17, rows: 8 } }
    expect(mapSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects an out-of-bounds object', () => {
    const bad = { ...BUNDLED_MAP.map, objects: [{ col: 99, row: 0, kind: 'tower', hp: 5 }] }
    expect(mapSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects an out-of-bounds spawn-zone tile', () => {
    const bad = { ...BUNDLED_MAP.map, enemySpawnZone: ['0,99'] }
    expect(mapSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a terrain value outside the region enum', () => {
    const grid = BUNDLED_MAP.map.terrain.map(row => [...row])
    grid[0][0] = 'lava'
    const bad = { ...BUNDLED_MAP.map, terrain: grid }
    const schema = mapSchemaForTerrain(BUNDLED_MAP.region.terrainTypes)
    expect(schema.safeParse(bad).success).toBe(false)
  })

  it('rejects a playerSpawnZone no larger than the PC count', () => {
    const bad = { ...BUNDLED_MAP.map, playerSpawnZone: ['1,7', '2,7', '3,7', '4,7'] }
    expect(mapSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts an inert object without hp', () => {
    const ok = { ...BUNDLED_MAP.map, objects: [{ col: 0, row: 0, kind: 'rubble' }] }
    expect(mapSchema.safeParse(ok).success).toBe(true)
  })

  // ─── Encounter / condition rejections ───

  it('rejects a composite (all-of) win condition', () => {
    const bad = {
      ...BUNDLED_MAP.encounter,
      win: [{ type: 'all-of', conditions: [{ type: 'clear-all-waves' }] }],
    }
    expect(encounterSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects an unknown wave start trigger', () => {
    const bad = {
      ...BUNDLED_MAP.encounter,
      waves: [{ index: 0, start: { trigger: 'on-tuesday' }, enemies: [{ archetype: 'short-range', count: 1 }] }],
    }
    expect(encounterSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts an after-turns trigger with turns', () => {
    const ok = {
      ...BUNDLED_MAP.encounter,
      waves: [{ index: 0, start: { trigger: 'after-turns', turns: 3 }, enemies: [{ archetype: 'short-range', count: 1 }] }],
    }
    expect(encounterSchema.safeParse(ok).success).toBe(true)
  })
})
