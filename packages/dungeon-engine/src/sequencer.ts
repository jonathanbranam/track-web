// The turn sequencer: the engine's ownership of a round.
//
// `computeNpcTurns` / `resolveNpcAction` / `endRound` are the pieces of a
// round; this module is what puts them in order. The round's shape is not
// new — it is already specified by `dungeon-tactics-solo` ("NPC turn executes
// immediately in turn order", "NPC planned attacks resolve after the player
// turn") and already implemented, in each host, differently. This module
// relocates that ordering into the engine so two hosts driving the same board
// cannot disagree about it.
//
// An enemy's turn is planned once: its move executes immediately (so the
// board reflects the new position for whoever is planned next), and its
// attack, if it has one, is locked as a telegraph. Later, locked telegraphs
// resolve in the order they were planned. Turn order is nothing but the order
// enemies were planned in — there is no separate ordering step and no reorder
// operation.
//
// Three sources may plan an enemy, validated identically: the engine's own AI
// for the next unplanned enemy (`advance`, during `npc-move`), the engine's AI
// for one named enemy (`advanceNpc`), and a host-supplied decision
// (`commitNpcTurn`). All three execute the move and lock the telegraph (if
// any) in the same step, and record the enemy in `npcPlannedThisRound` so it
// cannot be planned again by anyone.
//
// `advance` is the single execution entry point once planning is done, and it
// takes no unit id: the plan already fixed the order, so a host can only
// decide *when* the next step happens, never what it is. It also drives the
// `npc-move` phase's planning-by-AI and the phase transitions bracketing both
// phases.
//
// Every operation returns `{ ok: false, reason }` on refusal rather than
// throwing, matching `actions.ts` — see `CommitResult` there. That keeps the
// whole surface testable through one path and matches a game that never
// renders a control for an operation it could not have offered.

import type { GameState, NpcAction, NpcAttackPlan, Tile, TurnPhase, Unit } from './types'
import { resolveNpcAction, endRound, planNpcUnit } from './npc'
import { computeMovePath, unitDisplayName, validMoveDests } from './pc'
import { threatTiles } from './actions'
import { getEngineMode } from './engine-mode'

// ─── The contract ─────────────────────────────────────────────────────────────

export type SequencerResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string }

/** What a host supplies when it, rather than the AI, chooses an enemy's turn.
 *  A destination tile rather than a path — the engine derives and validates
 *  the path itself, the same way `commitAction` does for a PC's move, so a
 *  host never has to reconstruct pathfinding to plan an enemy. */
export type NpcMoveChoice =
  | { kind: 'stay' }
  | { kind: 'move'; toCol: number; toRow: number }

/** What planning or executing one step of the round did, so a query
 *  (`nextAction`) and the operation that performs it (`advance`) can describe
 *  the same thing through the same shape. */
export type SequencerStep =
  | { kind: 'plan-enemy'; unitId: string; action: NpcAction; attackPlan: NpcAttackPlan | null }
  | { kind: 'resolve-telegraph'; unitId: string; attack: NpcAttackPlan }
  | { kind: 'skip-telegraph'; unitId: string; attack: NpcAttackPlan }
  | { kind: 'phase-transition'; from: TurnPhase; to: TurnPhase }

export type AdvanceResult =
  | { ok: true; state: GameState; step: SequencerStep }
  | { ok: false; reason: string }

// ─── Internals ────────────────────────────────────────────────────────────────

function unitLabel(unit: Unit): string {
  return `the ${unitDisplayName(unit)}`
}

/** Whether this enemy has already spent its turn through the action surface —
 *  moved (`movedThisTurn`) or attacked (`attackedThisTurn`) — the mirror of
 *  `npcPlannedThisRound` for the sequencer's own bookkeeping. The two ledgers
 *  answer different questions and neither reads the other on its own, so this
 *  is the cross-check that keeps a hand-driven enemy from also being planned:
 *  see `availableActions` in `actions.ts` for the mirror refusal. */
function spentThroughActionSurface(state: GameState, unitId: string): boolean {
  return (state.movedThisTurn[unitId] ?? 0) > 0 || state.attackedThisTurn.includes(unitId)
}

/** The one place every planning path funnels through, whichever of the three
 *  sources produced the candidate: refuse a unit already planned this round or
 *  already spent through the action surface, otherwise execute the move, lock
 *  the telegraph if there is one, and record the unit as planned. `action` and
 *  `attackPlan` are trusted here — legality is each caller's job, so an
 *  AI-authored candidate (already legal by construction) and a host-authored
 *  one (validated by `commitNpcTurn` before it ever reaches this function) are
 *  applied through the same code. */
function applyNpcPlan(
  state: GameState,
  unitId: string,
  unit: Unit,
  action: NpcAction,
  attackPlan: NpcAttackPlan | null,
): SequencerResult {
  if (state.npcPlannedThisRound.includes(unitId)) {
    return { ok: false, reason: `The ${unitDisplayName(unit)} has already been planned this round.` }
  }
  if (spentThroughActionSurface(state, unitId)) {
    return {
      ok: false,
      reason: `The ${unitDisplayName(unit)}'s turn is already spent — it has already acted this round.`,
    }
  }
  const moved = resolveNpcAction(state, action)
  const withTelegraph = attackPlan ? { ...moved, npcPlans: [...moved.npcPlans, attackPlan] } : moved
  return {
    ok: true,
    state: { ...withTelegraph, npcPlannedThisRound: [...withTelegraph.npcPlannedThisRound, unitId] },
  }
}

// ─── Planning ─────────────────────────────────────────────────────────────────

/** The engine's own AI plans one named enemy: applies its move, locks its
 *  telegraph if it has a target, and records it as planned. */
export function advanceNpc(state: GameState, unitId: string): SequencerResult {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return { ok: false, reason: `There is no unit "${unitId}" on the board.` }
  if (unit.kind !== 'npc') {
    return { ok: false, reason: `"${unitId}" is a player character, not an enemy, and cannot be planned by the AI.` }
  }
  const plan = planNpcUnit(state, unitId)
  if (!plan) return { ok: false, reason: `There is no unit "${unitId}" on the board.` }
  return applyNpcPlan(state, unitId, unit, plan.action, plan.attackPlan)
}

/** A host plans one enemy's turn by hand: a move (a destination tile, or
 *  holding in place) and, optionally, an attack tile. Both are validated from
 *  scratch — the move from the enemy's current position, the attack from
 *  where the move leaves it — exactly as the AI's own choice would be, so a
 *  designer can plan anything legal, including what the AI never would. */
export function commitNpcTurn(
  state: GameState,
  unitId: string,
  move: NpcMoveChoice,
  attackTile?: Tile,
): SequencerResult {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return { ok: false, reason: `There is no unit "${unitId}" on the board.` }
  if (unit.kind !== 'npc') {
    return { ok: false, reason: `"${unitId}" is a player character, not an enemy, and cannot be planned as one.` }
  }
  if (state.npcPlannedThisRound.includes(unitId)) {
    return { ok: false, reason: `The ${unitDisplayName(unit)} has already been planned this round.` }
  }

  let action: NpcAction
  if (move.kind === 'stay') {
    action = { kind: 'stay', unitId }
  } else {
    // The same legal-destination set `commitAction` offers a PC through
    // `availableActions` — membership here is what keeps a host from landing
    // an enemy on an occupied or structure tile, which a bare `computeMovePath`
    // would not catch on its own (its `astar` always exempts the goal tile
    // from blocking, since that is also what lets a PC path onto an empty
    // tile another unit is about to vacate — moot for this single-shot NPC
    // move, but the exemption is unconditional).
    const legal = validMoveDests(state, unitId).some((t) => t.col === move.toCol && t.row === move.toRow)
    if (!legal) {
      return {
        ok: false,
        reason: `(${move.toCol}, ${move.toRow}) is not a legal move for ${unitLabel(unit)} — out of range, blocked, or occupied.`,
      }
    }
    const path = computeMovePath(state, unitId, unit.col, unit.row, move.toCol, move.toRow)
    action = { kind: 'move', unitId, fromCol: unit.col, fromRow: unit.row, toCol: move.toCol, toRow: move.toRow, path }
  }

  let attackPlan: NpcAttackPlan | null = null
  if (attackTile) {
    const postMove = resolveNpcAction(state, action)
    const reachable = threatTiles(postMove, unitId)
    if (!reachable.some((t) => t.col === attackTile.col && t.row === attackTile.row)) {
      return {
        ok: false,
        reason: `(${attackTile.col}, ${attackTile.row}) is not a legal attack target for ${unitLabel(unit)} from its post-move position.`,
      }
    }
    attackPlan = { kind: 'attack', unitId, targetCol: attackTile.col, targetRow: attackTile.row }
  }

  return applyNpcPlan(state, unitId, unit, action, attackPlan)
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Which tiles this enemy could attack **if** it made `move` — the companion
 * query to `commitNpcTurn`, which validates an authored attack from exactly
 * this position.
 *
 * A host planning an enemy's turn picks a destination and then needs to know
 * what that destination puts in reach; `threatTiles` answers only for where the
 * unit stands right now. Without this, a designer authoring a plan would be
 * guessing and reading refusals — the blindness the action surface removed for
 * PCs, where `availableActions` reports every legal target up front.
 *
 * Derived by resolving the move against a copy and asking `threatTiles`, which
 * is the same evaluation `commitNpcTurn` performs before accepting an attack.
 * Deliberately not a separate re-derivation: a query that can disagree with the
 * commit it predicts is the failure mode `preview` was written to avoid.
 */
export function plannableAttacks(state: GameState, unitId: string, move: NpcMoveChoice): Tile[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit || unit.kind !== 'npc') return []

  let action: NpcAction
  if (move.kind === 'stay') {
    action = { kind: 'stay', unitId }
  } else {
    // Same legality gate `commitNpcTurn` applies, so an illegal destination
    // reports nothing rather than targets the commit would never allow.
    if (!validMoveDests(state, unitId).some((t) => t.col === move.toCol && t.row === move.toRow)) return []
    const path = computeMovePath(state, unitId, unit.col, unit.row, move.toCol, move.toRow)
    action = { kind: 'move', unitId, fromCol: unit.col, fromRow: unit.row, toCol: move.toCol, toRow: move.toRow, path }
  }

  return threatTiles(resolveNpcAction(state, action), unitId)
}

/** Living enemies not yet planned this round, in the same order `advance`
 *  would plan them in. Also excludes an enemy already spent through the
 *  action surface — otherwise `advance` would keep offering it as the next
 *  thing to plan and the enemy phase would never reach `player`, turning a
 *  refusal into a hang. */
export function unplannedNpcs(state: GameState): string[] {
  return state.units
    .filter((u) =>
      u.kind === 'npc'
      && !state.npcPlannedThisRound.includes(u.id)
      && !spentThroughActionSurface(state, u.id),
    )
    .map((u) => u.id)
}

/** The telegraph locked for `unitId`, or `null` if it has none (never planned,
 *  planned without an attack, or already gone from the board). */
export function plannedTelegraph(state: GameState, unitId: string): NpcAttackPlan | null {
  return state.npcPlans.find((p) => p.unitId === unitId) ?? null
}

/** What `advance` would do next, without changing anything. During `npc-move`
 *  this is the AI's live suggestion for the next unplanned enemy (a pure
 *  computation, not a stored decision — nothing has been planned yet). During
 *  `npc-attack` this is a read of the next unresolved entry already recorded
 *  in `npcPlans` — never a fresh decision, since the plan was fixed when it
 *  was locked. Outside those two phases there is no round step to report. */
export function nextAction(state: GameState): SequencerStep | null {
  if (state.phase === 'npc-move') {
    const nextId = unplannedNpcs(state)[0]
    if (nextId) {
      const plan = planNpcUnit(state, nextId)
      if (!plan) return null
      return { kind: 'plan-enemy', unitId: nextId, action: plan.action, attackPlan: plan.attackPlan }
    }
    return { kind: 'phase-transition', from: 'npc-move', to: 'player' }
  }

  if (state.phase === 'npc-attack') {
    const entry = state.npcPlans.find((p) => !state.npcPlansResolved.includes(p.unitId))
    if (entry) {
      const alive = state.units.some((u) => u.id === entry.unitId)
      return alive
        ? { kind: 'resolve-telegraph', unitId: entry.unitId, attack: entry }
        : { kind: 'skip-telegraph', unitId: entry.unitId, attack: entry }
    }
    return { kind: 'phase-transition', from: 'npc-attack', to: 'npc-move' }
  }

  return null
}

// ─── Host-triggered transitions ───────────────────────────────────────────────
//
// Two of the round's transitions are not steps of the enemy phase, so `advance`
// cannot reach them: leaving `placement`, and ending the player's turn. Both
// wait on a decision only a host can make — "the board is set", "I am done".
//
// The decision is the host's; what it does to the round is not. Before these
// existed each host performed the transition by writing `state.phase` itself,
// and the two had already drifted: the game cleared the selection, the bench did
// not, and only the bench could refuse. Both are named for the decision rather
// than its destination, so a host never has to reason about which phase comes
// next — that is exactly the reasoning this file exists to hold.

/** Clear whatever the previous phase had selected or armed. A selection is
 *  scoped to the phase it was made in; carrying one across a transition leaves
 *  a host drawing an overlay for a unit that can no longer act. */
function withoutSelection(state: GameState): GameState {
  return { ...state, selectedUnitId: null, planningPhase: 'none' }
}

/** The board is set: leave `placement` and begin the first enemy phase.
 *  Enemies plan against the positions the host settled on, not their default
 *  spawn tiles, because planning reads the board at `advance` time. */
export function startScenario(state: GameState): SequencerResult {
  if (state.phase !== 'placement') {
    return {
      ok: false,
      reason: `The scenario has already started — the round is in the "${state.phase}" phase, not placement.`,
    }
  }
  return { ok: true, state: { ...withoutSelection(state), phase: 'npc-move' } }
}

/** The player is done: leave `player` and resolve the telegraphs locked during
 *  the enemy phase. `advance` deliberately refuses to resolve telegraphs while
 *  the round is still in `player` — ending your turn is a decision, not a rule —
 *  so this is the operation that makes that decision.
 *
 *  The refusal names which enemies still need a plan when the round has not
 *  reached `player` yet. That is a more useful answer than the phase alone, and
 *  the engine is the only party that already knows it.
 *
 *  Those enemies are named by archetype *and* id. Elsewhere the engine names a
 *  unit the way the game does (`unitDisplayName`, i.e. its archetype) and keeps
 *  internal ids out of player-facing text — but `unitDisplayName` cannot tell
 *  two long-range enemies apart, and "the long-range, the long-range" answers
 *  nothing. This is the one refusal whose entire job is to say *which* units, so
 *  it carries the id that identifies them. */
export function endPlayerTurn(state: GameState): SequencerResult {
  if (state.phase !== 'player') {
    const remaining = state.phase === 'npc-move' ? unplannedNpcs(state) : []
    if (remaining.length > 0) {
      const names = remaining
        .map((id) => {
          const unit = state.units.find((u) => u.id === id)
          return unit ? `${unitLabel(unit)} (${id})` : id
        })
        .join(', ')
      return {
        ok: false,
        reason: `The player's turn cannot end yet — ${remaining.length} enemy turn(s) still need a plan: ${names}.`,
      }
    }
    return {
      ok: false,
      reason: `The player's turn cannot end from the "${state.phase}" phase.`,
    }
  }
  return { ok: true, state: { ...withoutSelection(state), phase: 'npc-attack' } }
}

// ─── Execution ────────────────────────────────────────────────────────────────

/** Perform the next step of the round. Takes no unit id: the plan already
 *  fixed the order (during `npc-move`, by whoever planned each enemy; during
 *  `npc-attack`, by the order telegraphs were locked), so a host chooses only
 *  when the next step happens, never what it is. Reuses `nextAction` to decide
 *  what that step is, so the two can never disagree about it. */
export function advance(state: GameState): AdvanceResult {
  const step = nextAction(state)
  if (!step) {
    return {
      ok: false,
      reason: 'The round is not in an enemy phase — there is no enemy step for the engine to advance.',
    }
  }

  switch (step.kind) {
    case 'plan-enemy': {
      const unit = state.units.find((u) => u.id === step.unitId)!
      const applied = applyNpcPlan(state, step.unitId, unit, step.action, step.attackPlan)
      return applied.ok ? { ok: true, state: applied.state, step } : applied
    }

    case 'resolve-telegraph': {
      const resolved = resolveNpcAction(state, {
        kind: 'attack', unitId: step.unitId, targetCol: step.attack.targetCol, targetRow: step.attack.targetRow,
      })
      return {
        ok: true,
        state: { ...resolved, npcPlansResolved: [...state.npcPlansResolved, step.unitId] },
        step,
      }
    }

    case 'skip-telegraph': {
      return {
        ok: true,
        state: { ...state, npcPlansResolved: [...state.npcPlansResolved, step.unitId] },
        step,
      }
    }

    case 'phase-transition': {
      const nextState = step.from === 'npc-move'
        ? { ...state, phase: 'player' as TurnPhase }
        : endRound(state) // npc-attack complete: chain straight into the next round's npc-move.
      return { ok: true, state: nextState, step }
    }
  }
}

// ─── Amendment (bench-only) ────────────────────────────────────────────────────

/** Retarget a locked telegraph after it was planned and before it resolves —
 *  bench-only, since the game must never let a locked telegraph change: that
 *  is the round's core tension. Validated exactly like a fresh attack, from
 *  the enemy's current (post-move, immutable) position; never touches the
 *  enemy's position itself. */
export function amendTelegraph(state: GameState, unitId: string, tile: Tile): SequencerResult {
  if (getEngineMode() !== 'bench') {
    return {
      ok: false,
      reason: 'Amending a telegraph is a bench-only operation and the engine is not in bench mode.',
    }
  }

  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) {
    return { ok: false, reason: `There is no unit "${unitId}" on the board to amend a telegraph for.` }
  }
  if (!state.npcPlannedThisRound.includes(unitId)) {
    return { ok: false, reason: `The ${unitDisplayName(unit)} has not been planned this round and has no telegraph to amend.` }
  }
  if (state.npcPlansResolved.includes(unitId)) {
    return { ok: false, reason: `The ${unitDisplayName(unit)}'s telegraph has already resolved and cannot be amended.` }
  }
  const existingIndex = state.npcPlans.findIndex((p) => p.unitId === unitId)
  if (existingIndex === -1) {
    return { ok: false, reason: `The ${unitDisplayName(unit)} has no locked telegraph to amend.` }
  }

  const reachable = threatTiles(state, unitId)
  if (!reachable.some((t) => t.col === tile.col && t.row === tile.row)) {
    return {
      ok: false,
      reason: `(${tile.col}, ${tile.row}) is not a legal attack target for ${unitLabel(unit)} from where it stands.`,
    }
  }

  const amended: NpcAttackPlan = { kind: 'attack', unitId, targetCol: tile.col, targetRow: tile.row }
  const npcPlans = state.npcPlans.map((p, i) => (i === existingIndex ? amended : p))
  return { ok: true, state: { ...state, npcPlans } }
}
