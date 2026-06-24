import type { UnitDef, Direction } from './types'
import { inBounds } from './pathfinding'

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

// The tiles an attack covers from `origin` aimed in a cardinal `dir`, derived
// from the unit definition's propagation shape and targeting range. This single
// derivation drives both the attack preview (highlighted tiles) and resolution
// (tiles considered for damage), so the two can never drift. Off-board tiles are
// clipped out; for `line` the returned tiles are ordered by increasing distance
// so callers applying `stop_at_first` penetration hit the nearest target first.
//
//   single → the one tile at `minRange` in `dir`
//   line   → tiles from `minRange` to `maxRange`, clipped at the board edge
//   plus   → the tile at `maxRange` plus its 4 cardinal neighbors, board-clipped
export function attackFootprint(
  def: UnitDef,
  origin: { col: number; row: number },
  dir: Direction,
): { col: number; row: number }[] {
  const [dc, dr] = DIR_OFFSETS[dir]
  const { shape } = def.attack.propagation
  const { minRange, maxRange } = def.attack.targeting

  if (shape === 'single') {
    const c = origin.col + dc * minRange
    const r = origin.row + dr * minRange
    return inBounds(c, r) ? [{ col: c, row: r }] : []
  }

  if (shape === 'line') {
    const tiles: { col: number; row: number }[] = []
    for (let d = minRange; d <= maxRange; d++) {
      const c = origin.col + dc * d
      const r = origin.row + dr * d
      if (!inBounds(c, r)) break
      tiles.push({ col: c, row: r })
    }
    return tiles
  }

  // plus: center at `maxRange`, plus its 4 orthogonal neighbors (Manhattan ≤ 1).
  const cx = origin.col + dc * maxRange
  const cy = origin.row + dr * maxRange
  const candidates: [number, number][] = [
    [cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
  ]
  return candidates.filter(([c, r]) => inBounds(c, r)).map(([c, r]) => ({ col: c, row: r }))
}
