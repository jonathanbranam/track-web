// The action surface: the engine's answer to "what may this unit do, what may
// the player pick, and is the pick legal".
//
// This is the only supported way for a host to act on a unit. Everything a UI
// needs to present an action — whether it is available, why not, which tiles it
// may offer, and how to paint them — comes from `availableActions`; `preview`
// answers what a candidate tile would do; `commitAction` validates and applies.
//
// Two properties are load-bearing:
//
// 1. **Actions commit against a tile, never a direction.** `Direction` is an
//    internal detail of attack resolution and never appears in this surface, so
//    a host cannot build a direction picker for an attack the game targets by
//    tile. (That divergence is what this module exists to make impossible; see
//    the harness repo's docs/dungeon-harness/harness-rebuild/action-surface-plan.md.)
// 2. **Commit re-derives legality; it never trusts the caller.** Before this
//    module, legality was enforced only by which tiles a renderer chose to
//    highlight — `resolvePcAction` and `applyMove` accept almost anything.

import type { Direction, GameState, Tile, Unit, UnitDef } from './types'
import { getDef } from './defStore'
import { attackFootprint } from './attackFootprint'
import { inBounds } from './pathfinding'
import {
  unitDisplayName,
  computeMovePath,
  hasAttacked,
  remainingMove,
  validMoveDests,
  applyMove,
  resolvePcAction,
} from './pc'
import { resolveNpcAction } from './npc'

// ─── The contract ─────────────────────────────────────────────────────────────

/** Closed on purpose: adding an action is a typed change that fails the build at
 *  every site that must handle it. The turn machine's guarded transitions map
 *  onto this same shape. */
export type ActionId = 'move' | 'attack'

/** What the host must collect from the player before it can commit. Only tiles
 *  today; the field exists so a future action needing something else does not
 *  have to change the shape of every call site. */
export type SelectionKind = 'tile'

/** How to paint an action's targets. Presentation-neutral — hosts map these to
 *  their own palettes, so the engine never learns about colours. */
export type OverlayHint = 'reachable' | 'targetable'

export interface ActionOption {
  id: ActionId
  label: string
  available: boolean
  /** Plain English, displayable as-is, present only when unavailable. */
  reason?: string
  selection: SelectionKind
  /** The only tiles a host may offer. Empty when unavailable. */
  targets: Tile[]
  overlay: OverlayHint
}

/** What resolving on a tile would do. A discriminated union from the start: an
 *  attack that applies a status or changes terrain is a different kind, not a
 *  damage entry with a zero in it. */
export type ActionEffect =
  | { kind: 'damage'; tile: Tile; target: string; amount: number; lethal: boolean }
  | { kind: 'damage-structure'; tile: Tile; amount: number; destroys: boolean }

export interface ActionPreview {
  /** Tiles the action resolves against — the attack's footprint, or the move path. */
  affected: Tile[]
  /** Movement this would consume. Zero for attacks. */
  cost: number
  effects: ActionEffect[]
  /** Covers tiles but changes nothing. Advisory: an action that hits nothing is
   *  still legal, because a player may be aiming deliberately and because future
   *  attacks will exist for reasons other than damage. */
  hitsNothing: boolean
}

export type CommitResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string }

// ─── Internals ────────────────────────────────────────────────────────────────

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

// Fixed scan order. A tile covered by two directions' footprints resolves to the
// first match here, so the choice is defined rather than incidental. For today's
// shapes the only overlap is a `plus` whose arms meet, where both directions
// cover the same tiles and the choice is unobservable — but a future shape could
// make it visible, and then this order is the documented answer.
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

function tileKey(t: Tile): string {
  return `${t.col},${t.row}`
}

function dedupe(tiles: Tile[]): Tile[] {
  const seen = new Set<string>()
  const out: Tile[] = []
  for (const t of tiles) {
    const k = tileKey(t)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function unitAt(state: GameState, t: Tile): Unit | undefined {
  return state.units.find((u) => u.col === t.col && u.row === t.row)
}

function blocked(state: GameState, t: Tile): boolean {
  return Boolean(unitAt(state, t)) || Boolean(state.cells[t.row]?.[t.col]?.hasStructure)
}

/**
 * Every tile this unit's attack could land on from `origin`, in any direction.
 *
 * This is the shared derivation behind both an NPC's attack targets and the
 * threat overlay, and it is the reason hosts no longer reconstruct reach from
 * definition fields.
 *
 * `single` and `line` shapes declare `stop_at_first` penetration, so each
 * direction is walked from `minRange` and truncated at the first occupied or
 * structure tile, inclusive — the same walk the NPC scanners perform when they
 * pick a target. A `single` shape resolves on one tile but may *select* anywhere
 * in its band, which is why the band and not the footprint is the honest answer
 * to "what can this unit hit".
 *
 * Fixed-range area shapes (`plus`) are not truncated: blocking is not modelled
 * for an area effect at a fixed centre, matching `attackFootprint`.
 */
function reachableAttackTiles(state: GameState, def: UnitDef, origin: Tile): Tile[] {
  const { shape, penetration } = def.attack.propagation
  const { minRange, maxRange } = def.attack.targeting

  if (shape === 'plus') {
    return dedupe(DIRECTIONS.flatMap((dir) => attackFootprint(def, origin, dir)))
  }

  const tiles: Tile[] = []
  for (const dir of DIRECTIONS) {
    const [dc, dr] = DIR_OFFSETS[dir]
    for (let d = minRange; d <= maxRange; d++) {
      const tile = { col: origin.col + dc * d, row: origin.row + dr * d }
      if (!inBounds(tile.col, tile.row)) break
      tiles.push(tile)
      if (penetration === 'stop_at_first' && blocked(state, tile)) break
    }
  }
  return dedupe(tiles)
}

/** The tiles a PC's attack may be aimed at: the union of its footprints, since a
 *  PC attack resolves over a whole footprint rather than one cell. */
function pcAttackTargets(def: UnitDef, origin: Tile): Tile[] {
  return dedupe(DIRECTIONS.flatMap((dir) => attackFootprint(def, origin, dir)))
}

function attackTargetsFor(state: GameState, unit: Unit): Tile[] {
  const def = getDef(unit.unitType)
  const origin = { col: unit.col, row: unit.row }
  return unit.kind === 'pc' ? pcAttackTargets(def, origin) : reachableAttackTiles(state, def, origin)
}

/**
 * Which direction a PC's attack must be aimed to cover `tile` — membership
 * checked, unlike the host-side derivation this replaces, which assigned a
 * direction from axis alignment alone and so attacked the adjacent tile when the
 * player tapped an out-of-range tile in line with the unit.
 */
function directionForTile(def: UnitDef, origin: Tile, tile: Tile): Direction | null {
  for (const dir of DIRECTIONS) {
    if (attackFootprint(def, origin, dir).some((t) => t.col === tile.col && t.row === tile.row)) {
      return dir
    }
  }
  return null
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Every tile a unit could attack from where it now stands. Exposed so hosts can
 * paint a threat overlay without reconstructing targeting from definition
 * fields — the approximation this replaces understated a ranged enemy's reach
 * because it read the resolution footprint rather than the targeting band.
 */
export function threatTiles(state: GameState, unitId: string): Tile[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  return reachableAttackTiles(state, getDef(unit.unitType), { col: unit.col, row: unit.row })
}

/** Every action this unit could take, available or not. Unavailable actions are
 *  returned with a reason so a host renders a disabled control that explains
 *  itself, rather than each host reinventing the disabled state. */
export function availableActions(state: GameState, unitId: string): ActionOption[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []

  // Reasons are shown to a player as well as to a designer, so they name the
  // unit the way the game does rather than by its internal id.
  const name = unitDisplayName(unit)

  // Two guards ahead of the usual per-action checks, either of which makes
  // every action unavailable outright. Both hold for every host, including
  // the design bench: it plays the same round, in the same order, as the
  // game. The engine mode fences retargeting a locked telegraph and the
  // bench's scenario-authoring surface — a different thing than this — and
  // exempts nobody from either guard below.
  //
  // An enemy has no action surface of its own, in any phase. Its one route
  // into a round is being planned: the seat the game's AI occupies, and the
  // same seat a designer occupies planning one by hand. Checked first because
  // it is true in every phase, where "it is not the player's turn" is only
  // true in some — a designer clicking an enemy during the player phase
  // deserves the reason that tells them what to do instead.
  //
  // The round not being in the player phase blocks everyone else: a unit
  // acts only on its own side's turn.
  const isEnemy = unit.kind === 'npc'
  const outOfPhase = state.phase !== 'player'
  const blockedReason = isEnemy
    ? `The ${name} takes its turn by being planned, not by acting through the action surface.`
    : outOfPhase
      ? `It is not the player's turn, so the ${name} cannot act.`
      : undefined

  const spent = hasAttacked(state, unit.id)
  const left = remainingMove(state, unit)
  const unavailable = blockedReason !== undefined || spent
  const moveTargets = unavailable ? [] : validMoveDests(state, unit.id)
  const attackTargets = unavailable ? [] : attackTargetsFor(state, unit)

  const moveReason = blockedReason ?? (spent
    ? `The ${name} has already attacked this turn and cannot move again.`
    : left <= 0
      ? `The ${name} has no movement left this turn.`
      : moveTargets.length === 0
        ? `The ${name} has nowhere to move — every neighbouring tile is blocked.`
        : undefined)

  const attackReason = blockedReason ?? (spent
    ? `The ${name} has already attacked this turn.`
    : attackTargets.length === 0
      ? `The ${name} has nothing in range.`
      : undefined)

  return [
    {
      id: 'move',
      label: 'Move',
      available: moveReason === undefined,
      ...(moveReason ? { reason: moveReason } : {}),
      selection: 'tile',
      targets: moveReason ? [] : moveTargets,
      overlay: 'reachable',
    },
    {
      id: 'attack',
      label: 'Attack',
      available: attackReason === undefined,
      ...(attackReason ? { reason: attackReason } : {}),
      selection: 'tile',
      targets: attackReason ? [] : attackTargets,
      overlay: 'targetable',
    },
  ]
}

/**
 * What committing `action` against `tile` would do, without changing anything.
 *
 * Effects are read by resolving the action against a copy of the state and
 * diffing, rather than by re-deriving the damage rules. That is deliberate: a
 * hand-written preview is exactly how the game's attack animations drifted from
 * `attackFootprint` and began lying about an edited definition. A preview that
 * cannot disagree with resolution is worth more than one that is faster.
 */
export function preview(
  state: GameState,
  unitId: string,
  action: ActionId,
  tile: Tile,
): ActionPreview | null {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return null

  if (action === 'move') {
    const path = computeMovePath(state, unit.id, unit.col, unit.row, tile.col, tile.row)
    if (path.length === 0) return null
    return { affected: path, cost: path.length, effects: [], hitsNothing: false }
  }

  const def = getDef(unit.unitType)
  const origin = { col: unit.col, row: unit.row }
  let affected: Tile[]
  if (unit.kind === 'pc') {
    const dir = directionForTile(def, origin, tile)
    if (!dir) return null
    affected = attackFootprint(def, origin, dir)
  } else {
    affected = [tile]
  }

  const after = resolveAttack(state, unit, tile)
  if (!after) return null

  const effects = diffEffects(state, after, affected)
  return { affected, cost: 0, effects, hitsNothing: effects.length === 0 }
}

/** What changed between two states, restricted to the tiles an action covered. */
function diffEffects(before: GameState, after: GameState, affected: Tile[]): ActionEffect[] {
  const effects: ActionEffect[] = []
  const survivors = new Map(after.units.map((u) => [u.id, u]))

  for (const tile of affected) {
    const was = unitAt(before, tile)
    if (was) {
      const now = survivors.get(was.id)
      const amount = was.hp - (now?.hp ?? 0)
      if (amount > 0) {
        effects.push({ kind: 'damage', tile, target: was.id, amount, lethal: now === undefined })
      }
      continue
    }
    const beforeHp = before.cells[tile.row]?.[tile.col]?.structureHp ?? 0
    const afterHp = after.cells[tile.row]?.[tile.col]?.structureHp ?? 0
    if (beforeHp > afterHp) {
      effects.push({ kind: 'damage-structure', tile, amount: beforeHp - afterHp, destroys: afterHp <= 0 })
    }
  }
  return effects
}

/**
 * Resolve an attack against `tile`, side-asymmetrically: a PC attack damages
 * NPCs and structures across its whole footprint, an NPC attack damages PCs and
 * structures on the one target cell. That asymmetry is existing engine
 * behaviour; this dispatch preserves it rather than flattening it.
 */
function resolveAttack(state: GameState, unit: Unit, tile: Tile): GameState | null {
  if (unit.kind === 'pc') {
    const dir = directionForTile(getDef(unit.unitType), { col: unit.col, row: unit.row }, tile)
    if (!dir) return null
    return resolvePcAction(state, {
      kind: 'attack', unitId: unit.id, col: unit.col, row: unit.row, attackDir: dir,
    })
  }
  const next = resolveNpcAction(state, {
    kind: 'attack', unitId: unit.id, targetCol: tile.col, targetRow: tile.row,
  })
  // NPC attacks in the game are telegraphs resolved at end of round, so
  // `resolveNpcAction` does not spend the attacker; this marks it spent.
  //
  // `commitAction` no longer reaches here for an enemy — `availableActions`
  // refuses one outright. The one live caller is `preview`, which resolves
  // against a copy and diffs it, so the mark is written to a state nothing
  // keeps. Left in place rather than deleted because `preview`'s whole point
  // is that it cannot disagree with resolution: the day an enemy has a
  // resolution path through here again, a preview that skipped this would
  // start lying about it.
  return next.attackedThisTurn.includes(unit.id)
    ? next
    : { ...next, attackedThisTurn: [...next.attackedThisTurn, unit.id] }
}

// ─── Commit ───────────────────────────────────────────────────────────────────

/**
 * Validate and apply. Re-derives the action's legality from the state rather
 * than trusting that the host offered the right tiles, so a host that renders
 * nothing at all still cannot make an illegal move.
 */
export function commitAction(
  state: GameState,
  unitId: string,
  action: ActionId,
  tile: Tile,
): CommitResult {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return { ok: false, reason: `There is no unit "${unitId}" on the board.` }

  const option = availableActions(state, unitId).find((o) => o.id === action)
  if (!option) return { ok: false, reason: `"${action}" is not an action ${unitId} can take.` }
  if (!option.available) return { ok: false, reason: option.reason ?? `${unitId} cannot ${action} right now.` }

  if (!option.targets.some((t) => t.col === tile.col && t.row === tile.row)) {
    return {
      ok: false,
      reason: `(${tile.col}, ${tile.row}) is not a legal ${action} target for ${unitId}.`,
    }
  }

  if (action === 'move') {
    const path = computeMovePath(state, unit.id, unit.col, unit.row, tile.col, tile.row)
    if (path.length === 0) {
      return { ok: false, reason: `There is no path from (${unit.col}, ${unit.row}) to (${tile.col}, ${tile.row}).` }
    }
    if (path.length > remainingMove(state, unit)) {
      return {
        ok: false,
        reason: `(${tile.col}, ${tile.row}) is ${path.length} tiles away and ${unitId} has ${remainingMove(state, unit)} movement left.`,
      }
    }
    return { ok: true, state: applyMove(state, unit.id, tile.col, tile.row, path) }
  }

  const after = resolveAttack(state, unit, tile)
  if (!after) {
    return { ok: false, reason: `(${tile.col}, ${tile.row}) is not a legal attack target for ${unitId}.` }
  }
  return { ok: true, state: after }
}
