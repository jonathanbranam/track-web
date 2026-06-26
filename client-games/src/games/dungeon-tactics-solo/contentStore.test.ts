import { describe, it, expect } from 'vitest'
import { deserialize, gridCols, gridRows, boardCells, playerSpawnZone, enemySpawners, playerStartTiles, reset } from './contentStore'
import { BUNDLED_MAP } from './bundledMap'

// Parity / round-trip guard: the client `BUNDLED_MAP` must deserialize to the
// prior hardcoded board (terrain, structure placement/HP, enemy spawner tiles,
// player spawn zone). This is the client mirror of the server seed round-trip
// test and the refactor's client-side safety net.
describe('contentStore deserializer (bundled map parity)', () => {
  it('derives board dimensions from the map size', () => {
    reset()
    expect(gridCols()).toBe(16)
    expect(gridRows()).toBe(8)
  })

  it('overlays HP-bearing objects as destructible structure cells', () => {
    const { cells } = deserialize(BUNDLED_MAP.map)

    // Tower at (8,6) hp 5.
    expect(cells[6][8]).toMatchObject({ hasStructure: true, structureHp: 5, structureKind: 'tower' })
    // Power center at (8,3) hp 3 — on the stone tile (terrain preserved).
    expect(cells[3][8]).toMatchObject({ hasStructure: true, structureHp: 3, structureKind: 'power-center', terrain: 'stone' })

    // Five power centers + one tower = six structure cells total.
    let structures = 0
    for (const row of cells) for (const c of row) if (c.hasStructure) structures++
    expect(structures).toBe(6)
  })

  it('leaves non-object cells non-structural with their terrain intact', () => {
    const { cells } = deserialize(BUNDLED_MAP.map)
    expect(cells[0][0]).toEqual({ terrain: 'plains', hasStructure: false })
    // A known cell that breaks the (col+row)%4 formula stays as authored.
    expect(cells[4][5]).toMatchObject({ terrain: 'plains' })
  })

  it('exposes the player spawn zone as a 41-tile key set', () => {
    reset()
    const zone = playerSpawnZone()
    expect(zone.size).toBe(41)
    expect(zone.has('8,4')).toBe(true)
    // Structure holes and trimmed corners excluded.
    expect(zone.has('8,6')).toBe(false)
    expect(zone.has('0,7')).toBe(false)
  })

  it('exposes the five enemy spawner tiles', () => {
    reset()
    const spawners = enemySpawners()
    expect(spawners).toEqual([
      { col: 0, row: 1 }, { col: 4, row: 0 }, { col: 7, row: 0 }, { col: 10, row: 0 }, { col: 15, row: 1 },
    ])
  })

  it('exposes the player start tiles sorted by row then col', () => {
    reset()
    const tiles = playerStartTiles()
    // Sorted ascending by row, then col — the head of the bundled 41-tile zone.
    expect(tiles.slice(0, 5)).toEqual([
      { col: 6, row: 4 }, { col: 7, row: 4 }, { col: 8, row: 4 }, { col: 9, row: 4 }, { col: 10, row: 4 },
    ])
    expect(tiles.length).toBe(41)
  })

  it('boardCells returns a deep copy (mutations do not leak)', () => {
    reset()
    const a = boardCells()
    a[0][0].terrain = 'water'
    expect(boardCells()[0][0].terrain).toBe('plains')
  })
})
