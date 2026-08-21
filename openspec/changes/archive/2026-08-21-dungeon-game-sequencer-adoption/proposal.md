## Why

The engine owns the round. `dungeon-turn-sequencer` moved planning, ordering,
per-enemy accounting and phase transitions into `@repo/dungeon-engine`, and the
harness bench adopted it. The shipped game has not: `DungeonTacticsGame.tsx`
still holds the round structure itself, walking a host-local array of NPC moves
with a continuation-passing recursion driven by animation callbacks, and calling
`resolveNpcAction` directly.

So the round exists twice — once in the engine, once in the game — and the
engine's copy is the one the design bench, the Gherkin scenarios and the
turn-machine work all build on. Every round the game plays through its own copy
is a round that could drift from the one the designer tuned against.

Phase 4 of `harness:docs/dungeon-harness/harness-rebuild/turn-sequencer-plan.md`.
The riskiest of the adoptions, deliberately last, with its shape already proven
by the bench.

## What Changes

- **The game asks the engine what happens next** instead of walking its own
  array. Each step of the enemy phase and the resolution phase comes from the
  engine.
- **Animation stays the host's job.** The game keeps deciding *when* the next
  step happens — it still animates each action and advances on completion. What
  it stops deciding is *what* that step is, or what order steps come in.
- **The round chains through the engine.** Ending a round and starting the next
  enemy phase becomes an engine transition rather than a host-arranged call.
- **No change to how the game plays.** Same round, same order, same telegraph
  window, same animations. This is a relocation of ownership.

Explicitly unchanged: the live definition-edit path (`applyDefChange`) keeps
recomputing affected telegraphs as it does today. That is a definition change
invalidating a derived telegraph, not a person retargeting a locked one — a
different operation from the bench-only amendment, and one both hosts must do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dungeon-tactics-solo`: the NPC-turn and attack-resolution requirements
  currently describe the host sequencing the round. The observable round is
  unchanged; the requirements change to place ownership of order, per-enemy
  accounting and phase transitions in the engine, with the host responsible for
  pacing.

## Impact

- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsGame.tsx` —
  `runNpcMovePhase` and `runNpcAttackPhase` become pacing drivers over the
  engine's step-and-advance; round chaining follows.
- No engine change. `@repo/dungeon-engine` already exports everything needed.
- No change to the Phaser scene's animation API, the HUD, or the Gherkin
  scenarios.
