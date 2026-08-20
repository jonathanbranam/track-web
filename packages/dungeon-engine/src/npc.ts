import type { GameState, Cell, Unit, NpcAction, NpcAttackPlan, TurnPhase, PlanningPhase, PathFilter } from './types'
import { gridCols, gridRows, boardCells, enemySpawners, playerStartTiles } from './contentStore'
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

// The telegraphed attack an NPC would make from a given position, or null if it
// has no target in range. Each archetype uses its own scan: long-range looks
// outward at distance ≥ 2, short-range checks the near band (which finds the
// structure/PC a melee NPC has just moved adjacent to). Used both to store an
// NPC's attack after it moves and to recompute telegraphs on a live def edit.
function computeAttackPlan(
  npc: Unit,
  units: Unit[],
  cells: Cell[][],
  towerImmune: boolean,
): NpcAttackPlan | null {
  const target = npc.unitType === 'long-range'
    ? findLongRangeTarget(npc, units, cells)
    : findShortRangeTarget(npc, units, cells, towerImmune)
  return target ? { kind: 'attack', unitId: npc.id, targetCol: target.col, targetRow: target.row } : null
}

// ─── The per-unit planner ──────────────────────────────────────────────────────
//
// The shared setup `computeNpcTurns` needs once per call, not once per unit:
// whether the board's tower is immune (two-or-more power centres standing) and
// where the tower is, if anywhere. Lifted out of the loop so `planOneNpc` takes
// it as a plain value rather than recomputing it per unit.
interface NpcPlanContext {
  towerImmune: boolean
  towerPos: { col: number; row: number } | null
}

function buildNpcPlanContext(cells: Cell[][]): NpcPlanContext {
  const towerImmune = isTowerImmune(cells)
  let towerPos: { col: number; row: number } | null = null
  const planCols = gridCols()
  const planRows = gridRows()
  for (let r = 0; r < planRows && towerPos === null; r++) {
    for (let c = 0; c < planCols && towerPos === null; c++) {
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'tower') towerPos = { col: c, row: r }
    }
  }
  return { towerImmune, towerPos }
}

// NPC pathfinding ignores where other NPCs/PCs currently stand — `plannedPath`
// below is what actually keeps a planned path off an occupied tile, walking it
// step by step against the live `units` list at planning time. See its comment.
const NPC_PATH_FILTER: PathFilter = { ignoreNpcs: true, ignorePcs: true }

// The AI's decision for one NPC, planned against `units` — the board as it
// currently stands for planning purposes. Pure: computes but never mutates or
// pushes anywhere. This is the loop body `computeNpcTurns` has always run, one
// unit at a time; extracted so `planNpcUnit` below (a single unit, against
// live `state`) and `computeNpcTurns` (the whole side, against a threaded
// `workingUnits` copy) share it rather than each having their own copy of the
// archetype logic.
function planOneNpc(
  npc: Unit,
  units: Unit[],
  cells: Cell[][],
  ctx: NpcPlanContext,
): { action: NpcAction; attackPlan: NpcAttackPlan | null } {
  const { towerImmune, towerPos } = ctx

  if (npc.row === gridRows() - 1) {
    return { action: { kind: 'exit', unitId: npc.id, fromCol: npc.col, fromRow: npc.row }, attackPlan: null }
  }

  // Long-range: scan for target at distance >= 2 before any melee logic. A
  // ranged target means a stationary attack — the NPC stays put and telegraphs.
  if (npc.unitType === 'long-range') {
    const rangedTarget = findLongRangeTarget(npc, units, cells)
    if (rangedTarget) {
      return {
        action: { kind: 'stay', unitId: npc.id },
        attackPlan: { kind: 'attack', unitId: npc.id, targetCol: rangedTarget.col, targetRow: rangedTarget.row },
      }
    }
    // No ranged target — move toward goal (no attack for a long-range that moves).
    const targetPos = resolveTargetPos(cells, towerImmune, towerPos, npc.col, npc.row)
    if (!targetPos) return { action: { kind: 'stay', unitId: npc.id }, attackPlan: null }
    const path = pathToAdjacentCell(cells, units, npc, targetPos, NPC_PATH_FILTER, npc.id)
    if (path !== null && path.length > 0) {
      const steps = plannedPath(npc, path, units, cells)
      if (steps.length > 0) {
        const dest = steps[steps.length - 1]
        return {
          action: {
            kind: 'move', unitId: npc.id,
            fromCol: npc.col, fromRow: npc.row, toCol: dest.col, toRow: dest.row, path: steps,
          },
          attackPlan: null,
        }
      }
    }
    return { action: { kind: 'stay', unitId: npc.id }, attackPlan: null }
  }

  // Short-range: a target in the near band means a stationary attack.
  const shortTarget = findShortRangeTarget(npc, units, cells, towerImmune)
  if (shortTarget) {
    return {
      action: { kind: 'stay', unitId: npc.id },
      attackPlan: { kind: 'attack', unitId: npc.id, targetCol: shortTarget.col, targetRow: shortTarget.row },
    }
  }

  // No immediate target — move toward goal. If the move lands adjacent to the
  // goal structure, telegraph an attack on it from the destination.
  const targetPos = resolveTargetPos(cells, towerImmune, towerPos, npc.col, npc.row)
  if (!targetPos) return { action: { kind: 'stay', unitId: npc.id }, attackPlan: null }

  const path = pathToAdjacentCell(cells, units, npc, targetPos, NPC_PATH_FILTER, npc.id)
  if (path !== null && path.length > 0) {
    const steps = plannedPath(npc, path, units, cells)
    if (steps.length > 0) {
      const dest = steps[steps.length - 1]
      const isAdjacentToTarget =
        Math.abs(dest.col - targetPos.col) + Math.abs(dest.row - targetPos.row) === 1
      return {
        action: {
          kind: 'move', unitId: npc.id,
          fromCol: npc.col, fromRow: npc.row, toCol: dest.col, toRow: dest.row, path: steps,
        },
        attackPlan: isAdjacentToTarget
          ? { kind: 'attack', unitId: npc.id, targetCol: targetPos.col, targetRow: targetPos.row }
          : null,
      }
    }
  }

  return { action: { kind: 'stay', unitId: npc.id }, attackPlan: null }
}

// The AI's decision for one enemy, against **current** `state` — a pure query,
// no mutation. Planning against current state (rather than some earlier
// snapshot) is what makes mixed authorship compose: an enemy planned after
// another, whoever authored that other one, sees where it now stands, because
// the sequencer executes each plan's movement immediately. Returns `null` for
// a unit that is missing or not an NPC.
export function planNpcUnit(
  state: GameState,
  unitId: string,
): { action: NpcAction; attackPlan: NpcAttackPlan | null } | null {
  const npc = state.units.find((u) => u.id === unitId)
  if (!npc || npc.kind !== 'npc') return null
  const ctx = buildNpcPlanContext(state.cells)
  return planOneNpc(npc, state.units, state.cells, ctx)
}

// Compute the NPC turn for the current round, split into the movement to execute
// now and the attack telegraphs to store for the player's confirm.
//
// Full mode (`replanIds` omitted): every NPC is planned in turn order. Each plans
// its move against the board reflecting prior NPCs' already-chosen destinations
// (`workingUnits`), so collision-avoidance holds even though all moves are
// computed up front — because no PC moves during the NPC phase, this is identical
// to interleaving compute-then-animate per NPC. A unit that closes to contact
// emits a `move` plus a separate attack telegraph computed from its destination.
// Refolded onto `planOneNpc` above: the per-unit logic is unchanged, only
// pulled out of this loop body.
//
// Attack-only mode (`replanIds` provided): used when an archetype's def is edited
// live during the player turn. Movement for the round has already executed and is
// immutable, so no moves are returned; only the attack telegraphs are refreshed.
// NPCs in the set are recomputed from their current (post-move) cell; the rest
// reuse their existing telegraph from `state.npcPlans`.
export function computeNpcTurns(
  state: GameState,
  replanIds?: Set<string>,
): { moves: NpcAction[]; attackPlans: NpcAttackPlan[] } {
  const cells = state.cells
  const towerImmune = isTowerImmune(cells)

  if (replanIds) {
    const priorById = new Map<string, NpcAttackPlan>()
    for (const p of state.npcPlans ?? []) priorById.set(p.unitId, p)
    const attackPlans: NpcAttackPlan[] = []
    for (const npc of state.units.filter((u) => u.kind === 'npc')) {
      if (replanIds.has(npc.id)) {
        const plan = computeAttackPlan(npc, state.units, cells, towerImmune)
        if (plan) attackPlans.push(plan)
      } else {
        const prior = priorById.get(npc.id)
        if (prior) attackPlans.push(prior)
      }
    }
    return { moves: [], attackPlans }
  }

  const moves: NpcAction[] = []
  const attackPlans: NpcAttackPlan[] = []
  let workingUnits = [...state.units]
  const ctx = buildNpcPlanContext(cells)

  for (const npc of state.units.filter((u) => u.kind === 'npc')) {
    const live = workingUnits.find((u) => u.id === npc.id)
    if (!live) continue

    const { action, attackPlan } = planOneNpc(live, workingUnits, cells, ctx)
    moves.push(action)
    if (attackPlan) attackPlans.push(attackPlan)

    if (action.kind === 'exit') {
      workingUnits = workingUnits.filter((u) => u.id !== live.id)
    } else if (action.kind === 'move') {
      workingUnits = workingUnits.map((u) => u.id === live.id ? { ...u, col: action.toCol, row: action.toRow } : u)
    }
  }

  return { moves, attackPlans }
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

// The fixed party size. The four PCs (melee, ranger, magic-user, rogue) are seated
// from the player spawn zone by `initialState` below, so a valid map's
// `playerSpawnZone` must hold strictly more tiles than this — which is why the
// map editor validates against it too. Mirrors the server's player-unit count
// check in `src/games/dungeon-tactics/map.ts`.
export const PC_COUNT = 4

export function initialState(): GameState {
  // Board and enemy spawner tiles come from the loaded content store (the
  // persisted default Map, or the bundled fallback). PC placement is derived from
  // the player spawn zone: the four PCs are seated on the first four zone tiles in
  // a stable order (row, then col). The exact tiles carry no gameplay weight —
  // play opens in the `placement` phase where the player repositions PCs freely
  // within the zone — they only need to be distinct, in-zone, and deterministic.
  const spawners = enemySpawners()
  const pcStart = playerStartTiles()
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
      { id: 'pc-0',  kind: 'pc',  col: pcStart[0].col, row: pcStart[0].row, unitType: 'melee',       hp: getMaxHp('melee') },
      { id: 'pc-1',  kind: 'pc',  col: pcStart[1].col, row: pcStart[1].row, unitType: 'ranger',      hp: getMaxHp('ranger') },
      { id: 'pc-2',  kind: 'pc',  col: pcStart[2].col, row: pcStart[2].row, unitType: 'magic-user',  hp: getMaxHp('magic-user') },
      { id: 'pc-3',  kind: 'pc',  col: pcStart[3].col, row: pcStart[3].row, unitType: 'rogue',       hp: getMaxHp('rogue') },
    ],
    spawners,
    phase: 'placement',
    planningPhase: 'none',
    selectedUnitId: null,
    plans: {},
    planOrder: [],
    npcPlannedThisRound: [],
    npcPlansResolved: [],
    undoStack: [],
    movedThisTurn: {},
    attackedThisTurn: [],
  }
  // Start with no attack telegraphs — round-1 NPC movement runs on Start, which
  // computes the first round's moves and telegraphs via the `npc-move` phase.
  return { ...base, npcPlans: [] }
}

// ─── NPC action resolution ────────────────────────────────────────────────────

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
  // Reset per-round state with no telegraphs, and move directly into the next
  // round's `npc-move` phase — not into `player`. The old `phase: 'player'`
  // here was never observed: every caller immediately overwrote it starting
  // the next round's NPC movement. Setting it correctly here means a host
  // driving the sequencer's `advance` (rather than computing `npc-move` itself)
  // sees the right phase without that overwrite. The next round's movement and
  // attack telegraphs are computed by the `npc-move` phase the caller chains
  // into; they are NOT pre-computed here.
  return {
    ...state,
    phase: 'npc-move' as TurnPhase,
    planningPhase: 'none' as PlanningPhase,
    selectedUnitId: null,
    plans: {},
    planOrder: [],
    npcPlans: [],
    npcPlannedThisRound: [],
    npcPlansResolved: [],
    undoStack: [],
    movedThisTurn: {},
    attackedThisTurn: [],
  }
}
