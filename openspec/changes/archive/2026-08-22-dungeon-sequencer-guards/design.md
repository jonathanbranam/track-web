## Context

Three holes, all deliberately left by earlier phases:

**Phase.** `actions.ts` says so outright: *"What is deliberately NOT validated
here: turn phase. The harness bench drives both sides by hand, out of sequence,
on purpose. Phase enforcement belongs to the turn sequencer, which is a separate
effort."* That effort is now done — and the justification in that sentence turned
out to be false. See the first decision below.

**The action surface will drive an enemy.** Nothing in it restricts it to the
player's units, and `commitAction`'s attack resolves damage immediately. The
game's enemy attack never does: it is locked as a telegraph in `npc-move` and
resolved in `npc-attack`, with the player's turn in between. That window is the
round's core tension, so an immediately-resolving enemy attack is a different
rule, not a differently-timed one.

**Two ledgers.** `commitAction` reads `movedThisTurn`/`attackedThisTurn`;
`commitNpcTurn`/`advanceNpc` read `npcPlannedThisRound`. Neither reads the other.
`dungeon-turn-sequencer`'s design records this and says explicitly that phase 2
closed the double-act only *within the sequencer's own paths*, leaving this for
phase 5.

**`resolveNpcAction`.** Exported, validates nothing about sequencing. Verified to
have no live consumer in either repo — both hosts now go through `advance`.

## Goals / Non-Goals

**Goals**

- Acting out of turn is refused by the engine, not merely unrendered — in every
  host.
- An enemy is driven by planning or not at all.
- The raw applier stops being reachable.

**Non-Goals**

- **Rules that differ between hosts.** The one departure the design bench is
  allowed is retargeting a locked telegraph, which spends no turn and changes no
  state. Any further exception is argued back one at a time.
- **The harness's own adoption.** The bench's fixtures and three of its tests
  rely on the holes this closes; correcting them is its own change in that repo.
- **`computeNpcTurns`.** Still exported; the game re-derives telegraphs with it
  when a definition changes.

## Decisions

### The phase guard is not gated on anything

This change was first written with the guard lifted in bench mode, on the
strength of a `dungeon-bench` requirement — *"Both sides are played by hand"* —
that had itself stopped being true. The full account is in
`harness:docs/dungeon-harness/harness-rebuild/phase-5-correction.md` §1–§3; the
short version:

- The requirement was a **deferral** written in August 2026, when there was no
  sequencer to be in sequence *with*. Rebuild phases 1–4 removed the reason and
  built the correct model — the designer's seat for the enemy is the **planning**
  seat, exactly where the AI sits — but nobody retired the sentence.
- This change then hit the contradiction between the new model and the stale
  requirement and let the requirement win, hardening a deferral into a design
  position.
- `turn-sequencer-plan.md`, the plan of record, never asked for the exemption. It
  specified the guard flatly.

So: **the bench and the game play by the same rules.** The guard reads
`state.phase !== 'player'`, full stop, and the `getEngineMode` import leaves
`actions.ts`.

The engine mode is not being removed or weakened — it still fences
`amendTelegraph` and the scenario-authoring surface. It was used for a second
thing it should not have been. That distinction is now written into its own doc
comment, because inferring "everything behind this fence is a rule the bench
breaks" is precisely how the mistake was made.

### An enemy has no action surface at all, rather than just a narrower one

Removing the exemption leaves a residual question: during the `player` phase,
should the action surface still offer actions for an **enemy** unit? An enemy
placed mid-round and never planned would otherwise still be drivable by hand.

The narrower option — guard on phase only — leaves the category alive, and the
category is the problem: not *when* an enemy is driven, but that driving one
resolves an attack the game can never produce (see Context). So
`availableActions` refuses `unit.kind === 'npc'` outright, in every phase.

This deletes the category instead of narrowing it, and it makes the existing
`npcPlannedThisRound` check in `availableActions` dead code — an enemy is refused
before that check is ever reached. It goes.

The reasons are ordered enemy-first: "an enemy takes its turn by being planned"
is true in every phase, where "it is not the player's turn" is only true in some,
and a designer clicking an enemy during the player phase deserves the reason that
tells them what to do instead.

### Both ledgers stay, and cross-check — as defence-in-depth

The two records answer different questions — "how much of its turn has this unit
spent" versus "has this enemy's turn been planned" — and collapsing them would
mean the sequencer re-deriving movement accounting or the action surface learning
about telegraphs.

`commitNpcTurn`/`advanceNpc` therefore still refuse an enemy that has moved or
attacked this round, and `unplannedNpcs` still filters it out — otherwise
`advance` would keep offering a spent enemy as the next thing to plan and the
enemy phase would never end.

**But be honest about what that is now.** Only `pc.ts` writes
`movedThisTurn`/`attackedThisTurn`, and it is reached only through
`commitAction`, which now refuses every enemy. So no host can put an enemy into
that state, and the "an enemy can act twice in a round" defect this change was
originally proposed to fix becomes *unreachable* — deleted by the same change,
not patched by it. The guard stays because the engine should be correct for any
host; the proposal no longer advertises it as a bug fix.

### `resolveNpcAction` goes internal, `computeNpcTurns` stays

Different fates for the two, on purpose. Nothing outside the package should apply
an NPC action directly — that is what `advance` is for. But `computeNpcTurns` has
a legitimate remaining caller: `applyDefChange` re-deriving telegraphs after a
definition edit, which is a definition change invalidating a derived plan rather
than a step of a round.

## Risks / Trade-offs

**The harness breaks, on purpose, and loudly.** Measured 2026-08-21 by applying
both guards and running the bench suites: **23 failed / 105 passed of 128**. Most
are fixtures that start a scenario and act immediately, never reaching the player
phase — they never *meant* to test out-of-sequence play, nothing stopped them.
Three test the capability being deleted. That split is the finding, and it is why
the harness adoption is its own change rather than a footnote here.

**A designer loses a gesture they had yesterday.** Clicking an enemy and moving
it will stop working. The replacement — planning the enemy by hand — already
exists, produces a real telegraph, and is strictly better; but it is a different
number of clicks, and it will be noticed.

**Tests asserting the old holes will fail**, and each is a decision rather than a
chore: one driving a unit out of phase should be re-aimed at the player phase,
and one driving an enemy by hand should be re-aimed at `planEnemyByHand` or
deleted with the requirement. Do not weaken a guard to keep a test green.

## Migration Plan

None in this repo. `resolveNpcAction`'s removal from the barrel has no live
consumer in either repo. The harness's adoption lands as its own change and must
follow this one.

## Open Questions

None.
