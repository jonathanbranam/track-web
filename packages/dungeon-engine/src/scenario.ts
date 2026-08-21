// Scenario setup: the bench's counterpart to `initialState()`.
//
// The game never authors a starting position — it loads one, built by
// `initialState()` from the content store, and the player only repositions PCs
// within the spawn zone (`pc.ts`'s `placeUnit`). The design bench needs to
// author one outright: any unit of either side, on any tile, at any starting
// HP, plus structures the game itself never places or moves. Those are engine
// facts — tile occupancy, structure blocking, a fresh unit's starting HP, how a
// unit id is formed — and until this module existed the bench decided them
// itself (`BenchStore`'s `emptyState`, its inline rule checks, its own
// `unitSeq` counter). This is where they live instead.
//
// Every operation here is refused unless the engine is running in bench mode
// (`engine-mode.ts`), and every operation that takes an existing state is
// refused unless that state is in the `placement` phase — a scenario is
// authored before the round starts, and there is no transition back to
// placement once it has (harness `docs/dungeon-harness/harness-rebuild/
// phase-5-correction.md` §8.2, and `sequencer.ts`'s `startScenario`, which is
// the only way out of `placement`). A host that wants to go back edits an
// earlier point on its own timeline, the same way it already does for
// anything else.
//
// Every operation returns a result rather than throwing or silently declining,
// matching `sequencer.ts`'s `SequencerResult` — the shape a host already
// forwards verbatim.

import type { Cell, GameState, NpcType, PcType, Tile, Unit, UnitKind } from './types'
import { getEngineMode } from './engine-mode'
import { getMaxHp } from './defStore'
import { occupiedKey, structureKeys } from './turn'
import { inBounds } from './pathfinding'

// ─── The contract ─────────────────────────────────────────────────────────────

export type ScenarioResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string }

/** `placeUnit`'s own shape: the caller cannot name what it just created (the id
 *  and the resolved HP are the engine's to decide), so it is told the unit
 *  rather than left to diff two unit arrays to find out. */
export type ScenarioPlaceResult =
  | { ok: true; state: GameState; unit: Unit }
  | { ok: false; reason: string }

export type StructureKind = 'power-center' | 'tower'

/** The HP a fresh structure of each kind starts with — the values the bundled
 *  map and the bench's board generator both already use. Exported so a host
 *  that places a structure without an explicit HP, or that wants to show what
 *  one is worth before placing it, reads the number from here rather than
 *  keeping its own copy. */
export const STRUCTURE_HP: Record<StructureKind, number> = {
  'power-center': 3,
  tower: 5,
}

// ─── The fence ────────────────────────────────────────────────────────────────

/**
 * The one check every operation in this file opens with, returning a reason or
 * `null`. Two messages, deliberately different, because they mean different
 * things to a designer: not bench mode is "never" — the game cannot do this at
 * all — while the wrong phase is "not now, step back to setup".
 *
 * `state` is omitted by `newScenario`, which takes no prior state and so has no
 * phase to be in — it checks bench mode only.
 */
function refuseUnlessAuthoring(state?: GameState): string | null {
  if (getEngineMode() !== 'bench') {
    return 'Authoring a scenario is a bench-only operation; this engine is running the game.'
  }
  if (state && state.phase !== 'placement') {
    return `A scenario can only be edited during placement; this round is in the ${state.phase} phase.`
  }
  return null
}

// ─── Unit ids ─────────────────────────────────────────────────────────────────

const PC_TYPES: PcType[] = ['melee', 'ranger', 'magic-user', 'rogue']

function kindOf(unitType: PcType | NpcType): UnitKind {
  return (PC_TYPES as string[]).includes(unitType) ? 'pc' : 'npc'
}

/**
 * `<unitType>-<n>`, where `n` is one more than the highest numeric suffix among
 * **all** units already in the state — not a count, and not per-archetype.
 * Derived from the state itself rather than a host-held counter, so an id
 * cannot collide with a unit the host did not place: one that arrived by
 * stepping back through a timeline, or by loading a saved position whose ids
 * have gaps in them. Kept global across archetypes (rather than per-archetype,
 * which would read slightly better) to match the harness rule this replaces,
 * so existing bench positions and logs keep their current ids.
 */
function nextUnitId(state: GameState, unitType: PcType | NpcType): string {
  let highest = 0
  for (const unit of state.units) {
    const suffix = Number(unit.id.slice(unit.id.lastIndexOf('-') + 1))
    if (Number.isFinite(suffix) && suffix > highest) highest = suffix
  }
  return `${unitType}-${highest + 1}`
}

// ─── Structures ───────────────────────────────────────────────────────────────

/**
 * Copy-on-write over `cells`, matching `damageStructure` in `turn.ts`: replace
 * one cell's structure fields, leaving its terrain and every other cell
 * untouched. `structure: null` clears the cell fully rather than just zeroing
 * its HP, so a removed structure's kind cannot linger on a cell that no longer
 * holds one.
 */
function withStructure(
  cells: Cell[][],
  col: number,
  row: number,
  structure: { kind: StructureKind; hp: number } | null,
): Cell[][] {
  return cells.map((r, ri) =>
    ri !== row ? r : r.map((c, ci) => {
      if (ci !== col) return c
      return structure
        ? { terrain: c.terrain, hasStructure: true, structureHp: structure.hp, structureKind: structure.kind }
        : { terrain: c.terrain, hasStructure: false }
    }),
  )
}

// ─── Scenario creation ────────────────────────────────────────────────────────

/**
 * A fresh authored state from a board's cells: no units, no spawn zones (an
 * authored scenario has no spawn zones — a host places units on any tile
 * directly), and the round in `placement`. This is the bench's counterpart to
 * `initialState()`, and it is the only way a host obtains an authored starting
 * position — nothing else in this package constructs a `GameState` from
 * scratch.
 *
 * Leaves `placement` the same way a loaded starting position does: through
 * `startScenario` in `sequencer.ts`. No new transition exists for it, so an
 * authored scenario and a loaded one enter the round identically.
 */
export function newScenario(cells: Cell[][]): ScenarioResult {
  const reason = refuseUnlessAuthoring()
  if (reason) return { ok: false, reason }
  return {
    ok: true,
    state: {
      cells,
      units: [],
      spawners: [],
      phase: 'placement',
      planningPhase: 'none',
      selectedUnitId: null,
      plans: {},
      planOrder: [],
      npcPlans: [],
      npcPlannedThisRound: [],
      npcPlansResolved: [],
      undoStack: [],
      movedThisTurn: {},
      attackedThisTurn: [],
    },
  }
}

// ─── Units ────────────────────────────────────────────────────────────────────

/**
 * Place a unit of any archetype on any tile — regardless of the game's spawn
 * zones, which exist only for the player's turn-0 repositioning, not for
 * authoring. Refused when the tile is off the board, already holds a unit, or
 * holds a structure. HP defaults to the archetype's current maximum (including
 * any session override in force, since both read through `getMaxHp`).
 */
export function placeUnit(
  state: GameState,
  unitType: PcType | NpcType,
  tile: Tile,
  hp?: number,
): ScenarioPlaceResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  if (!inBounds(tile.col, tile.row)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) is off the board.` }
  }
  const key = `${tile.col},${tile.row}`
  if (occupiedKey(state.units).has(key)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) already holds a unit.` }
  }
  if (structureKeys(state.cells).has(key)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) holds a structure.` }
  }
  const unit: Unit = {
    id: nextUnitId(state, unitType),
    kind: kindOf(unitType),
    col: tile.col,
    row: tile.row,
    unitType,
    hp: hp ?? getMaxHp(unitType),
  }
  return { ok: true, state: { ...state, units: [...state.units, unit] }, unit }
}

export function removeUnit(state: GameState, unitId: string): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  if (!state.units.some((u) => u.id === unitId)) {
    return { ok: false, reason: `There is no unit "${unitId}" on the board.` }
  }
  return { ok: true, state: { ...state, units: state.units.filter((u) => u.id !== unitId) } }
}

/**
 * Move a unit during setup, ignoring its movement range and leaving its turn
 * records untouched — this is placing a piece, not taking a turn. Refused on
 * the same terms as `placeUnit`: off-board, unit-occupied, or structure-held.
 */
export function relocateUnit(state: GameState, unitId: string, tile: Tile): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return { ok: false, reason: `There is no unit "${unitId}" on the board.` }
  if (!inBounds(tile.col, tile.row)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) is off the board.` }
  }
  const key = `${tile.col},${tile.row}`
  if (occupiedKey(state.units.filter((u) => u.id !== unitId)).has(key)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) already holds a unit.` }
  }
  if (structureKeys(state.cells).has(key)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) holds a structure.` }
  }
  const units = state.units.map((u) => (u.id === unitId ? { ...u, col: tile.col, row: tile.row } : u))
  return { ok: true, state: { ...state, units } }
}

/** Refused below 1 — removing the unit is the way to take it off the board, so
 *  this never doubles as a delete. No upper clamp: a unit authored above its
 *  archetype's maximum stays coherent (`reconcileHp` only ever shifts HP by a
 *  definition delta), and "what if this thing had 12 HP" is a legitimate
 *  question to ask on this bench. */
export function setUnitHp(state: GameState, unitId: string, hp: number): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return { ok: false, reason: `There is no unit "${unitId}" on the board.` }
  if (hp < 1) return { ok: false, reason: 'HP must be at least 1 — remove the unit instead.' }
  const units = state.units.map((u) => (u.id === unitId ? { ...u, hp } : u))
  return { ok: true, state: { ...state, units } }
}

export function clearUnits(state: GameState): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  return { ok: true, state: { ...state, units: [] } }
}

// ─── Structures ───────────────────────────────────────────────────────────────

/**
 * Place a structure of `kind` on a tile. Refused when the tile is off the
 * board, already holds a structure, or holds a unit. HP defaults to the kind's
 * `STRUCTURE_HP`.
 */
export function placeStructure(
  state: GameState,
  kind: StructureKind,
  tile: Tile,
  hp?: number,
): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  if (!inBounds(tile.col, tile.row)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) is off the board.` }
  }
  const key = `${tile.col},${tile.row}`
  if (occupiedKey(state.units).has(key)) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) holds a unit.` }
  }
  if (state.cells[tile.row][tile.col].hasStructure) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) already holds a structure.` }
  }
  const cells = withStructure(state.cells, tile.col, tile.row, { kind, hp: hp ?? STRUCTURE_HP[kind] })
  return { ok: true, state: { ...state, cells } }
}

export function removeStructure(state: GameState, tile: Tile): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  if (!inBounds(tile.col, tile.row) || !state.cells[tile.row][tile.col].hasStructure) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) holds no structure.` }
  }
  const cells = withStructure(state.cells, tile.col, tile.row, null)
  return { ok: true, state: { ...state, cells } }
}

/** Move a structure to another tile, preserving its kind and its current HP —
 *  a damaged structure arrives at its destination just as damaged. Refused on
 *  the same terms as `placeStructure` for the destination, and refused when
 *  the origin holds no structure to move. */
export function moveStructure(state: GameState, from: Tile, to: Tile): ScenarioResult {
  const reason = refuseUnlessAuthoring(state)
  if (reason) return { ok: false, reason }
  if (!inBounds(from.col, from.row) || !state.cells[from.row][from.col].hasStructure) {
    return { ok: false, reason: `(${from.col}, ${from.row}) holds no structure.` }
  }
  if (!inBounds(to.col, to.row)) {
    return { ok: false, reason: `(${to.col}, ${to.row}) is off the board.` }
  }
  const toKey = `${to.col},${to.row}`
  if (occupiedKey(state.units).has(toKey)) {
    return { ok: false, reason: `(${to.col}, ${to.row}) holds a unit.` }
  }
  if (state.cells[to.row][to.col].hasStructure) {
    return { ok: false, reason: `(${to.col}, ${to.row}) already holds a structure.` }
  }
  const origin = state.cells[from.row][from.col]
  const kind = origin.structureKind!
  const hp = origin.structureHp!
  const withoutOrigin = withStructure(state.cells, from.col, from.row, null)
  const withDestination = withStructure(withoutOrigin, to.col, to.row, { kind, hp })
  return { ok: true, state: { ...state, cells: withDestination } }
}
