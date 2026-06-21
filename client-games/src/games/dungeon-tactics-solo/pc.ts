import type { GameState, Direction, PcAction, PcPlan } from './types'
import { GRID_COLS, GRID_ROWS } from './map'
import { inBounds } from './pathfinding'
import { occupiedKey, structureKeys } from './turn'

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
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

export function setPlanMove(state: GameState, unitId: string, col: number, row: number, waypoint?: { col: number; row: number }): GameState {
  const existing = state.plans[unitId] ?? {}
  const newPlanOrder = [...state.planOrder.filter((id) => id !== unitId), unitId]
  return {
    ...state,
    plans: { ...state.plans, [unitId]: { ...existing, moveTarget: { col, row }, moveWaypoint: waypoint } },
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

export function validMoveDests(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  const occupied = occupiedKey(state.units)
  const structures = structureKeys(state.cells)

  // BFS up to 2 orthogonal steps; blockers (units/structures) stop movement through that cell
  const reachable = new Set<string>()
  const visited = new Set<string>([`${unit.col},${unit.row}`])
  const queue: Array<{ col: number; row: number; steps: number }> = [
    { col: unit.col, row: unit.row, steps: 0 },
  ]

  while (queue.length > 0) {
    const { col, row, steps } = queue.shift()!
    if (steps >= 2) continue
    for (const [dc, dr] of Object.values(DIR_OFFSETS) as [number, number][]) {
      const nc = col + dc
      const nr = row + dr
      const key = `${nc},${nr}`
      if (!inBounds(nc, nr) || structures.has(key) || occupied.has(key)) continue
      if (!visited.has(key)) {
        visited.add(key)
        reachable.add(key)
        queue.push({ col: nc, row: nr, steps: steps + 1 })
      }
    }
  }

  return Array.from(reachable).map((key) => {
    const [c, r] = key.split(',').map(Number)
    return { col: c, row: r }
  })
}

export function computeMoveWaypoint(
  state: GameState,
  fromCol: number, fromRow: number,
  toCol: number, toRow: number,
): { col: number; row: number } | undefined {
  const dc = toCol - fromCol
  const dr = toRow - fromRow
  if (Math.abs(dc) + Math.abs(dr) <= 1) return undefined
  if (dc === 0 || dr === 0) {
    return { col: fromCol + Math.sign(dc), row: fromRow + Math.sign(dr) }
  }
  // L-shaped: prefer horizontal-first if that intermediate is unblocked
  const occupied = occupiedKey(state.units)
  const structures = structureKeys(state.cells)
  const hFirst = { col: fromCol + Math.sign(dc), row: fromRow }
  if (!occupied.has(`${hFirst.col},${hFirst.row}`) && !structures.has(`${hFirst.col},${hFirst.row}`)) {
    return hFirst
  }
  return { col: fromCol, row: fromRow + Math.sign(dr) }
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

// ─── Turn resolution ──────────────────────────────────────────────────────────

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
        waypoint: plan.moveWaypoint,
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
        waypoint: plan.moveWaypoint,
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
