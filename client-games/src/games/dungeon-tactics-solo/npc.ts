import type { GameState, Cell, Unit, NpcAction, TurnPhase, PlanningPhase } from './types'
import { gridCols, gridRows, boardCells, enemySpawners, pcStartTiles } from './contentStore'
import { inBounds, pathToAdjacentCell } from './pathfinding'
import { occupiedKey, structureKeys, isTowerImmune, damageStructure } from './turn'
import { moveRange } from './pc'
import { getDef, getMaxHp } from './defStore'

// ─── Ranged-target scanners ───────────────────────────────────────────────────

function findShortRangeTarget(
  npc: Unit,
  units: Unit[],
  cells: Cell[][],
  towerImmune: boolean,
): { col: number; row: number } | null {
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  const { minRange, maxRange } = getDef('short-range').attack.targeting

  // Priority 1: nearest distance (minRange) — PC or attackable structure
  for (const [dc, dr] of dirs) {
    const tc = npc.col + dc * minRange
    const tr = npc.row + dr * minRange
    if (!inBounds(tc, tr)) continue
    const occ = units.find((u) => u.id !== npc.id && u.col === tc && u.row === tr)
    if (occ?.kind === 'pc') return { col: tc, row: tr }
    const cell = cells[tr]?.[tc]
    if (cell?.hasStructure && !(towerImmune && cell.structureKind === 'tower')) return { col: tc, row: tr }
  }

  // Priority 2: distance maxRange if the intervening tiles are clear in that direction
  for (const [dc, dr] of dirs) {
    let blocked = false
    for (let k = minRange; k < maxRange; k++) {
      const ic = npc.col + dc * k
      const ir = npc.row + dr * k
      if (units.find((u) => u.id !== npc.id && u.col === ic && u.row === ir) || cells[ir]?.[ic]?.hasStructure) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    const tc = npc.col + dc * maxRange
    const tr = npc.row + dr * maxRange
    if (!inBounds(tc, tr)) continue
    const occ = units.find((u) => u.id !== npc.id && u.col === tc && u.row === tr)
    if (occ?.kind === 'pc') return { col: tc, row: tr }
    const cell = cells[tr]?.[tc]
    if (cell?.hasStructure && !(towerImmune && cell.structureKind === 'tower')) return { col: tc, row: tr }
  }

  return null
}

function findLongRangeTarget(
  npc: Unit,
  units: Unit[],
  cells: Cell[][],
): { col: number; row: number } | null {
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  const { minRange, maxRange } = getDef('long-range').attack.targeting
  for (const [dc, dr] of dirs) {
    for (let d = minRange; d <= maxRange; d++) {
      const tc = npc.col + dc * d
      const tr = npc.row + dr * d
      if (!inBounds(tc, tr)) break
      const occ = units.find((u) => u.id !== npc.id && u.col === tc && u.row === tr)
      // Passes over NPC allies; stops at PCs or structures
      if (occ?.kind === 'pc') return { col: tc, row: tr }
      if (cells[tr]?.[tc]?.hasStructure) return { col: tc, row: tr }
    }
  }
  return null
}

// Walk up to moveRange(npc) steps along the A* path, stopping at obstacles present at
// planning time. Returns the exact sequence of cells the NPC intends to visit.
function plannedPath(
  npc: Unit,
  path: Array<{ col: number; row: number }>,
  units: Unit[],
  cells: Cell[][],
): Array<{ col: number; row: number }> {
  const budget = moveRange(npc)
  const structs = structureKeys(cells)
  const steps: Array<{ col: number; row: number }> = []
  for (let i = 0; i < Math.min(budget, path.length); i++) {
    const step = path[i]
    if (units.find((u) => u.id !== npc.id && u.col === step.col && u.row === step.row)) break
    if (structs.has(`${step.col},${step.row}`)) break
    steps.push(step)
  }
  return steps
}

// ─── NPC AI ───────────────────────────────────────────────────────────────────

// Plan NPC actions for the player turn.
//
// `replanIds` enables a *granular* re-plan (used when a single archetype's def is
// edited live): only the NPCs whose id is in the set are recomputed; every other
// NPC reuses its existing action from `state.npcPlans` verbatim. Either way the
// unit's (recomputed or reused) destination is threaded into `workingUnits`, so
// later units still path around earlier ones and collision-avoidance holds.
// When `replanIds` is omitted, every NPC is recomputed — byte-identical to the
// original behavior (all current callers rely on this).
export function computeNpcPlans(state: GameState, replanIds?: Set<string>): NpcAction[] {
  const actions: NpcAction[] = []
  let workingUnits = [...state.units]
  const cells = state.cells
  const towerImmune = isTowerImmune(cells)

  const npcFilter = { ignoreNpcs: true, ignorePcs: true }

  // Prior plans indexed by unit id, for the reuse branch of a granular re-plan.
  const priorById = new Map<string, NpcAction>()
  for (const a of state.npcPlans ?? []) priorById.set(a.unitId, a)

  let towerPos: { col: number; row: number } | null = null
  const planCols = gridCols()
  const planRows = gridRows()
  for (let r = 0; r < planRows && towerPos === null; r++) {
    for (let c = 0; c < planCols && towerPos === null; c++) {
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'tower') towerPos = { col: c, row: r }
    }
  }

  for (const npc of state.units.filter((u) => u.kind === 'npc')) {
    const live = workingUnits.find((u) => u.id === npc.id)
    if (!live) continue

    // Granular re-plan: reuse this unit's prior action when it is not being
    // re-planned, threading its destination so later units path around it.
    if (replanIds && !replanIds.has(npc.id)) {
      const prior = priorById.get(npc.id)
      if (prior) {
        actions.push(prior)
        if (prior.kind === 'exit') {
          workingUnits = workingUnits.filter((u) => u.id !== live.id)
        } else if (prior.kind === 'move' || prior.kind === 'move-attack') {
          workingUnits = workingUnits.map((u) => u.id === live.id ? { ...u, col: prior.toCol, row: prior.toRow } : u)
        }
        continue
      }
      // No prior action to reuse (e.g. a freshly-spawned unit) — recompute.
    }

    if (live.row === gridRows() - 1) {
      actions.push({ kind: 'exit', unitId: live.id, fromCol: live.col, fromRow: live.row })
      workingUnits = workingUnits.filter((u) => u.id !== live.id)
      continue
    }

    // Long-range: scan for target at distance >= 2 before any melee logic
    if (live.unitType === 'long-range') {
      const rangedTarget = findLongRangeTarget(live, workingUnits, cells)
      if (rangedTarget) {
        actions.push({ kind: 'attack', unitId: live.id, targetCol: rangedTarget.col, targetRow: rangedTarget.row })
        continue
      }
      // No ranged target — move toward goal (no move-attack for long-range)
      const targetPos = resolveTargetPos(cells, towerImmune, towerPos, live.col, live.row)
      if (!targetPos) { actions.push({ kind: 'stay', unitId: live.id }); continue }
      const path = pathToAdjacentCell(cells, workingUnits, live, targetPos, npcFilter, live.id)
      if (path !== null && path.length > 0) {
        const steps = plannedPath(live, path, workingUnits, cells)
        if (steps.length > 0) {
          const dest = steps[steps.length - 1]
          actions.push({ kind: 'move', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: dest.col, toRow: dest.row, path: steps })
          workingUnits = workingUnits.map((u) => u.id === live.id ? { ...u, col: dest.col, row: dest.row } : u)
          continue
        }
      }
      actions.push({ kind: 'stay', unitId: live.id })
      continue
    }

    // Short-range: check distances 1-2 for attackable targets
    const shortTarget = findShortRangeTarget(live, workingUnits, cells, towerImmune)
    if (shortTarget) {
      actions.push({ kind: 'attack', unitId: live.id, targetCol: shortTarget.col, targetRow: shortTarget.row })
      continue
    }

    // No immediate target — determine movement goal
    const targetPos = resolveTargetPos(cells, towerImmune, towerPos, live.col, live.row)
    if (!targetPos) { actions.push({ kind: 'stay', unitId: live.id }); continue }

    const path = pathToAdjacentCell(cells, workingUnits, live, targetPos, npcFilter, live.id)

    if (path !== null && path.length > 0) {
      const steps = plannedPath(live, path, workingUnits, cells)
      if (steps.length > 0) {
        const dest = steps[steps.length - 1]
        const isAdjacentToTarget =
          Math.abs(dest.col - targetPos.col) + Math.abs(dest.row - targetPos.row) === 1
        if (isAdjacentToTarget) {
          actions.push({ kind: 'move-attack', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: dest.col, toRow: dest.row, path: steps, targetCol: targetPos.col, targetRow: targetPos.row })
        } else {
          actions.push({ kind: 'move', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: dest.col, toRow: dest.row, path: steps })
        }
        workingUnits = workingUnits.map((u) => u.id === live.id ? { ...u, col: dest.col, row: dest.row } : u)
        continue
      }
    }

    actions.push({ kind: 'stay', unitId: live.id })
  }

  return actions
}

function resolveTargetPos(
  cells: Cell[][],
  towerImmune: boolean,
  towerPos: { col: number; row: number } | null,
  fromCol: number,
  fromRow: number,
): { col: number; row: number } | null {
  if (!towerImmune && towerPos) return towerPos
  let best: { col: number; row: number } | null = null
  let bestDist = Infinity
  const rows = gridRows()
  const cols = gridCols()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'power-center') {
        const dist = Math.abs(c - fromCol) + Math.abs(r - fromRow)
        if (dist < bestDist) { bestDist = dist; best = { col: c, row: r } }
      }
    }
  }
  return best
}

// ─── State initialization ─────────────────────────────────────────────────────

export function initialState(): GameState {
  // Board, enemy spawner tiles, and per-archetype PC start tiles come from the
  // loaded content store (the persisted default Map, or the bundled fallback).
  const spawners = enemySpawners()
  const pcStart = pcStartTiles()
  const base: Omit<GameState, 'npcPlans'> = {
    cells: boardCells(),
    // hp is seeded from the (possibly admin-edited) max HP for each archetype so a
    // reset match respects edited values; defaults restore to 3 on reload.
    // NPCs are seeded at the enemy spawner tiles (today's manifest: short-range
    // at the first/middle/last spawners, long-range at the two between).
    units: [
      { id: 'npc-0', kind: 'npc', col: spawners[0].col, row: spawners[0].row, unitType: 'short-range', hp: getMaxHp('short-range') },
      { id: 'npc-1', kind: 'npc', col: spawners[1].col, row: spawners[1].row, unitType: 'long-range',  hp: getMaxHp('long-range') },
      { id: 'npc-2', kind: 'npc', col: spawners[2].col, row: spawners[2].row, unitType: 'short-range', hp: getMaxHp('short-range') },
      { id: 'npc-3', kind: 'npc', col: spawners[3].col, row: spawners[3].row, unitType: 'long-range',  hp: getMaxHp('long-range') },
      { id: 'npc-4', kind: 'npc', col: spawners[4].col, row: spawners[4].row, unitType: 'short-range', hp: getMaxHp('short-range') },
      { id: 'pc-0',  kind: 'pc',  col: pcStart.melee.col,        row: pcStart.melee.row,        unitType: 'melee',       hp: getMaxHp('melee') },
      { id: 'pc-1',  kind: 'pc',  col: pcStart.ranger.col,       row: pcStart.ranger.row,       unitType: 'ranger',      hp: getMaxHp('ranger') },
      { id: 'pc-2',  kind: 'pc',  col: pcStart['magic-user'].col, row: pcStart['magic-user'].row, unitType: 'magic-user',  hp: getMaxHp('magic-user') },
      { id: 'pc-3',  kind: 'pc',  col: pcStart.rogue.col,        row: pcStart.rogue.row,        unitType: 'rogue',       hp: getMaxHp('rogue') },
    ],
    spawners,
    phase: 'placement',
    planningPhase: 'none',
    selectedUnitId: null,
    plans: {},
    planOrder: [],
    undoStack: [],
    movedThisTurn: {},
    attackedThisTurn: [],
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
    const structs = structureKeys(cells)
    let finalCol = action.fromCol
    let finalRow = action.fromRow
    for (const step of action.path) {
      const occupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
      if (occupied.has(`${step.col},${step.row}`) || structs.has(`${step.col},${step.row}`)) break
      finalCol = step.col
      finalRow = step.row
    }
    units = units.map((u) => u.id === action.unitId ? { ...u, col: finalCol, row: finalRow } : u)
  } else if (action.kind === 'move-attack') {
    const structs = structureKeys(cells)
    let finalCol = action.fromCol
    let finalRow = action.fromRow
    for (const step of action.path) {
      const occupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
      if (occupied.has(`${step.col},${step.row}`) || structs.has(`${step.col},${step.row}`)) break
      finalCol = step.col
      finalRow = step.row
    }
    units = units.map((u) => u.id === action.unitId ? { ...u, col: finalCol, row: finalRow } : u)
    cells = damageStructure(cells, action.targetCol, action.targetRow)
  } else if (action.kind === 'attack') {
    const attacker = units.find((u) => u.id === action.unitId)
    const damage = attacker ? getDef(attacker.unitType).attack.damage : 1
    const pcTarget = units.find((u) => u.kind === 'pc' && u.col === action.targetCol && u.row === action.targetRow)
    if (pcTarget) {
      units = units.map((u) => u.id === pcTarget.id ? { ...u, hp: u.hp - damage } : u)
      units = units.filter((u) => u.hp > 0)
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
    undoStack: [],
    movedThisTurn: {},
    attackedThisTurn: [],
  }
  return { ...base, npcPlans: computeNpcPlans(base) }
}
