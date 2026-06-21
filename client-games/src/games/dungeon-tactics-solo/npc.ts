import type { GameState, Cell, Unit, NpcAction, TurnPhase, PlanningPhase } from './types'
import { GRID_COLS, GRID_ROWS, SPAWNER_POSITIONS, INITIAL_MAP } from './map'
import { inBounds, pathToAdjacentCell } from './pathfinding'
import { occupiedKey, structureKeys, isTowerImmune } from './turn'

// ─── Structure helpers ────────────────────────────────────────────────────────

export function findAdjacentStructure(
  cells: Cell[][],
  col: number,
  row: number,
  towerImmune: boolean,
): { col: number; row: number } | null {
  for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    const nc = col + dc
    const nr = row + dr
    if (!inBounds(nc, nr) || !cells[nr][nc].hasStructure) continue
    if (towerImmune && cells[nr][nc].structureKind === 'tower') continue
    return { col: nc, row: nr }
  }
  return null
}

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

// ─── NPC AI ───────────────────────────────────────────────────────────────────

export function computeNpcPlans(state: GameState): NpcAction[] {
  const actions: NpcAction[] = []
  let workingUnits = [...state.units]
  const cells = state.cells
  const towerImmune = isTowerImmune(cells)

  // Ignore all units for pathfinding; resolve actual occupancy at execution time
  const npcFilter = { ignoreNpcs: true, ignorePcs: true }

  let towerPos: { col: number; row: number } | null = null
  for (let r = 0; r < GRID_ROWS && towerPos === null; r++) {
    for (let c = 0; c < GRID_COLS && towerPos === null; c++) {
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'tower') towerPos = { col: c, row: r }
    }
  }

  for (const npc of state.units.filter((u) => u.kind === 'npc')) {
    const live = workingUnits.find((u) => u.id === npc.id)
    if (!live) continue

    if (live.row === GRID_ROWS - 1) {
      actions.push({ kind: 'exit', unitId: live.id, fromCol: live.col, fromRow: live.row })
      workingUnits = workingUnits.filter((u) => u.id !== live.id)
      continue
    }

    // Highest priority: attack any adjacent attackable structure
    const adjStruct = findAdjacentStructure(cells, live.col, live.row, towerImmune)
    if (adjStruct) {
      actions.push({ kind: 'attack', unitId: live.id, targetCol: adjStruct.col, targetRow: adjStruct.row })
      continue
    }

    // Determine target: tower when open, nearest power-center when tower is immune
    let targetPos: { col: number; row: number } | null = null
    if (!towerImmune && towerPos) {
      targetPos = towerPos
    } else {
      let bestDist = Infinity
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (cells[r][c].hasStructure && cells[r][c].structureKind === 'power-center') {
            const dist = Math.abs(c - live.col) + Math.abs(r - live.row)
            if (dist < bestDist) { bestDist = dist; targetPos = { col: c, row: r } }
          }
        }
      }
    }

    if (!targetPos) {
      actions.push({ kind: 'stay', unitId: live.id })
      continue
    }

    const path = pathToAdjacentCell(cells, workingUnits, live, targetPos, npcFilter, live.id)

    if (path !== null && path.length > 0) {
      const nextStep = path[0]
      const occupant = workingUnits.find((u) => u.id !== live.id && u.col === nextStep.col && u.row === nextStep.row)

      if (occupant?.kind === 'pc') {
        actions.push({ kind: 'attack', unitId: live.id, targetCol: nextStep.col, targetRow: nextStep.row })
        continue
      }

      if (!occupant) {
        const isAdjacentToTarget =
          Math.abs(nextStep.col - targetPos.col) + Math.abs(nextStep.row - targetPos.row) === 1
        if (isAdjacentToTarget) {
          actions.push({ kind: 'move-attack', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: nextStep.col, toRow: nextStep.row, targetCol: targetPos.col, targetRow: targetPos.row })
        } else {
          actions.push({ kind: 'move', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: nextStep.col, toRow: nextStep.row })
        }
        workingUnits = workingUnits.map((u) => u.id === live.id ? { ...u, col: nextStep.col, row: nextStep.row } : u)
        continue
      }
    }

    actions.push({ kind: 'stay', unitId: live.id })
  }

  return actions
}

// ─── State initialization ─────────────────────────────────────────────────────

export function initialState(): GameState {
  const base: Omit<GameState, 'npcPlans'> = {
    cells: INITIAL_MAP.map((row) => row.map((cell) => ({ ...cell }))),
    units: [
      { id: 'npc-0', kind: 'npc', col: 0,  row: 1 },
      { id: 'npc-1', kind: 'npc', col: 4,  row: 0 },
      { id: 'npc-2', kind: 'npc', col: 7,  row: 0 },
      { id: 'npc-3', kind: 'npc', col: 10, row: 0 },
      { id: 'npc-4', kind: 'npc', col: 15, row: 1 },
      { id: 'pc-0',  kind: 'pc',  col: 2,  row: 7 },
      { id: 'pc-1',  kind: 'pc',  col: 6,  row: 7 },
      { id: 'pc-2',  kind: 'pc',  col: 10, row: 7 },
      { id: 'pc-3',  kind: 'pc',  col: 13, row: 7 },
    ],
    spawners: SPAWNER_POSITIONS,
    phase: 'player',
    planningPhase: 'none',
    selectedUnitId: null,
    plans: {},
    planOrder: [],
  }
  return { ...base, npcPlans: computeNpcPlans(base as GameState) }
}

// ─── NPC playback ─────────────────────────────────────────────────────────────

export function beginNpcPlayback(state: GameState): { state: GameState; actions: NpcAction[] } {
  return { state: { ...state, phase: 'npc-playback' }, actions: state.npcPlans }
}

export function resolveNpcAction(state: GameState, action: NpcAction): GameState {
  let units = [...state.units]
  let cells = state.cells

  if (action.kind === 'exit') {
    units = units.filter((u) => u.id !== action.unitId)
  } else if (action.kind === 'move') {
    const occupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const structures = structureKeys(cells)
    const destKey = `${action.toCol},${action.toRow}`
    if (!occupied.has(destKey) && !structures.has(destKey)) {
      units = units.map((u) => u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u)
    }
  } else if (action.kind === 'move-attack') {
    const occupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const structures = structureKeys(cells)
    const destKey = `${action.toCol},${action.toRow}`
    if (!occupied.has(destKey) && !structures.has(destKey)) {
      units = units.map((u) => u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u)
    }
    cells = damageStructure(cells, action.targetCol, action.targetRow)
  } else if (action.kind === 'attack') {
    const pcTarget = units.find((u) => u.kind === 'pc' && u.col === action.targetCol && u.row === action.targetRow)
    if (pcTarget) {
      units = units.filter((u) => u.id !== pcTarget.id)
    } else if (cells[action.targetRow]?.[action.targetCol]?.hasStructure) {
      cells = damageStructure(cells, action.targetCol, action.targetRow)
    }
  }

  return { ...state, units, cells }
}

// ─── Round transition ─────────────────────────────────────────────────────────

export function endRound(state: GameState): GameState {
  const base = {
    ...state,
    phase: 'player' as TurnPhase,
    planningPhase: 'none' as PlanningPhase,
    selectedUnitId: null,
    plans: {},
    planOrder: [],
    npcPlans: [] as NpcAction[],
  }
  return { ...base, npcPlans: computeNpcPlans(base) }
}
