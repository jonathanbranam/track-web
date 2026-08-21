## Context

The round's shape is already specified by `dungeon-tactics-solo` ("NPC turn
executes immediately in turn order", "NPC planned attacks resolve after the
player turn"), including the explicit prohibition on batched movement playback.
The implementation satisfies that spec — in the host.

`computeNpcTurns` (`npc.ts:130`) plans the whole enemy side in one pass,
threading a mutating `workingUnits` so each NPC accounts for where earlier ones
moved. It returns `{ moves, attackPlans }`. `DungeonTacticsGame.tsx:338-385`
keeps `moves` in a local, walks it with a continuation-passing recursion driven
by animation callbacks, and stores `attackPlans` into `state.npcPlans`.

So the engine never sees the movement plan, and `resolveNpcAction` (`npc.ts:314`)
checks nothing about sequencing. The gap is structural, not a forgotten guard.

## Goals / Non-Goals

**Goals**

- The engine owns round order, per-enemy turn accounting, and phase transitions.
- One planning path, whether the AI or a host chose the decision.
- A host can see the next step before causing it.
- Bench-only affordances are fenced by an explicit mode.

**Non-Goals**

- **Changing the round's shape.** This is a relocation of ownership. Any
  observable change to how the game plays is a bug in this change.
- **Touching either host.** Purely additive; `client-games` and the harness adopt
  in later changes and must keep working untouched in the meantime.
- **The phase guard on `availableActions`.** It would break hosts that are not
  yet phase-aware. It lands in `dungeon-sequencer-guards` after both have
  adopted.
- **Demoting `resolveNpcAction`.** Same reason — it stays exported here.

## Decisions

### Two `GameState` fields, not a plan structure

Because a move executes as it is planned, there is no pending move plan to store.
`npcPlans` already holds the locked telegraphs in planning order and is already
walked by index at resolution — it **is** the plan. What is missing is a record
of the movement half and a resolution cursor:

```ts
npcPlannedThisRound: string[]   // enemies whose turn is planned: move done, attack locked
npcPlansResolved: string[]      // telegraphs already resolved this resolution phase
```

Both are unit ids rather than indices, so they survive a unit dying mid-phase and
survive the bench rewinding into the middle of one. Both are reset by `endRound`
alongside the existing per-turn fields.

### The per-unit planner is an extraction, not a rewrite

`computeNpcTurns`'s loop body is already `continue`-terminated per unit, and its
shared setup (`towerImmune`, `towerPos`, `npcFilter`) is cheap to lift into a
context argument. Extract that body as a function planning one unit against
current state, and refold `computeNpcTurns` onto it.

**`computeNpcTurns` must keep its exact current behaviour**, including the
`replanIds` path (`npc.ts:137-151`), because the shipped game still calls it
until phase 4. Its existing tests are the check.

Planning against current state is what makes mixed authorship compose: an enemy
planned after another sees where that other now stands, which is the same
property `workingUnits` gives the batch loop.

### `advance` takes no unit id

This is the load-bearing decision. A host that can name the actor can get the
order wrong; a host that can only say "proceed" cannot. Pacing is *when* the host
calls it — from an animation callback in the game, immediately in the bench.

### Engine mode is a module-level setting

One process is either the game or the bench, and it never changes at runtime, so
threading it through every call would be noise. A module-level setting with an
explicit setter matches the existing `defStore`/`contentStore` shape.

This is deliberately **not** the same category as those singletons for the
instance-scoping work the harness has deferred: board and unit-def state need
per-instance values for a multi-board survey grid, and the mode never will.

Defaulting to `'game'` fails closed. A host wanting bench affordances opts in;
forgetting to opt in refuses, and no amount of forgetting opens the game up.
**Tests exercising bench-only operations must set it in setup and restore
afterwards.**

### Refusals, not throws

Every operation returns the `{ ok: false, reason }` shape
`dungeon-tactics-action-surface` established, including the engine-mode refusal.
A throw would be louder for what is arguably a programming error, but uniformity
makes the whole surface testable through one path, and the game never renders a
control for a bench-only operation in the first place.

### Amendment is gated on resolution state, not on phase

The harness plan's §6 originally said `amendTelegraph` should refuse "a call
outside `player`". That is narrower than the window the feature is defined by:
*after locked, before resolves*. A telegraph still pending partway through
`npc-attack` is inside that window, which matters in the bench where the designer
can scrub into the middle of resolution. Gating on `npcPlansResolved` is the
general form and subsumes the player-phase case. The spec's scenarios never
required a phase restriction; the plan has been corrected to match.

### Amendment is safe because telegraphs are inert

Nothing reads `npcPlans` between lock and resolution — verified: no reads in
`actions.ts`, `pc.ts`, or `pathfinding.ts`, and the only engine read is
`npc.ts:139`, the `replanIds` path, which *preserves* prior telegraphs rather
than consuming them. A telegraph is display-only until resolution walks it.

There is precedent in the game itself: `applyDefChange`
(`client-games/.../DungeonTacticsGame.tsx:98-118`) already mutates `npcPlans`
mid-player-phase when a definition changes, attack-only, movement untouched.

## Risks / Trade-offs

**The refold could change AI behaviour subtly.** `computeNpcTurns`'s sequential
`workingUnits` threading is easy to break when splitting the loop body out. Its
existing tests are the guard, and they must pass unchanged — not be adjusted to
fit new behaviour. If they need adjusting, the refold is wrong.

**The legacy double-act path stays open.** `npcPlannedThisRound` is separate
bookkeeping from `movedThisTurn`/`attackedThisTurn`, and this change does not
touch `commitAction` or `computeNpcTurns` — the tripwire forbids it. So
hand-driving an enemy through the action surface and then planning it through
`computeNpcTurns` still double-acts. What this change establishes is that a host
driving its enemy turn *through the sequencer* cannot. No host mixes the two
mechanisms in one round, so nothing is broken today, but `dungeon-sequencer-guards`
is what actually retires the legacy path — do not read task 4.9 as closing it.

**Two `GameState` fields that no host writes yet.** Between this change and the
adoptions, the fields exist and stay empty on the game's path. That is the price
of keeping this change additive, and it is why the completeness rule cannot be
enforced until phase 5.

**A module-level mode is process-global state**, which is exactly the pattern the
harness has flagged as debt elsewhere. Accepted deliberately, with the
distinction recorded above so a later reader does not fold it into the
instance-scoping work.

## Migration Plan

None required. Nothing is removed, no signature changes, and both hosts continue
on their existing code paths. New `GameState` fields need defaults wherever state
is constructed (`initialState`, `endRound`, deserialization) so existing
serialized states load.

## Open Questions

None. The round shape is settled by `dungeon-tactics-solo` and confirmed against
the running code.
