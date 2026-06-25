import { describe, it, expect } from 'vitest'
import { playerSpawnZone, pcStartTiles } from './contentStore'
import { placeUnit } from './pc'
import { initialState } from './npc'

// The bundled board's spawn zone and PC start tiles, read through the content
// store (the engine's single board-content seam).
const spawnZoneTiles = () => playerSpawnZone()
const PC_START_TILES = pcStartTiles()

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
    const zone = spawnZoneTiles()
    expect(zone.size).toBe(41)
    const expected = new Set(EXPECTED_ZONE.map(([c, r]) => `${c},${r}`))
    expect(zone).toEqual(expected)
  })

  it('excludes structure holes and trimmed flank corners', () => {
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

  it('contains every fixed PC start tile', () => {
    const zone = spawnZoneTiles()
    for (const { col, row } of Object.values(PC_START_TILES)) {
      expect(zone.has(`${col},${row}`)).toBe(true)
    }
  })
})

describe('placeUnit', () => {
  const at = (s: ReturnType<typeof initialState>, id: string) => s.units.find((u) => u.id === id)!

  it('relocates a PC to an empty in-zone tile', () => {
    const s = initialState()
    const next = placeUnit(s, 'pc-0', 8, 4) // in zone, empty
    const pc0 = at(next, 'pc-0')
    expect(pc0.col).toBe(8)
    expect(pc0.row).toBe(4)
  })

  it('rejects an out-of-zone target (state unchanged)', () => {
    const s = initialState()
    expect(placeUnit(s, 'pc-0', 8, 1)).toBe(s)
  })

  it('rejects a structure tile (state unchanged)', () => {
    const s = initialState()
    expect(placeUnit(s, 'pc-0', 8, 6)).toBe(s) // tower
  })

  it('rejects a tile occupied by another unit (state unchanged)', () => {
    const s = initialState()
    // pc-1 (ranger) sits on its start tile (6,5).
    expect(placeUnit(s, 'pc-0', PC_START_TILES.ranger.col, PC_START_TILES.ranger.row)).toBe(s)
  })

  it('never relocates a non-PC unit, even onto a valid tile (state unchanged)', () => {
    const s = initialState()
    // NPCs can be inspected during placement but must not be repositioned.
    expect(placeUnit(s, 'npc-0', 8, 4)).toBe(s)
  })

  it('supports repeated repositioning, ending on the last valid tile', () => {
    const s = initialState()
    const first = placeUnit(s, 'pc-0', 8, 4)
    const second = placeUnit(first, 'pc-0', 3, 7)
    const pc0 = at(second, 'pc-0')
    expect(pc0.col).toBe(3)
    expect(pc0.row).toBe(7)
  })
})
