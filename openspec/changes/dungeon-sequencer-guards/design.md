## Context

Three holes, all deliberately left by earlier phases:

**Phase.** `actions.ts` says so outright: *"What is deliberately NOT validated
here: turn phase. The harness bench drives both sides by hand, out of sequence,
on purpose. Phase enforcement belongs to the turn sequencer, which is a separate
effort."* That effort is now done.

**Two ledgers.** `commitAction` reads `movedThisTurn`/`attackedThisTurn`;
`commitNpcTurn`/`advanceNpc` read `npcPlannedThisRound`. Neither reads the other.
`dungeon-turn-sequencer`'s design records this and says explicitly that phase 2
closed the double-act only *within the sequencer's own paths*, leaving this for
phase 5.

**`resolveNpcAction`.** Exported, validates nothing about sequencing. Verified to
have no live consumer in either repo — both hosts now go through `advance`.

## Goals / Non-Goals

**Goals**

- Acting out of turn is refused by the engine, not merely unrendered.
- An enemy's turn is spendable once per round, by either route.
- The raw applier stops being reachable.

**Non-Goals**

- **Removing the bench's ability to drive either side out of sequence.** That is
  a spec'd capability (`dungeon-bench`, "Both sides are played by hand"), and
  this change must not break it.
- **Host changes.** None are expected. Needing one means a host was relying on a
  hole this closes — a finding to report.
- **`computeNpcTurns`.** Still exported; the game re-derives telegraphs with it
  when a definition changes.

## Decisions

### The phase guard is gated on engine mode, not on unit kind

The obvious implementation — guard everything on phase — breaks the bench, whose
spec requires taking turns "for **either** side, moving and attacking with enemy
units exactly as with player units." The bench does that outside the player
phase by design.

The tempting alternative — guard only PCs — is worse: it invents an asymmetry in
the rules to accommodate one host, and leaves an NPC able to act out of phase in
the *game* too.

So the latitude is gated on **engine mode**, which already exists for exactly
this: fencing bench-only freedom behind an explicit opt-in that defaults to
`'game'`. `amendTelegraph` set the precedent. The rule reads: *the engine
enforces turn phase; the bench may opt out of it, and only the bench.*

This keeps the game fully enforced, the bench fully capable, and the exception
in one place with a name.

### Both ledgers stay, and cross-check

The two records answer different questions — "how much of its turn has this unit
spent" versus "has this enemy's turn been planned" — and collapsing them would
mean the sequencer re-deriving movement accounting or the action surface learning
about telegraphs. Cheaper and clearer to have each refuse when the other is set.

Two refusals, mirror images:

- `availableActions`/`commitAction` refuse an enemy in `npcPlannedThisRound`.
- `commitNpcTurn`/`advanceNpc` refuse an enemy that has moved or attacked this
  round.

`unplannedNpcs` must apply the second rule too, or `advance` would keep offering
a spent enemy as the next thing to plan and the enemy phase would never end.

### `resolveNpcAction` goes internal, `computeNpcTurns` stays

Different fates for the two, on purpose. Nothing outside the package should apply
an NPC action directly — that is what `advance` is for. But `computeNpcTurns` has
a legitimate remaining caller: `applyDefChange` re-deriving telegraphs after a
definition edit, which is a definition change invalidating a derived plan rather
than a step of a round.

## Risks / Trade-offs

**The bench is now the only thing standing outside phase enforcement**, and it
stands there because a mode flag says so. If that flag were ever set wrongly in
the game, the game would silently lose the guard. It defaults to `'game'` and the
game never sets it, so the failure requires someone actively opting the game in.

**The cross-check could refuse something a designer expects to work.** Driving an
enemy by hand and then asking the AI to plan it is currently possible and will
stop being. That is the defect, not a feature — but it is the change most likely
to surface as "the bench used to let me do this."

**Tests asserting the old holes will fail**, and each is a decision rather than a
fix: a test that drives a unit out of phase in `'game'` mode should set bench
mode or be re-aimed, and a test that spends an enemy twice was asserting the
defect. Neither should be "fixed" by weakening a guard.

## Migration Plan

None. No host changes expected; `resolveNpcAction`'s removal from the barrel has
no live consumer in either repo.

## Open Questions

None.
