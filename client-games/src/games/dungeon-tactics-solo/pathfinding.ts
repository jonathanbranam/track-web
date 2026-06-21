import type { Cell, Unit, PathFilter } from './types'
import { GRID_COLS, GRID_ROWS } from './map'

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
}

export function astar(
  cells: Cell[][],
  units: Unit[],
  start: { col: number; row: number },
  goal: { col: number; row: number },
  filter: PathFilter,
  selfId?: string,
): Array<{ col: number; row: number }> | null {
  const key = (c: number, r: number) => `${c},${r}`
  const startKey = key(start.col, start.row)
  const goalKey = key(goal.col, goal.row)
  if (startKey === goalKey) return []

  const blocked = new Set<string>()
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (cells[r][c].hasStructure && !filter.ignoreStructures) blocked.add(key(c, r))
    }
  }
  for (const u of units) {
    if (u.id === selfId) continue
    if (u.kind === 'pc' && filter.ignorePcs) continue
    if (u.kind === 'npc' && filter.ignoreNpcs) continue
    blocked.add(key(u.col, u.row))
  }
  blocked.delete(goalKey)

  const h = (c: number, r: number) => Math.abs(c - goal.col) + Math.abs(r - goal.row)
  const gScore = new Map<string, number>([[startKey, 0]])
  const fScore = new Map<string, number>([[startKey, h(start.col, start.row)]])
  const cameFrom = new Map<string, string | null>([[startKey, null]])
  const posMap = new Map<string, { col: number; row: number }>([[startKey, start]])
  const openSet = new Set<string>([startKey])

  while (openSet.size > 0) {
    let current = ''
    let minF = Infinity
    for (const k of openSet) {
      const f = fScore.get(k) ?? Infinity
      if (f < minF) { minF = f; current = k }
    }
    if (current === goalKey) {
      const path: Array<{ col: number; row: number }> = []
      let k: string | null = current
      while (k !== null && k !== startKey) {
        path.unshift(posMap.get(k)!)
        k = cameFrom.get(k) ?? null
      }
      return path
    }
    openSet.delete(current)
    const { col, row } = posMap.get(current)!
    const g = gScore.get(current) ?? Infinity
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nc = col + dc
      const nr = row + dr
      if (!inBounds(nc, nr) || blocked.has(key(nc, nr))) continue
      const nk = key(nc, nr)
      const ng = g + 1
      if (ng < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current)
        gScore.set(nk, ng)
        fScore.set(nk, ng + h(nc, nr))
        posMap.set(nk, { col: nc, row: nr })
        openSet.add(nk)
      }
    }
  }
  return null
}

export function pathToAdjacentCell(
  cells: Cell[][],
  units: Unit[],
  start: { col: number; row: number },
  target: { col: number; row: number },
  filter: PathFilter,
  selfId: string,
): Array<{ col: number; row: number }> | null {
  let best: Array<{ col: number; row: number }> | null = null
  for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    const gc = target.col + dc
    const gr = target.row + dr
    if (!inBounds(gc, gr)) continue
    const path = astar(cells, units, start, { col: gc, row: gr }, filter, selfId)
    if (path !== null && (best === null || path.length < best.length)) best = path
  }
  return best
}
