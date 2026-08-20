## Why

The engine has the pieces of a round — `computeNpcTurns`, `resolveNpcAction`,
`endRound` — but nothing that puts them in order. That ordering lives in each
host, and there are now two hosts that order them differently: the Phaser game
telegraphs enemy attacks and gives the player a window to react, while the
design bench in the sibling `harness` repo resolves moves and attacks in a
single step.

**The round shape is already specified** — `dungeon-tactics-solo` requires NPCs
processed sequentially with movement applied at decision time, attacks stored as
telegraphs from post-move positions, and resolution only after the player's
turn. What is missing is that the **engine** owns it. Today
`computeNpcTurns` returns `{ moves, attackPlans }` and the host keeps the
movement half in a local variable, so the engine cannot enforce an order it
never sees. `resolveNpcAction` validates movement blocking and nothing about
sequencing — no phase check, no already-planned check. A host can resolve NPCs
in any order, resolve one twice, or resolve an attack during the player phase,
and nothing refuses.

This is the same class of failure `dungeon-tactics-action-surface` fixed one
level down, and the fix has the same shape. It is also the API the turn-machine
work inherits: a machine decides what a unit does on its turn, which is exactly
what the per-unit planner answers.

Phase 2 of `harness:docs/dungeon-harness/harness-rebuild/turn-sequencer-plan.md`.

## What Changes

- **The round moves into the engine**, without changing its shape. `TurnPhase` is
  unchanged; no new phase value.
- **Round progress becomes engine state.** `npcPlannedThisRound` records which
  enemies have had their turn planned (move executed, attack locked);
  `npcPlansResolved` records which telegraphs have resolved. `npcPlans` already
  holds the locked telegraphs in planning order and is unchanged.
- **A per-unit planner** — the AI's decision for one unit, against current
  state. `computeNpcTurns` refolds onto it and keeps its current behaviour.
- **Planning operations** that execute the move and lock the telegraph in one
  step, whoever chose it: the AI for the next unplanned enemy, the AI for one
  named enemy, or a host-supplied decision. All validated identically.
- **One execution entry point**, taking no unit id — the plan fixed the order, so
  a host chooses only *when* the next step happens, never what it is.
- **Query operations** so a host can see what is coming before it happens:
  what the next step will be, which enemies are unplanned, and a unit's locked
  telegraph.
- **An engine mode** (`'game' | 'bench'`, defaulting to `'game'`) gating
  bench-only affordances.
- **Telegraph amendment**, bench-only: changing a locked telegraph mid-round,
  which the game must never do.
- `endRound` stops setting `phase: 'player'` for a host to immediately overwrite
  with `'npc-move'`.

Purely additive. No host is touched, no shipped behaviour changes, and both
hosts keep working on their existing code paths until they adopt this in later
phases.

## Capabilities

### New Capabilities

- `dungeon-tactics-turn-sequencer`: engine ownership of the round — planning an
  enemy's turn, executing planned steps in order, phase transitions, the queries
  that let a host see the next step before it happens, and the engine-mode gate
  for bench-only operations.

### Modified Capabilities

None. `dungeon-tactics-solo`'s NPC-turn requirements describe the round's
observable shape, which does not change here — this change moves ownership of
that shape into the engine without altering it. `dungeon-tactics-action-surface`
gains its phase guard in a later change, once both hosts are phase-aware.

## Impact

- `packages/dungeon-engine/src/types.ts` — two new `GameState` fields.
- `packages/dungeon-engine/src/npc.ts` — per-unit planner extracted;
  `computeNpcTurns` refolded onto it; `endRound` phase fix.
- `packages/dungeon-engine/src/sequencer.ts` (new) — planning, execution, and
  query operations.
- `packages/dungeon-engine/src/engine-mode.ts` (new) — the mode setting.
- `packages/dungeon-engine/src/index.ts` — new exports.
- **Tests must set the engine mode** when exercising bench-only operations,
  since it defaults to `'game'`.
- No host changes: `client-games` and the sibling harness are untouched by this
  change and adopt in later ones.
