import { describe, it, expect } from 'vitest'
import { applyTool, resizeMap, blankMap, validateMap, PC_COUNT } from './editorModel'
import type { Brush } from './editorModel'
import type { ContentMap, ContentRegion } from './contentTypes'
import type { TerrainType } from './types'

const REGION: ContentRegion = {
  id: 'default',
  name: 'Classic',
  theme: 'classic',
  order: 0,
  terrainTypes: ['plains', 'forest', 'water', 'stone'],
}

// A small 4×4 all-plains map with a player zone large enough to be valid.
function baseMap(overrides: Partial<ContentMap> = {}): ContentMap {
  const terrain: TerrainType[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => 'plains' as TerrainType),
  )
  return {
    id: 'm',
    regionId: 'default',
    name: 'Map',
    order: 0,
    size: { cols: 4, rows: 4 },
    terrain,
    objects: [],
    enemySpawnZone: [],
    playerSpawnZone: ['0,3', '1,3', '2,3', '3,3', '0,2'],
    ...overrides,
  }
}

const brush: Brush = { terrain: 'forest', objectKind: 'tower', objectHp: 5 }

describe('applyTool', () => {
  it('paints terrain on the tile without mutating the input', () => {
    const map = baseMap()
    const next = applyTool(map, 'terrain', brush, { col: 1, row: 2 })
    expect(next.terrain[2][1]).toBe('forest')
    expect(map.terrain[2][1]).toBe('plains') // input untouched
    expect(next).not.toBe(map)
  })

  it('places a structure object (with hp)', () => {
    const next = applyTool(baseMap(), 'object', brush, { col: 2, row: 1 })
    expect(next.objects).toEqual([{ col: 2, row: 1, kind: 'tower', hp: 5 }])
  })

  it('places an inert object (no hp) when the brush omits hp', () => {
    const inert: Brush = { terrain: 'plains', objectKind: 'rubble' }
    const next = applyTool(baseMap(), 'object', inert, { col: 0, row: 0 })
    expect(next.objects).toEqual([{ col: 0, row: 0, kind: 'rubble' }])
    expect('hp' in next.objects[0]).toBe(false)
  })

  it('replaces an existing object on the same tile', () => {
    const map = baseMap({ objects: [{ col: 1, row: 1, kind: 'power-center', hp: 3 }] })
    const next = applyTool(map, 'object', brush, { col: 1, row: 1 })
    expect(next.objects).toEqual([{ col: 1, row: 1, kind: 'tower', hp: 5 }])
  })

  it('toggles an enemy-zone tile on then off', () => {
    const on = applyTool(baseMap(), 'enemy-zone', brush, { col: 0, row: 0 })
    expect(on.enemySpawnZone).toContain('0,0')
    const off = applyTool(on, 'enemy-zone', brush, { col: 0, row: 0 })
    expect(off.enemySpawnZone).not.toContain('0,0')
  })

  it('toggles a player-zone tile on then off', () => {
    const map = baseMap()
    const off = applyTool(map, 'player-zone', brush, { col: 0, row: 3 }) // already present → removed
    expect(off.playerSpawnZone).not.toContain('0,3')
    const on = applyTool(off, 'player-zone', brush, { col: 0, row: 3 })
    expect(on.playerSpawnZone).toContain('0,3')
  })

  it('erases an object and both zone memberships on the tile', () => {
    const map = baseMap({
      objects: [{ col: 0, row: 3, kind: 'tower', hp: 5 }],
      enemySpawnZone: ['0,3'],
    })
    const next = applyTool(map, 'erase', brush, { col: 0, row: 3 })
    expect(next.objects).toEqual([])
    expect(next.enemySpawnZone).not.toContain('0,3')
    expect(next.playerSpawnZone).not.toContain('0,3')
  })

  it('returns the same map for out-of-bounds tiles', () => {
    const map = baseMap()
    expect(applyTool(map, 'terrain', brush, { col: 9, row: 9 })).toBe(map)
    expect(applyTool(map, 'terrain', brush, { col: -1, row: 0 })).toBe(map)
  })
})

describe('resizeMap', () => {
  it('grows, filling new tiles with the given fill terrain', () => {
    const { map, dropped } = resizeMap(baseMap(), 6, 5, 'water')
    expect(map.size).toEqual({ cols: 6, rows: 5 })
    expect(map.terrain.length).toBe(5)
    expect(map.terrain[0].length).toBe(6)
    expect(map.terrain[4][5]).toBe('water') // new tile
    expect(map.terrain[0][0]).toBe('plains') // preserved
    expect(dropped).toEqual({ objects: 0, enemyZone: 0, playerZone: 0 })
  })

  it('crops out-of-bounds objects and zone tiles and reports counts', () => {
    // Grow a base map to 6×6 first, then place content near the far edge so a crop
    // back to 4×4 drops exactly the out-of-bounds entries.
    const big = resizeMap(baseMap(), 6, 6, 'plains').map
    const map: ContentMap = {
      ...big,
      objects: [{ col: 0, row: 0, kind: 'tower', hp: 5 }, { col: 5, row: 5, kind: 'rubble' }],
      enemySpawnZone: ['0,0', '5,5'],
      playerSpawnZone: ['0,3', '1,3', '2,3', '3,3', '0,2', '5,5'],
    }
    const { map: out, dropped } = resizeMap(map, 4, 4)
    expect(out.size).toEqual({ cols: 4, rows: 4 })
    expect(out.objects).toEqual([{ col: 0, row: 0, kind: 'tower', hp: 5 }])
    expect(out.enemySpawnZone).toEqual(['0,0'])
    expect(out.playerSpawnZone).not.toContain('5,5')
    expect(dropped.objects).toBe(1)
    expect(dropped.enemyZone).toBe(1)
    expect(dropped.playerZone).toBe(1)
  })

  it('clamps sizes to the allowed bounds', () => {
    const tooBig = resizeMap(baseMap(), 99, 99)
    expect(tooBig.map.size).toEqual({ cols: 16, rows: 16 })
    const tooSmall = resizeMap(baseMap(), 1, 1)
    expect(tooSmall.map.size).toEqual({ cols: 4, rows: 4 })
  })
})

describe('blankMap', () => {
  it('fills the grid with the region first terrain and seeds a valid player zone', () => {
    const map = blankMap(REGION, { cols: 8, rows: 8 })
    expect(map.size).toEqual({ cols: 8, rows: 8 })
    expect(map.terrain.every((r) => r.every((t) => t === 'plains'))).toBe(true)
    expect(map.objects).toEqual([])
    expect(map.enemySpawnZone).toEqual([])
    expect(map.playerSpawnZone.length).toBeGreaterThan(PC_COUNT)
    // The blank map passes client validation so it can be created server-side.
    expect(validateMap(map, REGION)).toEqual([])
  })

  it('defaults to 8×8', () => {
    expect(blankMap(REGION).size).toEqual({ cols: 8, rows: 8 })
  })
})

describe('validateMap', () => {
  it('accepts a valid map', () => {
    expect(validateMap(baseMap(), REGION)).toEqual([])
  })

  it('flags a terrain value outside the region enum, with the tile', () => {
    const terrain = baseMap().terrain.map((r) => [...r])
    terrain[1][2] = 'lava' as TerrainType
    const problems = validateMap(baseMap({ terrain }), REGION)
    expect(problems.some((p) => p.tile?.col === 2 && p.tile?.row === 1)).toBe(true)
  })

  it('flags a grid whose dimensions do not match size', () => {
    const map = baseMap({ terrain: baseMap().terrain.slice(0, 2) })
    expect(validateMap(map, REGION).length).toBeGreaterThan(0)
  })

  it('flags an out-of-bounds object', () => {
    const map = baseMap({ objects: [{ col: 9, row: 9, kind: 'tower', hp: 5 }] })
    expect(validateMap(map, REGION).some((p) => p.tile?.col === 9)).toBe(true)
  })

  it('flags a player spawn zone no larger than the PC count', () => {
    const map = baseMap({ playerSpawnZone: ['0,3', '1,3', '2,3', '3,3'] }) // exactly PC_COUNT
    expect(validateMap(map, REGION).some((p) => /party size/.test(p.message))).toBe(true)
  })
})
