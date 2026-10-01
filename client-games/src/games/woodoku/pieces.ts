/** A piece is a list of [row, col] cells, normalised so the min row and col are 0. */
export type Cell = readonly [number, number]
export type Shape = readonly Cell[]

function rect(h: number, w: number): Shape {
  const cells: Cell[] = []
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) cells.push([r, c])
  return cells
}

/** Build a shape from ASCII rows, '#' = filled. */
function art(...rows: string[]): Shape {
  const cells: Cell[] = []
  rows.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && cells.push([r, c])))
  return cells
}

/** Fixed orientations only: the game has no rotation, so each turn is its own shape. */
export const SHAPES: readonly Shape[] = [
  rect(1, 1),
  rect(1, 2), rect(2, 1),
  rect(1, 3), rect(3, 1),
  rect(1, 4), rect(4, 1),
  rect(1, 5), rect(5, 1),
  rect(2, 2), rect(3, 3), rect(2, 3), rect(3, 2),
  // L trominoes
  art('#.', '##'), art('.#', '##'), art('##', '#.'), art('##', '.#'),
  // L pentominoes (3-long arm)
  art('#..', '#..', '###'), art('..#', '..#', '###'), art('###', '#..', '#..'), art('###', '..#', '..#'),
  // T tetrominoes
  art('###', '.#.'), art('.#.', '###'), art('#.', '##', '#.'), art('.#', '##', '.#'),
  // S / Z
  art('.##', '##.'), art('##.', '.##'), art('#.', '##', '.#'), art('.#', '##', '#.'),
]

export function shapeSize(shape: Shape): { rows: number; cols: number } {
  let rows = 0
  let cols = 0
  for (const [r, c] of shape) {
    rows = Math.max(rows, r + 1)
    cols = Math.max(cols, c + 1)
  }
  return { rows, cols }
}

/** Pick `count` random shapes; `rng` returns [0,1). */
export function randomTray(count: number, rng: () => number = Math.random): Shape[] {
  return Array.from({ length: count }, () => SHAPES[Math.floor(rng() * SHAPES.length)])
}
