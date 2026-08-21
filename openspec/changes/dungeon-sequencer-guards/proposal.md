## Why

The engine owns the round and both hosts drive it. What has not happened is the
enforcement: the guards were deliberately held back until both hosts were
phase-aware, because a guard landing before its hosts breaks them. Both have now
adopted, so the holes can close.

Three remain, and the middle one is a live defect rather than tidying:

1. **`availableActions` never reads `state.phase`.** A host can act with a unit
   out of turn and nothing refuses. The game's HUD prevents it by only offering
   controls during the player phase — legality enforced by what a renderer draws,
   which is the exact pattern `dungeon-tactics-action-surface` exists to end.

2. **An NPC can act twice in a round.** The action surface tracks
   `movedThisTurn`/`attackedThisTurn`; the sequencer tracks
   `npcPlannedThisRound`. Neither reads the other. So driving an enemy by hand
   and then planning it — both supported in the bench — spends it twice.
   `dungeon-turn-sequencer` closed this within the sequencer's own paths and said
   so explicitly; this closes it across both.

3. **`resolveNpcAction` is still exported** as the public applier that validates
   nothing about sequencing. No host calls it any more — verified across both
   repos — so it can stop being reachable.

Phase 5, the last, of
`harness:docs/dungeon-harness/harness-rebuild/turn-sequencer-plan.md`. It is what
turns the whole effort from convention into enforcement.

## What Changes

- **A unit may only act in the player phase — in the game.** `availableActions`
  reports its actions unavailable otherwise, with a reason.
- **That restriction is lifted in bench mode**, because driving both sides out of
  sequence is a spec'd bench capability, not an accident. The engine mode that
  already fences the telegraph amendment fences this too.
- **The two per-round ledgers cross-check.** An enemy that has acted through the
  action surface cannot then be planned, and one that has been planned cannot
  then act through the action surface. Either way it is spent for the round.
- **`resolveNpcAction` becomes package-internal.** `computeNpcTurns` stays
  exported — the game still uses it to re-derive telegraphs when a definition
  changes, which is a different operation.

**BREAKING** for any consumer outside these two repos calling `resolveNpcAction`.
There are none.

## Capabilities

### Modified Capabilities

- `dungeon-tactics-action-surface`: gains turn-phase as something the engine
  validates rather than something it explicitly leaves to hosts, and gains the
  cross-check that stops an enemy acting twice by two different routes.
- `dungeon-tactics-turn-sequencer`: planning gains the matching refusal for an
  enemy already spent through the action surface.

## Impact

- `packages/dungeon-engine/src/actions.ts` — phase and already-planned checks in
  `availableActions`; the "deliberately NOT validated: turn phase" note is now
  wrong and goes.
- `packages/dungeon-engine/src/sequencer.ts` — planning refuses an enemy already
  spent through the action surface.
- `packages/dungeon-engine/src/index.ts` — `resolveNpcAction` unexported.
- No host changes expected in either repo. If a host needs one, that is a finding
  — it would mean a host was relying on a hole this closes.
