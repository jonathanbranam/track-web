import { describe, it, expect } from 'vitest'
import { attackFootprint } from './attackFootprint'
import { unitDefs } from './unitDefs'
import { gridCols, gridRows } from './contentStore'

// Compare two tile lists as sets (order-independent) via "col,row" keys.
const keys = (tiles: { col: number; row: number }[]) => tiles.map((t) => `${t.col},${t.row}`).sort()

describe('attackFootprint', () => {
  describe('single (melee/rogue)', () => {
    it('covers the one adjacent tile in the aimed direction', () => {
      const fp = attackFootprint(unitDefs.melee, { col: 5, row: 5 }, 'right')
      expect(keys(fp)).toEqual(['6,5'])
    })

    it('is empty when the adjacent tile is off the board', () => {
      const fp = attackFootprint(unitDefs.melee, { col: gridCols() - 1, row: 5 }, 'right')
      expect(fp).toEqual([])
    })
  })

  describe('line (ranger)', () => {
    it('covers distance 2 to the board edge, ordered by increasing distance', () => {
      const fp = attackFootprint(unitDefs.ranger, { col: 5, row: 5 }, 'right')
      // origin col 5, right → cols 7..15 at row 5
      expect(fp).toEqual([
        { col: 7, row: 5 }, { col: 8, row: 5 }, { col: 9, row: 5 }, { col: 10, row: 5 },
        { col: 11, row: 5 }, { col: 12, row: 5 }, { col: 13, row: 5 }, { col: 14, row: 5 },
        { col: 15, row: 5 },
      ])
    })

    it('clips at the top edge when aimed up', () => {
      const fp = attackFootprint(unitDefs.ranger, { col: 5, row: 5 }, 'up')
      // origin row 5, up → rows 3,2,1,0 at col 5 (distance 2 to edge)
      expect(fp).toEqual([
        { col: 5, row: 3 }, { col: 5, row: 2 }, { col: 5, row: 1 }, { col: 5, row: 0 },
      ])
    })

    it('is empty when distance 2 is already off the board', () => {
      const fp = attackFootprint(unitDefs.ranger, { col: gridCols() - 1, row: 5 }, 'right')
      expect(fp).toEqual([])
    })
  })

  describe('plus (magic-user)', () => {
    it('covers the center at distance 2 plus its 4 cardinal neighbors', () => {
      const fp = attackFootprint(unitDefs['magic-user'], { col: 5, row: 5 }, 'right')
      // center (7,5) + (6,5),(8,5),(7,4),(7,6)
      expect(keys(fp)).toEqual(keys([
        { col: 7, row: 5 }, { col: 6, row: 5 }, { col: 8, row: 5 }, { col: 7, row: 4 }, { col: 7, row: 6 },
      ]))
    })

    it('clips a neighbor that falls off the board edge', () => {
      const fp = attackFootprint(unitDefs['magic-user'], { col: 0, row: 5 }, 'up')
      // center (0,3); neighbors (-1,3) off-board, (1,3),(0,2),(0,4) on-board
      expect(keys(fp)).toEqual(keys([
        { col: 0, row: 3 }, { col: 1, row: 3 }, { col: 0, row: 2 }, { col: 0, row: 4 },
      ]))
    })

    it('keeps only the on-board tiles when the center is off the board', () => {
      const fp = attackFootprint(unitDefs['magic-user'], { col: 5, row: 1 }, 'up')
      // center (5,-1) off-board; only neighbor (5,0) is on-board
      expect(keys(fp)).toEqual(['5,0'])
    })
  })

  it('stays within the board for every shape and direction', () => {
    for (const def of Object.values(unitDefs)) {
      for (const dir of ['up', 'down', 'left', 'right'] as const) {
        const fp = attackFootprint(def, { col: 8, row: 4 }, dir)
        for (const t of fp) {
          expect(t.col).toBeGreaterThanOrEqual(0)
          expect(t.col).toBeLessThan(gridCols())
          expect(t.row).toBeGreaterThanOrEqual(0)
          expect(t.row).toBeLessThan(gridRows())
        }
      }
    }
  })
})
