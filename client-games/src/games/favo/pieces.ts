import type { Axial } from '../hex-block/hex'

export type Color = 'red' | 'blue' | 'green'
export const COLORS: readonly Color[] = ['red', 'blue', 'green']
/** Outline symbol each element carries. */
export const SYMBOLS: Record<Color, 'bird' | 'note' | 'leaf'> = { red: 'bird', blue: 'note', green: 'leaf' }

/** A panel: 1-3 hexes with offsets from the origin cell, each carrying its own element. */
export interface Piece {
  readonly cells: readonly Axial[]
  readonly colors: readonly Color[]
  /** A bonus panel from a full gauge: one hex that clears the whole group it joins. */
  readonly merge?: boolean
}

const turn = (c: Axial): Axial => ({ q: -c.r, r: c.q + c.r }) // 60 degrees

/** Shift so the top-left cell is at (0, 0); cells keep their order (and so their colours). */
function normalise(cells: Axial[]): Axial[] {
  const minR = Math.min(...cells.map((c) => c.r))
  const minQ = Math.min(...cells.filter((c) => c.r === minR).map((c) => c.q))
  return cells.map((c) => ({ q: c.q - minQ + 0, r: c.r - minR + 0 }))
}

/** Tap-to-rotate: turn the whole panel 60 degrees, which also cycles which element sits where. */
export function rotatePiece(piece: Piece): Piece {
  return { ...piece, cells: normalise(piece.cells.map(turn)) }
}

/** Base shapes: single, pair, straight three, triangle, bent three. */
export const SHAPES: readonly (readonly Axial[])[] = [
  [{ q: 0, r: 0 }],
  [{ q: 0, r: 0 }, { q: 1, r: 0 }],
  [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }],
  [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }],
  [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: 1 }],
]
/** Relative draw weights, same order as SHAPES. */
const WEIGHTS = [2, 3, 2, 2, 2]
const TOTAL = WEIGHTS.reduce((a, b) => a + b, 0)

export function randomPiece(rng: () => number = Math.random): Piece {
  let pick = rng() * TOTAL
  let shape = SHAPES[SHAPES.length - 1]
  for (let i = 0; i < SHAPES.length; i++) {
    pick -= WEIGHTS[i]
    if (pick < 0) {
      shape = SHAPES[i]
      break
    }
  }
  let piece: Piece = { cells: shape, colors: shape.map(() => COLORS[Math.floor(rng() * COLORS.length)]) }
  for (let i = Math.floor(rng() * 6); i > 0; i--) piece = rotatePiece(piece)
  return piece
}

export const mergePiece = (color: Color): Piece => ({ cells: [{ q: 0, r: 0 }], colors: [color], merge: true })

export function randomTray(count: number, rng: () => number = Math.random): Piece[] {
  return Array.from({ length: count }, () => randomPiece(rng))
}
