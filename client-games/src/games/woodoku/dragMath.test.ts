import { describe, expect, it } from 'vitest'
import { snapCell } from './dragMath'
import { SHAPES } from './pieces'

describe('snapCell', () => {
  it('snaps a 1x1 piece centred in a cell to that cell', () => {
    expect(snapCell(SHAPES[0], 2.5 * 40, 4.5 * 40, 40)).toEqual({ row: 4, col: 2 })
  })
  it('accounts for piece size and rounds to the nearest cell', () => {
    // 3x3 centred on (4.4, 4.4) cells → top-left ≈ (2.9, 2.9) → 3,3
    expect(snapCell(SHAPES[10], 4.4 * 40, 4.4 * 40, 40)).toEqual({ row: 3, col: 3 })
  })
  it('can be off-board', () => {
    expect(snapCell(SHAPES[0], -100, -100, 40).row).toBeLessThan(0)
  })
})
