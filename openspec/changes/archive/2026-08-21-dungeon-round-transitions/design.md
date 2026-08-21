## Context

Step 1 of `harness:docs/dungeon-harness/harness-rebuild/phase-5-correction.md`
§9. See that document for why the whole correction exists; this change is the
part with no behavioural consequence, deliberately taken first so the rest is
legible.

## Goals / Non-Goals

**Goals:**
- Every phase transition is performed by one implementation.
- The better of the two existing refusals survives, and both hosts get it.

**Non-Goals:**
- **Type-level enforcement.** Making `state.phase` unwritable by a host was
  prototyped (a branded phase type; it works) and deliberately deferred — see
  the correction plan §8.7.1. `GameState` is plain serializable data by design,
  and the right fix is information hiding across the whole state, not a brand on
  one of fourteen fields. All eight current direct-write sites are closed by
  ordinary refactoring: three here, five by the bench setup surface.
- **The bench's placement phase.** `startScenario` lands here because the game
  needs it; the bench cannot call it until it starts boards in `placement`,
  which is the next change.
- Any change to `advance`, or to which phases exist.

## Decisions

### The two operations return `SequencerResult`, not a bare state

`SequencerResult` (`{ ok: true; state } | { ok: false; reason }`) already exists
and is what every other host-callable sequencer operation returns. Returning a
bare `GameState` would make the out-of-phase refusal impossible to express, and
today's game has no refusal at all for exactly that reason: `handleConfirmEndTurn`
guards with an early `return` and has nothing to say.

### The refusal message comes from the engine, so the game inherits the bench's

The bench's `endPlayerTurn` names the enemies still needing a plan when the round
has not reached `player`:

> Can't end the player's turn yet — 2 enemy turn(s) still need a plan: npc-0, npc-3.

That is better than a generic phase complaint, and it is a fact the engine
already knows (`unplannedNpcs`). Moving it into the engine is the whole point of
this change: the good version wins and both hosts get it, rather than one host
having quietly built something the other lacks.

### Clearing the selection moves into the engine, resolving an existing drift

The game clears `selectedUnitId` and `planningPhase` on both transitions; the
bench clears neither. Rather than preserve the difference, the engine clears
both, because a selection surviving a phase change is wrong in either host.

This is safe for the bench: it keeps its designer selection in host-local state
(`BenchStore.selectedId`) and only ever writes `state.selectedUnitId` as `null`
at board creation, so it has nothing to lose. The bench's own selection is
deliberately left alone — the hosts must agree on rules and the round, not on UI
affordances (correction plan §10.1).

### Named for the decision, not the phase

`startScenario` and `endPlayerTurn`, not `beginNpcMove`/`beginNpcAttack`. The
host is expressing a decision — "the board is set", "I am done" — and the engine
decides which phase that leads to. Naming them after their destination would
invite a host to reason about which phase should come next, which is the
reasoning this change removes.

## Risks / Trade-offs

- **[The game gains refusals where it had silent early-returns]** → The paths are
  the same; the host still guards before calling (it must not start an animation
  it will not finish). The engine refusal is a second line, not the first.
- **[`startScenario` ships with one caller]** → It is the game's, and it is real.
  The bench adopts it next change. The alternative — landing half the pair now —
  leaves the asymmetry this change exists to remove.
- **[Two changes now target `dungeon-tactics-turn-sequencer`]**
  (`dungeon-sequencer-guards` is unarchived) → Both add requirements and neither
  modifies an existing block, so they do not collide and can archive in either
  order. This was checked deliberately, per the repo's archive-ordering rule.

## Migration Plan

None. No stored state, no serialized shape, and no behaviour changes.
