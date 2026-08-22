import type { Cell, GameState, Tile, Unit } from './types'
import { gridCols, gridRows } from './contentStore'
import { getMaxHp } from './defStore'

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

/**
 * Every tower on the board, in row-major order. A board is meant to hold at
 * most one, but this returns all of them rather than a single `Tile | null` —
 * the callers that care about "is there a second" (`scenario.ts`) and "is
 * there a first" (`sequencer.ts`, `npc.ts`) both read a length or a first
 * element off the same list, rather than each keeping its own scan. Before
 * this existed the engine held that scan three times over (`npc.ts`'s planning
 * context, `isTowerImmune`'s singular phrasing, `bundledMap`'s convention) and
 * never once wrote down that a board has exactly one — see `proposal.md`.
 */
export function towerTiles(cells: Cell[][]): Tile[] {
  const tiles: Tile[] = []
  const rows = gridRows()
  const cols = gridCols()
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'tower') tiles.push({ col: c, row: r })
  return tiles
}

/**
 * Reconcile units in play after their archetype's maximum HP changed.
 *
 * Each affected unit's current HP moves by the same amount its archetype's
 * maximum did, and never falls below 1 — lowering a maximum can wound a unit but
 * must never kill it outright, which would delete a unit as a side effect of a
 * balance edit. `prevMax` carries the maxima as they were before the edit;
 * archetypes absent from it are unchanged and their units are left alone.
 *
 * This lives in the engine because it is a rule, not presentation: hosts that
 * allow live definition edits (the game's unit editor, the harness bench) must
 * not each decide separately what happens to a wounded unit.
 */
export function reconcileHp(
  state: GameState,
  prevMax: Partial<Record<Unit['unitType'], number>>,
): GameState {
  const units = state.units.map((u) => {
    const before = prevMax[u.unitType]
    if (before === undefined) return u
    const delta = getMaxHp(u.unitType) - before
    return delta === 0 ? u : { ...u, hp: Math.max(1, u.hp + delta) }
  })
  return { ...state, units }
}
