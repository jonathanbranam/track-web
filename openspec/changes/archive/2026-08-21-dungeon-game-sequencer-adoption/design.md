## Context

`runNpcMovePhase` and `runNpcAttackPhase` (`DungeonTacticsGame.tsx:338-385`) hold
the round. Both are continuation-passing recursions driven by animation
callbacks:

```ts
const { moves, attackPlans } = computeNpcTurns(stateRef.current)
const step = (idx) => {
  if (idx >= moves.length) { /* phase = 'player', npcPlans = attackPlans */ return }
  scene()?.animateNpcAction(moves[idx], () => {
    stateRef.current = resolveNpcAction(stateRef.current, moves[idx])
    step(idx + 1)
  })
}
```

The host holds `moves`, chooses the order, and applies each action itself.

The engine now offers, all shipped and consumed by the bench:

```ts
nextAction(state): SequencerStep | null
advance(state): { ok: true; state; step: SequencerStep } | { ok: false; reason }

type SequencerStep =
  | { kind: 'plan-enemy'; unitId; action: NpcAction; attackPlan: NpcAttackPlan | null }
  | { kind: 'resolve-telegraph'; unitId; attack: NpcAttackPlan }
  | { kind: 'skip-telegraph'; unitId; attack: NpcAttackPlan }
  | { kind: 'phase-transition'; from: TurnPhase; to: TurnPhase }
```

## Goals / Non-Goals

**Goals**

- One round, owned by the engine, driven by both hosts.
- The game's animation pacing preserved exactly.

**Non-Goals**

- **Any change to how the game plays.** Same order, same telegraph window, same
  animations. An observable difference is a bug in this change.
- **Any engine change.** The surface is complete; wanting one is a finding.
- **The phase guard on `availableActions`, and demoting `resolveNpcAction`.**
  Those are `dungeon-sequencer-guards`, after this lands.
- **Touching `applyDefChange`.** See below.

## Decisions

### Peek, animate, then advance

`advance` applies state, but the game animates *before* applying. So each step
becomes:

1. `nextAction(state)` — what is about to happen.
2. Animate it, if it has something to animate.
3. On animation completion, `advance(state)` — which performs exactly the step
   just peeked, because `advance` is implemented as `nextAction` plus the commit.

That equivalence is load-bearing and is the engine's own guarantee, not an
assumption this change makes. It is why the peek cannot animate one thing while
the commit does another.

The recursion stays. Only its source of truth changes: from an index into a
host-held array to "ask the engine again."

### Mapping a step to an animation

`animateNpcAction(action, onComplete)` takes an `NpcAction`. Each step kind maps
cleanly:

| Step | Animate |
|---|---|
| `plan-enemy` | its `action` — the same `NpcAction` the host used to pass |
| `resolve-telegraph` | its `attack`, as the host already animates a plan |
| `skip-telegraph` | nothing; advance immediately |
| `phase-transition` | nothing; advance immediately |

`skip-telegraph` replaces the host's own `units.some(u => u.id === plan.unitId)`
check — the engine already decides a dead NPC's telegraph is skipped, so the host
stops deciding it too.

### Both phases become one driver

`runNpcMovePhase` and `runNpcAttackPhase` differ today only in which array they
walk and what they do at the end. Against the engine they differ in nothing: both
are "peek, animate, advance, repeat." They collapse into a single loop that runs
until `nextAction` returns `null` — which happens exactly when the round reaches
`player`.

Round chaining disappears as host code. `endRound` and the call into the next
`runNpcMovePhase` are the engine's `npc-attack → npc-move` transition, taken by
the same loop.

### `handleConfirmEndTurn` still sets `phase: 'npc-attack'`

`advance` refuses during `player`, correctly: ending your turn is a decision, not
a rule. The host keeps that one transition, exactly as the bench does. It then
starts the same driver loop.

### `placement → npc-move` also stays host-owned

Not spelled out in the tasks, and decided during implementation: the engine's
round covers `npc-move` and `npc-attack`, so `nextAction` has nothing to say
while the game is in `placement`. Entering the first `npc-move` has no engine
transition of its own, and the host sets it once — exactly as it always has —
before handing the round to the driver.

This is symmetric with `handleConfirmEndTurn` keeping `player → npc-attack`, and
for the same reason: both are the player deciding they are finished, which is a
decision rather than a rule. Every transition *inside* the round comes from the
engine.

### `applyDefChange` is not touched

The plan originally said to re-express its `replanIds` path via `amendTelegraph`.
**That is wrong and would not run** — `amendTelegraph` is bench-gated and this
host is in `'game'` mode.

They are different operations that happen to touch the same field.
`amendTelegraph` is *a person retargeting a locked attack*, which the game must
never permit; `applyDefChange`'s replan is *a definition change invalidating a
telegraph the AI derived from it*, which both hosts must do. The plan has been
corrected.

## Risks / Trade-offs

**Animation pacing is the thing most likely to break invisibly.** Tests assert
state, and every state assertion can pass while the board animates wrongly —
a dropped `onComplete`, a step advanced twice, or a redraw missed between steps.
Browser verification is not optional here, and it is the only check that covers
this.

**`animatingRef` guards HUD taps.** Several handlers early-return while an
animation is in flight. The driver must keep that flag accurate across a loop
that now spans phase transitions, or a tap mid-round could interleave.

**The loop must terminate.** Today's recursion ends by exhausting an array; the
new one ends when `nextAction` returns `null`. A step that fails to advance the
round would spin. Advancing on a refusal, rather than retrying, is the safe
failure.

## Migration Plan

None. No signatures change, no state shape changes, and nothing else in
`client-games` consumes these two functions.

## Open Questions

None.
