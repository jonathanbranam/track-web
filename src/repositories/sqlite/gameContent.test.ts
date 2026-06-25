import { describe, it, expect } from 'vitest'
import { setupTestDb } from '../../test-utils/db'
import { SqliteGameContentRepository } from './gameContent'
import { BUNDLED_MAP } from '../../games/dungeon-tactics/map'

describe('SqliteGameContentRepository', () => {
  it('seeds the bundled content and round-trips it losslessly', () => {
    const { db } = setupTestDb()
    const repo = new SqliteGameContentRepository(db)
    repo.seedDefaultIfEmpty(BUNDLED_MAP)

    const tree = repo.getDefault()
    expect(tree).not.toBeNull()
    // Lossless round-trip: the deserialized seed equals the bundled source.
    expect(tree!.region).toEqual(BUNDLED_MAP.region)
    expect(tree!.map).toEqual(BUNDLED_MAP.map)
    expect(tree!.encounter).toEqual(BUNDLED_MAP.encounter)
  })

  it('reproduces the prior board: terrain, structure HP, spawners, spawn zone', () => {
    const { db } = setupTestDb()
    const repo = new SqliteGameContentRepository(db)
    repo.seedDefaultIfEmpty(BUNDLED_MAP)
    const map = repo.getDefault()!.map as typeof BUNDLED_MAP.map

    // Board dimensions and a known terrain cell that differs from the (col+row)%4
    // formula (the power-center at (8,3) sits on stone).
    expect(map.size).toEqual({ cols: 16, rows: 8 })
    expect(map.terrain[3][8]).toBe('stone')

    // Structures with HP: five power centers (hp 3) and the tower (hp 5).
    expect(map.objects).toContainEqual({ col: 8, row: 6, kind: 'tower', hp: 5 })
    expect(map.objects.filter(o => o.kind === 'power-center')).toHaveLength(5)
    for (const pc of map.objects.filter(o => o.kind === 'power-center')) {
      expect(pc.hp).toBe(3)
    }

    // Enemy spawner tiles and the 41-tile player spawn zone.
    expect(new Set(map.enemySpawnZone)).toEqual(new Set(['0,1', '4,0', '7,0', '10,0', '15,1']))
    expect(map.playerSpawnZone).toHaveLength(41)
  })

  it('does not overwrite or duplicate existing content', () => {
    const { db } = setupTestDb()
    const repo = new SqliteGameContentRepository(db)
    repo.seedDefaultIfEmpty(BUNDLED_MAP)
    repo.seedDefaultIfEmpty(BUNDLED_MAP)
    expect(repo.listRegions()).toHaveLength(1)
  })

  it('rejects malformed content and persists nothing', () => {
    const { db } = setupTestDb()
    const repo = new SqliteGameContentRepository(db)
    const badMap = { ...BUNDLED_MAP.map, terrain: BUNDLED_MAP.map.terrain.slice(0, 4) }
    expect(() => repo.seedDefaultIfEmpty({ ...BUNDLED_MAP, map: badMap })).toThrow()
    expect(repo.listRegions()).toHaveLength(0)
  })
})
