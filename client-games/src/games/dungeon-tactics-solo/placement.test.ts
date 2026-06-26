import { describe, it, expect } from 'vitest'
import { playerSpawnZone, playerStartTiles, reset } from './contentStore'
import { blankMap, PC_COUNT } from './editorModel'
import { BUNDLED_MAP } from './bundledMap'
import { placeUnit } from './pc'
import { initialState } from './npc'

// The bundled board's spawn zone, read through the content store (the engine's
// single board-content seam).
const spawnZoneTiles = () => playerSpawnZone()

// The authored 41-tile spawn zone from design.md, listed row by row. The center
// front line is row 4, just behind the forward (8,3) generator.
const EXPECTED_ZONE: Array<[number, number]> = [
  // row 4
  [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
  // row 5
  [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],
  // row 6 (tower hole at 8, power-center holes at 2 and 14)
  [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6],
  // row 7 (flank corner (0,7) trimmed)
  [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7],
]

describe('spawnZoneTiles', () => {
  it('equals exactly the 41-tile authored set', () => {
    reset()
    const zone = spawnZoneTiles()
    expect(zone.size).toBe(41)
    const expected = new Set(EXPECTED_ZONE.map(([c, r]) => `${c},${r}`))
    expect(zone).toEqual(expected)
  })

  it('excludes structure holes and trimmed flank corners', () => {
    reset()
    const zone = spawnZoneTiles()
    // Forward generator (8,3) and the row-3 rank are in front of the zone.
    expect(zone.has('8,3')).toBe(false)
    expect(zone.has('7,3')).toBe(false)
    expect(zone.has('9,3')).toBe(false)
    // Tower (8,6) and power centers (2,6) (14,6) on row 6.
    expect(zone.has('8,6')).toBe(false)
    expect(zone.has('2,6')).toBe(false)
    expect(zone.has('14,6')).toBe(false)
    // Power centers (5,4) (11,4) on row 4.
    expect(zone.has('5,4')).toBe(false)
    expect(zone.has('11,4')).toBe(false)
    // Trimmed flank corners.
    expect(zone.has('0,7')).toBe(false)
    expect(zone.has('1,6')).toBe(false)
    // In front of the generator line.
    expect(zone.has('8,1')).toBe(false)
  })
})

// Task 6.3: PC placement derives from the player spawn zone (no `pcStartTiles`).
describe('initial PC placement from the spawn zone', () => {
  it('seats the four PCs on distinct tiles drawn from the player spawn zone', () => {
    reset()
    const s = initialState()
    const zone = playerSpawnZone()
    const pcs = s.units.filter((u) => u.kind === 'pc')
    expect(pcs).toHaveLength(PC_COUNT)
    const keys = new Set(pcs.map((u) => `${u.col},${u.row}`))
    expect(keys.size).toBe(PC_COUNT) // distinct
    for (const u of pcs) expect(zone.has(`${u.col},${u.row}`)).toBe(true) // in-zone
  })

  it('places PCs on the first four zone tiles in row,col order', () => {
    reset()
    const s = initialState()
    const head = playerStartTiles().slice(0, PC_COUNT)
    const ids = ['pc-0', 'pc-1', 'pc-2', 'pc-3']
    ids.forEach((id, i) => {
      const u = s.units.find((x) => x.id === id)!
      expect({ col: u.col, row: u.row }).toEqual(head[i])
    })
  })

  it('is deterministic across repeated initialization', () => {
    reset()
    const a = initialState().units.filter((u) => u.kind === 'pc').map((u) => `${u.id}:${u.col},${u.row}`)
    const b = initialState().units.filter((u) => u.kind === 'pc').map((u) => `${u.id}:${u.col},${u.row}`)
    expect(a).toEqual(b)
  })

  it('no map carries a pcStartTiles field (seed or authored)', () => {
    expect('pcStartTiles' in BUNDLED_MAP.map).toBe(false)
    const authored = blankMap(BUNDLED_MAP.region, { cols: 8, rows: 8 })
    expect('pcStartTiles' in authored).toBe(false)
    // An authored map seats four distinct in-zone tiles from its own zone head.
    const head = [...authored.playerSpawnZone]
      .map((k) => k.split(',').map(Number))
      .sort((p, q) => p[1] - q[1] || p[0] - q[0])
      .slice(0, PC_COUNT)
    expect(new Set(head.map((t) => t.join(','))).size).toBe(PC_COUNT)
  })
})

describe('placeUnit', () => {
  const at = (s: ReturnType<typeof initialState>, id: string) => s.units.find((u) => u.id === id)!
  // With the seed, PCs are seated on the first four sorted zone tiles:
  // (6,4) (7,4) (8,4) (9,4). (10,4) is an empty in-zone tile.

  it('relocates a PC to an empty in-zone tile', () => {
    reset()
    const s = initialState()
    const next = placeUnit(s, 'pc-0', 10, 4) // in zone, empty
    const pc0 = at(next, 'pc-0')
    expect(pc0.col).toBe(10)
    expect(pc0.row).toBe(4)
  })

  it('rejects an out-of-zone target (state unchanged)', () => {
    reset()
    const s = initialState()
    expect(placeUnit(s, 'pc-0', 8, 1)).toBe(s)
  })

  it('rejects a structure tile (state unchanged)', () => {
    reset()
    const s = initialState()
    expect(placeUnit(s, 'pc-0', 8, 6)).toBe(s) // tower
  })

  it('rejects a tile occupied by another unit (state unchanged)', () => {
    reset()
    const s = initialState()
    // pc-1 sits on its seated tile (7,4).
    expect(placeUnit(s, 'pc-0', 7, 4)).toBe(s)
  })

  it('never relocates a non-PC unit, even onto a valid tile (state unchanged)', () => {
    reset()
    const s = initialState()
    // NPCs can be inspected during placement but must not be repositioned.
    expect(placeUnit(s, 'npc-0', 10, 4)).toBe(s)
  })

  it('supports repeated repositioning, ending on the last valid tile', () => {
    reset()
    const s = initialState()
    const first = placeUnit(s, 'pc-0', 10, 4)
    const second = placeUnit(first, 'pc-0', 3, 7)
    const pc0 = at(second, 'pc-0')
    expect(pc0.col).toBe(3)
    expect(pc0.row).toBe(7)
  })
})
