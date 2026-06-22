import type { GameState, Direction, PcAction, PcPlan, Unit } from './types'
import { GRID_COLS, GRID_ROWS } from './map'
import { inBounds, astar } from './pathfinding'
import { occupiedKey, structureKeys, damageStructure } from './turn'

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

// ─── Unit stats ───────────────────────────────────────────────────────────────

export function moveRange(unit: Unit): number {
  return unit.unitType === 'melee' || unit.unitType === 'rogue' ? 4 : 3
}

export function attackDamage(unit: Unit): number {
  return unit.unitType === 'melee' ? 2 : 1
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

export function setPlanMove(state: GameState, unitId: string, col: number, row: number, path: Array<{ col: number; row: number }>): GameState {
  const existing = state.plans[unitId] ?? {}
  const newPlanOrder = [...state.planOrder.filter((id) => id !== unitId), unitId]
  return {
    ...state,
    plans: { ...state.plans, [unitId]: { ...existing, moveTarget: { col, row }, movePath: path } },
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
  const limit = moveRange(unit)

  const reachable = new Set<string>()
  const visited = new Set<string>([`${unit.col},${unit.row}`])
  const queue: Array<{ col: number; row: number; steps: number }> = [
    { col: unit.col, row: unit.row, steps: 0 },
  ]

  while (queue.length > 0) {
    const { col, row, steps } = queue.shift()!
    if (steps >= limit) continue
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

export function computeMovePath(
  state: GameState,
  unitId: string,
  fromCol: number, fromRow: number,
  toCol: number, toRow: number,
): Array<{ col: number; row: number }> {
  return astar(state.cells, state.units, { col: fromCol, row: fromRow }, { col: toCol, row: toRow }, {}, unitId) ?? []
}

export function attackSquares(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  const plan = state.plans[unitId]
  const attackDir = plan?.attackDir
  if (!attackDir) return []

  const baseCol = plan?.moveTarget?.col ?? unit.col
  const baseRow = plan?.moveTarget?.row ?? unit.row
  const [dc, dr] = DIR_OFFSETS[attackDir]

  if (unit.unitType === 'melee' || unit.unitType === 'rogue') {
    const nc = baseCol + dc
    const nr = baseRow + dr
    return inBounds(nc, nr) ? [{ col: nc, row: nr }] : []
  }

  if (unit.unitType === 'ranger') {
    const result: { col: number; row: number }[] = []
    for (let d = 2; ; d++) {
      const nc = baseCol + dc * d
      const nr = baseRow + dr * d
      if (!inBounds(nc, nr)) break
      result.push({ col: nc, row: nr })
    }
    return result
  }

  if (unit.unitType === 'magic-user') {
    const cx = baseCol + dc * 2
    const cy = baseRow + dr * 2
    const candidates: [number, number][] = [
      [cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
    ]
    return candidates.filter(([c, r]) => inBounds(c, r)).map(([c, r]) => ({ col: c, row: r }))
  }

  return []
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
        path: plan.movePath ?? [],
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
        path: plan.movePath ?? [],
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
  let cells = state.cells
  const structures = structureKeys(cells)

  const resolveAttack = (attacker: Unit, attackDir: Direction) => {
    const [dc, dr] = DIR_OFFSETS[attackDir]
    const damage = attackDamage(attacker)

    const applyDamageTo = (tc: number, tr: number, dmg: number) => {
      const target = units.find((u) => u.kind === 'npc' && u.col === tc && u.row === tr)
      if (target) {
        units = units.map((u) => u.id === target.id ? { ...u, hp: u.hp - dmg } : u)
      } else if (cells[tr]?.[tc]?.hasStructure) {
        cells = damageStructure(cells, tc, tr)
      }
    }

    if (attacker.unitType === 'melee' || attacker.unitType === 'rogue') {
      const tc = attacker.col + dc
      const tr = attacker.row + dr
      if (inBounds(tc, tr)) applyDamageTo(tc, tr, damage)
    } else if (attacker.unitType === 'ranger') {
      for (let d = 2; ; d++) {
        const tc = attacker.col + dc * d
        const tr = attacker.row + dr * d
        if (!inBounds(tc, tr)) break
        const npcAt = units.find((u) => u.kind === 'npc' && u.col === tc && u.row === tr)
        if (npcAt) { applyDamageTo(tc, tr, damage); break }
        if (cells[tr]?.[tc]?.hasStructure) { applyDamageTo(tc, tr, damage); break }
      }
    } else if (attacker.unitType === 'magic-user') {
      const cx = attacker.col + dc * 2
      const cy = attacker.row + dr * 2
      for (const [tc, tr] of [[cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]] as [number, number][]) {
        if (inBounds(tc, tr)) applyDamageTo(tc, tr, damage)
      }
    }

    units = units.filter((u) => u.hp > 0)
  }

  if (action.kind === 'move' || action.kind === 'move-attack') {
    const otherOccupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const destKey = `${action.toCol},${action.toRow}`
    const blocked = otherOccupied.has(destKey) || structures.has(destKey)

    if (!blocked) {
      units = units.map((u) => (u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u))
    }

    if (action.kind === 'move-attack') {
      const mover = units.find((u) => u.id === action.unitId)!
      resolveAttack(mover, action.attackDir)
    }
  } else if (action.kind === 'attack') {
    const unit = units.find((u) => u.id === action.unitId)!
    resolveAttack(unit, action.attackDir)
  }

  return { ...state, units, cells }
}
