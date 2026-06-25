import type { Cell, Unit } from './types'
import { gridCols, gridRows } from './contentStore'

export function damageStructure(cells: Cell[][], col: number, row: number): Cell[][] {
  const hp = cells[row][col].structureHp ?? 0
  if (hp <= 0) return cells
  const newHp = hp - 1
  return cells.map((r, ri) =>
    ri !== row ? r : r.map((c, ci) =>
      ci !== col ? c : { ...c, structureHp: newHp, hasStructure: newHp > 0 }
    )
  )
}

export function occupiedKey(units: Unit[]): Set<string> {
  return new Set(units.map((u) => `${u.col},${u.row}`))
}

export function structureKeys(cells: Cell[][]): Set<string> {
  const keys = new Set<string>()
  const rows = gridRows()
  const cols = gridCols()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].hasStructure) keys.add(`${c},${r}`)
    }
  }
  return keys
}

function powerCenterCount(cells: Cell[][]): number {
  let n = 0
  const rows = gridRows()
  const cols = gridCols()
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'power-center') n++
  return n
}

export function isTowerImmune(cells: Cell[][]): boolean {
  return powerCenterCount(cells) >= 2
}
