export const GRID_COLS = 6
export const GRID_ROWS = 6

export type TerrainType = 'plains' | 'forest' | 'water' | 'stone'
export type UnitKind = 'pc' | 'npc'
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Cell {
  terrain: TerrainType
  hasStructure: boolean
}

export interface PcPlan {
  moveTarget?: { col: number; row: number }
  attackDir?: Direction
}

export interface Unit {
  id: string
  kind: UnitKind
  col: number
  row: number
}

export type PlanningPhase = 'none' | 'selecting-move' | 'selecting-attack'
export type TurnPhase = 'player' | 'pc-playback' | 'npc-playback'

export interface GameState {
  cells: Cell[][]
  units: Unit[]
  phase: TurnPhase
  planningPhase: PlanningPhase
  selectedUnitId: string | null
  plans: Record<string, PcPlan>
  planOrder: string[]
}

export type PcAction =
  | { kind: 'move-attack'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; attackDir: Direction }
  | { kind: 'move'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number }
  | { kind: 'attack'; unitId: string; col: number; row: number; attackDir: Direction }
  | { kind: 'stay'; unitId: string }

export type NpcAction =
  | { kind: 'move'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number }
  | { kind: 'attack'; unitId: string; targetCol: number; targetRow: number }
  | { kind: 'exit'; unitId: string; fromCol: number; fromRow: number }
  | { kind: 'stay'; unitId: string }

// Fixed 6×6 map:
//      col 0    col 1    col 2    col 3    col 4    col 5
// row 0: forest  plains   water    stone    water    forest
// row 1: plains  stone    forest   water    stone    plains
// row 2: stone   water    plains   forest   plains   stone
// row 3: water   [S]      stone    forest   [S]      plains
// row 4: plains  forest   water    stone    forest   water
// row 5: forest  stone    plains   water    stone    forest
// NPCs: (0,0) (3,0) (2,1) (5,1)   PCs: (0,5) (5,5)
export const INITIAL_MAP: Cell[][] = [
  [
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'forest', hasStructure: false },
  ],
  [
    { terrain: 'plains', hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
  ],
  [
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
  ],
  [
    { terrain: 'water',  hasStructure: false },
    { terrain: 'plains', hasStructure: true  },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: true  },
    { terrain: 'plains', hasStructure: false },
  ],
  [
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
  ],
  [
    { terrain: 'forest', hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'forest', hasStructure: false },
  ],
]

export function initialState(): GameState {
  return {
    cells: INITIAL_MAP.map((row) => row.map((cell) => ({ ...cell }))),
    units: [
      { id: 'npc-0', kind: 'npc', col: 0, row: 0 },
      { id: 'npc-1', kind: 'npc', col: 3, row: 0 },
      { id: 'npc-2', kind: 'npc', col: 2, row: 1 },
      { id: 'npc-3', kind: 'npc', col: 5, row: 1 },
      { id: 'pc-0',  kind: 'pc',  col: 0, row: 5 },
      { id: 'pc-1',  kind: 'pc',  col: 5, row: 5 },
    ],
    phase: 'player',
    planningPhase: 'none',
    selectedUnitId: null,
    plans: {},
    planOrder: [],
  }
}

// ─── Planning helpers ────────────────────────────────────────────────────────

export function selectUnit(state: GameState, id: string): GameState {
  return { ...state, selectedUnitId: id, planningPhase: 'none' }
}

export function cancelSelection(state: GameState): GameState {
  return { ...state, selectedUnitId: null, planningPhase: 'none' }
}

export function beginPlanMove(state: GameState): GameState {
  return { ...state, planningPhase: 'selecting-move' }
}

export function beginPlanAttack(state: GameState): GameState {
  return { ...state, planningPhase: 'selecting-attack' }
}

export function setPlanMove(state: GameState, unitId: string, col: number, row: number): GameState {
  const existing = state.plans[unitId] ?? {}
  const newPlanOrder = [...state.planOrder.filter((id) => id !== unitId), unitId]
  return {
    ...state,
    plans: { ...state.plans, [unitId]: { ...existing, moveTarget: { col, row } } },
    planOrder: newPlanOrder,
    planningPhase: 'none',
  }
}

export function setPlanAttack(state: GameState, unitId: string, dir: Direction): GameState {
  const existing = state.plans[unitId] ?? {}
  const newPlanOrder = [...state.planOrder.filter((id) => id !== unitId), unitId]
  return {
    ...state,
    plans: { ...state.plans, [unitId]: { ...existing, attackDir: dir } },
    planOrder: newPlanOrder,
    planningPhase: 'none',
  }
}

export function clearPlan(state: GameState, unitId: string): GameState {
  const plans = { ...state.plans }
  delete plans[unitId]
  return {
    ...state,
    plans,
    planOrder: state.planOrder.filter((id) => id !== unitId),
  }
}

export function clearPlanMove(state: GameState, unitId: string): GameState {
  const existing = state.plans[unitId]
  if (!existing?.moveTarget) return { ...state, planningPhase: 'none' }
  const plans = { ...state.plans }
  if (!existing.attackDir) {
    delete plans[unitId]
    return { ...state, plans, planOrder: state.planOrder.filter((id) => id !== unitId), planningPhase: 'none' }
  }
  plans[unitId] = { attackDir: existing.attackDir }
  return { ...state, plans, planningPhase: 'none' }
}

export function clearPlanAttack(state: GameState, unitId: string): GameState {
  const existing = state.plans[unitId]
  if (!existing?.attackDir) return { ...state, planningPhase: 'none' }
  const plans = { ...state.plans }
  if (!existing.moveTarget) {
    delete plans[unitId]
    return { ...state, plans, planOrder: state.planOrder.filter((id) => id !== unitId), planningPhase: 'none' }
  }
  plans[unitId] = { moveTarget: existing.moveTarget }
  return { ...state, plans, planningPhase: 'none' }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
}

function occupiedKey(units: Unit[]): Set<string> {
  return new Set(units.map((u) => `${u.col},${u.row}`))
}

function structureKeys(cells: Cell[][]): Set<string> {
  const keys = new Set<string>()
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (cells[r][c].hasStructure) keys.add(`${c},${r}`)
    }
  }
  return keys
}

export function validMoveDests(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  const occupied = occupiedKey(state.units)
  const structures = structureKeys(state.cells)
  return (Object.values(DIR_OFFSETS) as [number, number][])
    .map(([dc, dr]) => ({ col: unit.col + dc, row: unit.row + dr }))
    .filter(({ col, row }) => inBounds(col, row) && !structures.has(`${col},${row}`) && !occupied.has(`${col},${row}`))
}

export function attackSquares(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  const plan = state.plans[unitId]
  const baseCol = plan?.moveTarget?.col ?? unit.col
  const baseRow = plan?.moveTarget?.row ?? unit.row
  return (Object.values(DIR_OFFSETS) as [number, number][])
    .map(([dc, dr]) => ({ col: baseCol + dc, row: baseRow + dr }))
    .filter(({ col, row }) => inBounds(col, row))
}

// ─── Turn transitions ─────────────────────────────────────────────────────────

export function endPlayerTurn(state: GameState): { state: GameState; actions: PcAction[] } {
  const actions: PcAction[] = []

  for (const unitId of state.planOrder) {
    const unit = state.units.find((u) => u.id === unitId)
    if (!unit || unit.kind !== 'pc') continue
    const plan = state.plans[unitId]
    if (!plan || (!plan.moveTarget && !plan.attackDir)) {
      actions.push({ kind: 'stay', unitId })
      continue
    }
    if (plan.moveTarget && plan.attackDir) {
      actions.push({
        kind: 'move-attack',
        unitId,
        fromCol: unit.col,
        fromRow: unit.row,
        toCol: plan.moveTarget.col,
        toRow: plan.moveTarget.row,
        attackDir: plan.attackDir,
      })
    } else if (plan.moveTarget) {
      actions.push({
        kind: 'move',
        unitId,
        fromCol: unit.col,
        fromRow: unit.row,
        toCol: plan.moveTarget.col,
        toRow: plan.moveTarget.row,
      })
    } else if (plan.attackDir) {
      actions.push({
        kind: 'attack',
        unitId,
        col: unit.col,
        row: unit.row,
        attackDir: plan.attackDir,
      })
    }
  }

  // PCs with no plan get a stay action (not in planOrder)
  for (const unit of state.units.filter((u) => u.kind === 'pc')) {
    if (!state.planOrder.includes(unit.id)) {
      actions.push({ kind: 'stay', unitId: unit.id })
    }
  }

  return { state: { ...state, phase: 'pc-playback' }, actions }
}

export function resolvePcAction(state: GameState, action: PcAction): GameState {
  if (action.kind === 'stay') return state

  let units = [...state.units]
  const structures = structureKeys(state.cells)

  if (action.kind === 'move' || action.kind === 'move-attack') {
    const otherOccupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const destKey = `${action.toCol},${action.toRow}`
    const blocked = otherOccupied.has(destKey) || structures.has(destKey)

    if (!blocked) {
      units = units.map((u) => (u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u))
    }

    if (action.kind === 'move-attack') {
      const mover = units.find((u) => u.id === action.unitId)!
      const [dc, dr] = DIR_OFFSETS[action.attackDir]
      const tc = mover.col + dc
      const tr = mover.row + dr
      units = units.filter((u) => !(u.kind === 'npc' && u.col === tc && u.row === tr))
    }
  } else if (action.kind === 'attack') {
    const unit = units.find((u) => u.id === action.unitId)!
    const [dc, dr] = DIR_OFFSETS[action.attackDir]
    const tc = unit.col + dc
    const tr = unit.row + dr
    units = units.filter((u) => !(u.kind === 'npc' && u.col === tc && u.row === tr))
  }

  return { ...state, units }
}

export function beginNpcPlayback(state: GameState): { state: GameState; actions: NpcAction[] } {
  const actions: NpcAction[] = []
  let working = { ...state, phase: 'npc-playback' as TurnPhase, units: [...state.units] }

  for (const npc of state.units.filter((u) => u.kind === 'npc')) {
    const live = working.units.find((u) => u.id === npc.id)
    if (!live) continue

    if (live.row === GRID_ROWS - 1) {
      actions.push({ kind: 'exit', unitId: live.id, fromCol: live.col, fromRow: live.row })
      working = { ...working, units: working.units.filter((u) => u.id !== live.id) }
      continue
    }

    const downCol = live.col
    const downRow = live.row + 1
    const downOccupant = working.units.find((u) => u.col === downCol && u.row === downRow)
    const downStructure = working.cells[downRow][downCol].hasStructure

    if (!downOccupant && !downStructure) {
      actions.push({ kind: 'move', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: downCol, toRow: downRow })
      working = {
        ...working,
        units: working.units.map((u) => (u.id === live.id ? { ...u, col: downCol, row: downRow } : u)),
      }
      continue
    }

    if (downOccupant?.kind === 'pc') {
      actions.push({ kind: 'attack', unitId: live.id, targetCol: downCol, targetRow: downRow })
      continue
    }

    // Blocked by structure or NPC — try left then right
    let moved = false
    for (const [dc] of [[-1], [1]] as [number][]) {
      const altCol = live.col + dc
      const altRow = live.row
      if (!inBounds(altCol, altRow)) continue
      const altOccupant = working.units.find((u) => u.col === altCol && u.row === altRow)
      const altStructure = working.cells[altRow][altCol].hasStructure
      if (!altOccupant && !altStructure) {
        actions.push({ kind: 'move', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: altCol, toRow: altRow })
        working = {
          ...working,
          units: working.units.map((u) => (u.id === live.id ? { ...u, col: altCol, row: altRow } : u)),
        }
        moved = true
        break
      }
    }
    if (!moved) {
      actions.push({ kind: 'stay', unitId: live.id })
    }
  }

  return { state: working, actions }
}

export function resolveNpcAction(state: GameState, action: NpcAction): GameState {
  let units = [...state.units]
  if (action.kind === 'exit') {
    units = units.filter((u) => u.id !== action.unitId)
  } else if (action.kind === 'move') {
    units = units.map((u) => (u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u))
  }
  return { ...state, units }
}

export function endRound(state: GameState): GameState {
  return {
    ...state,
    phase: 'player',
    planningPhase: 'none',
    selectedUnitId: null,
    plans: {},
    planOrder: [],
  }
}
