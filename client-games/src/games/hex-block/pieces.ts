import type { Axial } from './hex'

export type Color = 'red' | 'blue' | 'green'
export const COLORS: readonly Color[] = ['red', 'blue', 'green']
/** Outline symbol each colour carries. */
export const SYMBOLS: Record<Color, 'bird' | 'note' | 'leaf'> = { red: 'bird', blue: 'note', green: 'leaf' }

/** Offsets from the piece origin, in fixed orientation. */
export type Shape = readonly Axial[]
export interface Piece {
  readonly cells: Shape
  /** Colour of each cell, same order as `cells`. */
  readonly colors: readonly Color[]
}

const rotate = (c: Axial): Axial => ({ q: -c.r, r: c.q + c.r }) // 60 degrees

function normalise(cells: Axial[]): Axial[] {
  const minR = Math.min(...cells.map((c) => c.r))
  const minQ = Math.min(...cells.filter((c) => c.r === minR).map((c) => c.q))
  return cells
    .map((c) => ({ q: c.q - minQ + 0, r: c.r - minR + 0 }))
    .sort((a, b) => a.r - b.r || a.q - b.q)
}

const shapeKey = (s: Shape) => s.map((c) => `${c.q},${c.r}`).join(';')

/** All distinct orientations (6 rotations, plus mirror images when `mirror`) of a base shape. */
function orientations(base: [number, number][], mirror = false): Shape[] {
  const out = new Map<string, Shape>()
  let cur: Axial[] = base.map(([q, r]) => ({ q, r }))
  for (const flip of mirror ? [false, true] : [false]) {
    if (flip) cur = base.map(([q, r]) => ({ q: r, r: q }))
    for (let i = 0; i < 6; i++) {
      const n = normalise(cur)
      out.set(shapeKey(n), n)
      cur = cur.map(rotate)
    }
  }
  return [...out.values()]
}

/** Fixed orientations only: the game has no rotation, so each turn is its own shape. */
export const SHAPES: readonly Shape[] = [
  ...orientations([[0, 0]]),
  ...orientations([[0, 0], [1, 0]]),
  ...orientations([[0, 0], [1, 0], [2, 0]]),
  ...orientations([[0, 0], [1, 0], [3, 0], [2, 0]]),
  ...orientations([[0, 0], [1, 0], [0, 1]]), // triangle
  ...orientations([[0, 0], [1, 0], [1, 1]]), // bent three
  ...orientations([[0, 0], [1, 0], [0, 1], [1, -1]]), // rhombus
  ...orientations([[0, 0], [1, 0], [1, 1], [0, 2]], true), // arc
  ...orientations([[0, 0], [1, 0], [1, 1], [2, 1]], true), // zigzag
]

/** Small pieces are drawn more often. */
const WEIGHT = [0, 3, 3, 2, 1]
const shapeWeight = (s: Shape) => WEIGHT[s.length]
const TOTAL_WEIGHT = SHAPES.reduce((n, s) => n + shapeWeight(s), 0)

export function randomPiece(rng: () => number = Math.random): Piece {
  let pick = rng() * TOTAL_WEIGHT
  let shape = SHAPES[SHAPES.length - 1]
  for (const s of SHAPES) {
    pick -= shapeWeight(s)
    if (pick < 0) {
      shape = s
      break
    }
  }
  return { cells: shape, colors: shape.map(() => COLORS[Math.floor(rng() * COLORS.length)]) }
}

export function randomTray(count: number, rng: () => number = Math.random): Piece[] {
  return Array.from({ length: count }, () => randomPiece(rng))
}
