/** Axial hex coordinates (q, r), s = -q - r. Pointy-top layout; see redblobgames.com/grids/hexagons. */
export interface Axial {
  readonly q: number
  readonly r: number
}

export const RADIUS = 4

export const key = (q: number, r: number) => `${q},${r}`

/** Every cell with max(|q|, |r|, |s|) <= radius, row by row (61 cells at radius 4). */
export function boardCells(radius: number = RADIUS): Axial[] {
  const cells: Axial[] = []
  for (let r = -radius; r <= radius; r++) {
    for (let q = -radius; q <= radius; q++) {
      if (Math.abs(q + r) <= radius) cells.push({ q, r })
    }
  }
  return cells
}

/** The 3 line families (constant q, constant r, constant s), 2R+1 lines each, as cell lists. */
export function boardLines(radius: number = RADIUS): Axial[][] {
  const cells = boardCells(radius)
  const lines: Axial[][] = []
  for (const axis of [(c: Axial) => c.q, (c: Axial) => c.r, (c: Axial) => -c.q - c.r]) {
    for (let k = -radius; k <= radius; k++) lines.push(cells.filter((c) => axis(c) === k))
  }
  return lines
}

export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r }
}

/** Nearest hex to a pixel (cube rounding). */
export function pixelToHex(x: number, y: number, size: number): Axial {
  const fq = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size
  const fr = ((2 / 3) * y) / size
  const fs = -fq - fr
  let q = Math.round(fq)
  let r = Math.round(fr)
  const s = Math.round(fs)
  const dq = Math.abs(q - fq)
  const dr = Math.abs(r - fr)
  const ds = Math.abs(s - fs)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q: q + 0, r: r + 0 } // + 0 turns -0 into 0
}
