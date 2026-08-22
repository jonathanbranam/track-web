## Why

The engine owns the round and both hosts drive it. What has not happened is the
enforcement: the guards were deliberately held back until both hosts were
phase-aware, because a guard landing before its hosts breaks them. Both have now
adopted, so the holes can close.

1. **`availableActions` never reads `state.phase`.** A host can act with a unit
   out of turn and nothing refuses. The game's HUD prevents it by only offering
   controls during the player phase — legality enforced by what a renderer draws,
   which is the exact pattern `dungeon-tactics-action-surface` exists to end.

2. **The action surface will drive an enemy.** It was built for the player's
   units, but nothing in it says so, and an enemy attack committed through it
   **resolves immediately** — where the game's enemy attack is always a
   telegraph, locked in the enemy's move phase and resolved after the player has
   answered it. So this is not an ordering hole. It is a second, wrong rule for
   how an enemy attacks, reachable by any host that asks.

3. **`resolveNpcAction` is still exported** as the public applier that validates
   nothing about sequencing. No host calls it any more — verified across both
   repos — so it can stop being reachable.

Phase 5, the last, of
`harness:docs/dungeon-harness/harness-rebuild/turn-sequencer-plan.md`, corrected
by `harness:docs/dungeon-harness/harness-rebuild/phase-5-correction.md` §6. It is
what turns the whole effort from convention into enforcement.

## What Changes

- **A unit may only act in the player phase.** `availableActions` reports its
  actions unavailable otherwise, with a reason. **In every host**: the design
  bench plays the same round in the same order as the game, so it is not exempt.
  The engine mode stays what it is — the fence around retargeting a locked
  telegraph, and around the bench's scenario-authoring surface — and does not
  fence this.
- **An enemy has no action surface at all**, in any phase. Its one route into a
  round is being planned, which is where both the game's AI and a designer's hand
  already sit.
- **Planning refuses an enemy already spent through the action surface.** With
  the above, no host can reach that state; the refusal stays as defence-in-depth
  for a host that does not exist yet, not as a fix for a live defect.
- **`resolveNpcAction` becomes package-internal.** `computeNpcTurns` stays
  exported — the game still uses it to re-derive telegraphs when a definition
  changes, which is a different operation.

**BREAKING** for any consumer outside these two repos calling `resolveNpcAction`.
There are none.

## Capabilities

### Modified Capabilities

- `dungeon-tactics-action-surface`: gains turn-phase as something the engine
  validates rather than something it explicitly leaves to hosts, and states that
  the surface is the player's — an enemy is driven by planning or not at all.
- `dungeon-tactics-turn-sequencer`: planning gains the matching refusal for an
  enemy spent through the action surface.

## Impact

- `packages/dungeon-engine/src/actions.ts` — phase and enemy checks in
  `availableActions`; the "deliberately NOT validated: turn phase" note is now
  wrong and goes; the `getEngineMode` import becomes unused.
- `packages/dungeon-engine/src/sequencer.ts` — planning refuses an enemy spent
  through the action surface.
- `packages/dungeon-engine/src/index.ts` — `resolveNpcAction` unexported.
- **Host changes are expected in the harness**, and land as its own change
  (`dungeon-bench-guard-adoption`). The bench relied on both holes: its suites
  act without ever reaching the player phase, and three of its tests drive an
  enemy by hand. The game needs no change — its HUD already offered these
  controls only during the player phase, and only for the player's units.
