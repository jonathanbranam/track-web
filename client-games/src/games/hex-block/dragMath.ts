import { hexToPixel, pixelToHex, type Axial } from './hex'
import type { Shape } from './pieces'

/** How far above the fingertip the dragged piece's centre rides, in hex sizes. */
export const LIFT_SIZES = 3.5

/** Pixel centre of a piece, relative to its origin cell's centre. */
export function pieceCentre(shape: Shape, size: number): { x: number; y: number } {
  let x = 0
  let y = 0
  for (const c of shape) {
    const p = hexToPixel(c.q, c.r, size)
    x += p.x
    y += p.y
  }
  return { x: x / shape.length, y: y / shape.length }
}

/**
 * Board cell the piece's origin lands on when its centre is at (x, y), relative to the centre of the
 * board's middle cell (already lifted above the finger by the caller). May be off-board.
 */
export function snapOrigin(shape: Shape, x: number, y: number, size: number): Axial {
  const c = pieceCentre(shape, size)
  return pixelToHex(x - c.x, y - c.y, size)
}
