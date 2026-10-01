import type { Shape } from './pieces'
import { shapeSize } from './pieces'

/** How far above the fingertip the dragged piece's centre rides, in board cells. */
export const LIFT_CELLS = 2.5

/**
 * Board cell the piece's top-left lands on when its centre is at (x, y) —
 * already lifted above the finger by the caller. Rounded so the piece snaps to
 * the grid. Coordinates are relative to the board's top-left; may be off-board.
 */
export function snapCell(shape: Shape, x: number, y: number, cell: number): { row: number; col: number } {
  const { rows, cols } = shapeSize(shape)
  return {
    row: Math.round((y - (rows * cell) / 2) / cell),
    col: Math.round((x - (cols * cell) / 2) / cell),
  }
}
