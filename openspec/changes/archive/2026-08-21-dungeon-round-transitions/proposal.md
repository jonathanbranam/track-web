## Why

The engine owns the round, but not all of it. `advance` performs every phase
transition except two, and those two are performed by each host assigning
`state.phase` directly:

| Transition | Game | Bench |
|---|---|---|
| `placement → npc-move` | `DungeonTacticsGame.tsx:422` | *(bench has no placement phase yet)* |
| `player → npc-attack` | `DungeonTacticsGame.tsx:450` | `BenchStore.endPlayerTurn` |

Both hosts justify this in comments as "ending your turn is a decision, not a
rule". The decision is indeed the host's — but *what a decision does to the
round* is the engine's, and today each host re-implements it.

**They have already drifted.** The game clears `selectedUnitId` and
`planningPhase` on both transitions; the bench clears neither. The refusal has
drifted too: the bench refuses ending the turn outside the player phase and
names the enemies still needing a plan, which is a better message than the game
has, and the game has no refusal at all — `handleConfirmEndTurn` cannot check,
because there is nothing to ask.

This is the divergence the turn sequencer exists to remove, in the last two
places it survives. It is also step 1 of
`harness:docs/dungeon-harness/harness-rebuild/phase-5-correction.md` §9, and a
prerequisite for the bench gaining a real setup phase.

## What Changes

- **`startScenario(state)`** — `placement → npc-move`. Refused outside
  `placement`.
- **`endPlayerTurn(state)`** — `player → npc-attack`. Refused outside `player`,
  and when the round is still in `npc-move` the refusal names the enemies that
  still need a plan.
- **Both clear the selection and any armed action**, which is what the game
  already did and the bench did not.
- Both hosts call them instead of assigning `state.phase`.

No behaviour change to the game: these transitions already happen, at the same
moments, with the same effects. What changes is who performs them.

Type-level enforcement that a host *cannot* write `state.phase` was considered
and is deliberately **not** part of this change — see the correction plan
§8.7.1. It belongs to a holistic pass on `GameState` mutability.

## Capabilities

### Modified Capabilities

- `dungeon-tactics-turn-sequencer`: gains the two round transitions that are not
  steps of the enemy phase, so the engine owns every transition rather than all
  but two.

## Impact

- `packages/dungeon-engine/src/sequencer.ts` — the two functions.
- `packages/dungeon-engine/src/index.ts` — export them.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsGame.tsx` —
  `handlePlacementDone` and `handleConfirmEndTurn` call the engine.
- Harness (sibling repo): `BenchStore.endPlayerTurn` becomes a wrapper. Its
  bespoke refusal moves into the engine, so the game inherits it.
