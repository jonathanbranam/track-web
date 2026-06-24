import type { GameState, Direction, PcAction, PcPlan, Unit, UndoRecord } from './types'
import { GRID_COLS, GRID_ROWS, spawnZoneTiles } from './map'
import { inBounds, astar } from './pathfinding'
import { occupiedKey, structureKeys, damageStructure } from './turn'
import { getDef, getMoveRange } from './defStore'
import { attackFootprint } from './attackFootprint'

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

// ─── Unit stats ───────────────────────────────────────────────────────────────

// Delegates to the loaded in-memory def store so edits take effect for every
// caller (validMoveDests, remainingMove, NPC planning, the popup) without any
// signature changes.
export function moveRange(unit: Unit): number {
  return getMoveRange(unit.unitType)
}

export function attackDamage(unit: Unit): number {
  return getDef(unit.unitType).attack.damage
}

// Display name for a unit in the info popup. NPCs surface their unit type
// (e.g. `short-range`) as their name.
export function unitDisplayName(unit: Unit): string {
  return unit.unitType
}

// ─── Planning helpers ────────────────────────────────────────────────────────

export function selectUnit(state: GameState, id: string): GameState {
  // PCs land directly in move-selection so walk tiles show on select; NPCs — and
  // PCs that have already attacked (locked for the turn) — are info-only (no
  // planning phase, so no walk/attack overlays or Attack toggle are drawn).
  const unit = state.units.find((u) => u.id === id)
  const planningPhase = unit?.kind === 'pc' && !hasAttacked(state, id) ? 'selecting-move' : 'none'
  return { ...state, selectedUnitId: id, planningPhase }
}

export function cancelSelection(state: GameState): GameState {
  return { ...state, selectedUnitId: null, planningPhase: 'none' }
}

// ─── Turn-0 placement ──────────────────────────────────────────────────────────

// Select a PC during the placement phase: it becomes selected (opening the info
// dialog) but enters no planning phase, so no walk/attack overlays are drawn and
// the dialog stays a pure info view while the player repositions units.
export function selectForPlacement(state: GameState, id: string): GameState {
  return { ...state, selectedUnitId: id, planningPhase: 'none' }
}

// Relocate a unit to (col,row) during placement. The move only takes effect when
// the target is a valid spawn-zone tile, holds no structure, and is unoccupied;
// any other target leaves the state unchanged so the player can keep trying.
export function placeUnit(state: GameState, id: string, col: number, row: number): GameState {
  const unit = state.units.find((u) => u.id === id)
  if (!unit || unit.kind !== 'pc') return state
  const key = `${col},${row}`
  if (!spawnZoneTiles().has(key)) return state
  if (state.cells[row]?.[col]?.hasStructure) return state
  if (occupiedKey(state.units).has(key)) return state
  const units = state.units.map((u) => (u.id === id ? { ...u, col, row } : u))
  return { ...state, units }
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

// ─── Undo stack & immediate moves ──────────────────────────────────────────────

// Tiles a unit may still step this turn: its archetype range minus what it has
// already moved. A PC that has attacked is locked (no remaining movement).
export function remainingMove(state: GameState, unit: Unit): number {
  if (hasAttacked(state, unit.id)) return 0
  return moveRange(unit) - (state.movedThisTurn[unit.id] ?? 0)
}

// Whether a PC has attacked this turn. Attacks are committal: an attacked PC can
// neither move nor attack again until the round ends.
export function hasAttacked(state: GameState, unitId: string): boolean {
  return state.attackedThisTurn.includes(unitId)
}

export function pushUndo(state: GameState, record: UndoRecord): GameState {
  return { ...state, undoStack: [...state.undoStack, record] }
}

export function clearUndo(state: GameState): GameState {
  if (state.undoStack.length === 0) return state
  return { ...state, undoStack: [] }
}

// Commit a PC move immediately: update the unit's position, charge the tiles
// moved against its turn budget, and push a reversible record onto the undo
// stack. Mutates only `units`, `undoStack`, and `movedThisTurn` so that
// undoLastMove(applyMove(s, …)) round-trips back to `s`.
export function applyMove(
  state: GameState,
  unitId: string,
  toCol: number, toRow: number,
  path: Array<{ col: number; row: number }>,
): GameState {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return state
  const record: UndoRecord = { unitId, fromCol: unit.col, fromRow: unit.row, toCol, toRow, path }
  const units = state.units.map((u) => (u.id === unitId ? { ...u, col: toCol, row: toRow } : u))
  const movedThisTurn = {
    ...state.movedThisTurn,
    [unitId]: (state.movedThisTurn[unitId] ?? 0) + path.length,
  }
  return pushUndo({ ...state, units, movedThisTurn }, record)
}

// Pop the most recent move, restore the affected unit to its origin, and refund
// the tiles it spent back into its turn budget. A no-op on an empty stack.
export function undoLastMove(state: GameState): GameState {
  if (state.undoStack.length === 0) return state
  const record = state.undoStack[state.undoStack.length - 1]
  const units = state.units.map((u) =>
    u.id === record.unitId ? { ...u, col: record.fromCol, row: record.fromRow } : u,
  )
  const movedThisTurn = { ...state.movedThisTurn }
  const refunded = (movedThisTurn[record.unitId] ?? 0) - record.path.length
  if (refunded > 0) movedThisTurn[record.unitId] = refunded
  else delete movedThisTurn[record.unitId]
  return { ...state, units, movedThisTurn, undoStack: state.undoStack.slice(0, -1) }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function validMoveDests(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  // Only the movement still left this turn is reachable (zero once a PC has used
  // its full range or has attacked), so repeated moves can't exceed the range.
  const limit = remainingMove(state, unit)
  if (limit <= 0) return []
  const occupied = occupiedKey(state.units)
  const structures = structureKeys(state.cells)

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

  return attackFootprint(getDef(unit.unitType), { col: baseCol, row: baseRow }, attackDir)
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
    const def = getDef(attacker.unitType)
    const damage = attackDamage(attacker)
    const { penetration } = def.attack.propagation
    const tiles = attackFootprint(def, { col: attacker.col, row: attacker.row }, attackDir)

    const applyDamageTo = (tc: number, tr: number, dmg: number) => {
      const target = units.find((u) => u.kind === 'npc' && u.col === tc && u.row === tr)
      if (target) {
        units = units.map((u) => u.id === target.id ? { ...u, hp: u.hp - dmg } : u)
      } else if (cells[tr]?.[tc]?.hasStructure) {
        cells = damageStructure(cells, tc, tr)
      }
    }

    // `stop_at_first` (ranger line): damage the nearest occupied/structure tile
    // and stop. `none` (melee single, magic-user plus): damage every footprint
    // tile. Footprint tiles are board-clipped and ordered by distance already.
    for (const { col: tc, row: tr } of tiles) {
      if (penetration === 'stop_at_first') {
        const hit = units.some((u) => u.kind === 'npc' && u.col === tc && u.row === tr) || cells[tr]?.[tc]?.hasStructure
        if (hit) { applyDamageTo(tc, tr, damage); break }
      } else {
        applyDamageTo(tc, tr, damage)
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

  // Attacks are committal: resolving one clears the undo stack (so prior moves can
  // no longer be undone) and locks the attacker for the rest of the turn — it can
  // neither move nor attack again. endRound clears both.
  const attacked = action.kind === 'attack' || action.kind === 'move-attack'
  const undoStack = attacked ? [] : state.undoStack
  const attackedThisTurn =
    attacked && !state.attackedThisTurn.includes(action.unitId)
      ? [...state.attackedThisTurn, action.unitId]
      : state.attackedThisTurn
  return { ...state, units, cells, undoStack, attackedThisTurn }
}
