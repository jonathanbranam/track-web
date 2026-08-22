## Context

See `proposal.md — Why`. The engine facts this change relocates already exist in
two places: `initialState()` (`npc.ts:340`) builds the game's loaded starting
position, and the harness's `BenchStore` builds and edits an authored one with
its own copies of the rules. This change adds the third thing neither covers —
an *authoring* surface on the engine — and lets the harness delete its copies.

Constraints that shape the approach:

- **The engine is value-based.** Every operation takes a `GameState` and returns
  a new one; the host holds the state. The harness depends on this heavily (a
  frame stack with a cursor, bookmark serialization, rewriting a past frame for
  a telegraph amendment). Nothing here may invert that — see the correction plan
  §8.7.1, where state ownership is explicitly deferred to its own pass.
- **The engine does no I/O.** Board *content* still loads in the host; this
  surface takes cells it is handed.
- **`engine-mode` is a module singleton.** Tests that reach this surface must set
  and restore it, the same discipline `defStore`/`contentStore` tests follow.

## Goals / Non-Goals

**Goals:**

- One place where "a structure blocks a tile", "two units cannot share a tile",
  "a fresh unit starts at its archetype's max HP", and "this is what a unit is
  called" are decided.
- A surface the harness can wrap without adding a check of its own.
- Refusals in the shape the harness already forwards verbatim.

**Non-Goals:**

- **The strict phase guard itself.** `availableActions` keeps its bench escape
  hatch until change 3; this change only builds the legal home that guard needs.
- **Waves and flight** (`spawnWave`, `flee`) — change 4. They reach `npc-move`,
  not `placement`, and are game mechanics arriving early rather than authoring.
- **Spawn zones for authored boards** (correction plan §10.2). An authored
  scenario has no spawn zones; waves will name tiles explicitly.
- **Session unit-definition overrides.** They stay editable at any time — they
  are not `GameState`, and changing a number mid-round to see what happens is the
  bench's whole point. (Designer's call, 2026-08-21; to be revisited with the
  turn-machine replacement for unit definitions.)
- **Setting current HP outside placement.** Placement-only for now, per §8.3.
  (Designer's call, 2026-08-21; may come back later as an argued bench
  exception.)
- Any change to the shipped game's behavior.

## Decisions

### A namespace, not fifteen more flat exports

`export * as scenario from './scenario'`, called as `scenario.placeUnit(state,
…)`.

- **Why not flat names?** `placeUnit` is already exported from `pc.ts` — the
  game's reposition-within-the-spawn-zone move. Two functions called `placeUnit`
  with different rules is precisely the confusion this change exists to remove.
- **Why not `scenarioPlaceUnit`, `scenarioRemoveUnit`, …?** Same information,
  more noise, and it does not group the fence. A namespace makes "everything in
  here is bench-only" visible at the call site.
- **Why not rename `pc.placeUnit`?** It is the game's, it is in the game's spec
  (`dungeon-tactics-spawn-placement`), and churn there buys nothing.

### Result shapes mirror the sequencer

```ts
export type ScenarioResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string }

export type ScenarioPlaceResult =
  | { ok: true; state: GameState; unit: Unit }
  | { ok: false; reason: string }
```

`SequencerResult` is the shape the harness already forwards. `placeUnit` needs a
second shape because the caller cannot name what it just created: it must be
told the unit, and it wants the whole unit (id *and* resolved HP) for its log —
diffing two unit arrays to find out is exactly the derived-knowledge move this
change removes.

Every operation returns a result, including `newScenario`, so a caller has one
error path rather than two.

### The fence is one internal helper with two distinct reasons

```ts
function refuseUnlessAuthoring(state?: GameState): string | null
```

Returns a reason or `null`. Two messages, deliberately different:

- not bench mode → "Authoring a scenario is a bench-only operation; this engine
  is running the game."
- wrong phase → "A scenario can only be edited during placement; this round is in
  the <phase> phase."

The spec requires a host be able to tell these apart, because they mean
different things to a designer: one is "never", the other is "not now, step back
to setup".

`newScenario` checks mode only — it takes no prior state, so there is no phase to
be in.

### Unit ids: the harness's existing rule, moved verbatim

`<unitType>-<n>`, where `n` is one more than the **highest numeric suffix among
all units in the state**, not a count and not per-archetype.

- Derived from state, so there is no counter for a host to keep in sync — which
  is what makes ids survive a timeline jump or a restored position with gaps.
  The harness's `nextSeqFrom` and its `unitSeq` field both disappear.
- Kept global rather than per-archetype so existing bench positions, logs, and
  the harness's id-collision regression test keep their current behavior. A
  per-archetype scheme would read slightly better and is not worth an
  observable-id change here.
- The game's own `pc-0…pc-3` / `npc-0…npc-4` ids are unaffected; `initialState`
  does not use this path. The suffix parse handles them if an authored scenario
  ever contains one.

### Structure HP defaults belong to the engine

`power-center: 3`, `tower: 5` — the values the bundled map and the harness's
board generator both already use. Exported alongside the surface so the harness
can stop keeping its own copy (in `STRUCTURE_CHARS`), though actually collapsing
that duplicate is the harness change's business, not this one's.

Structure edits copy the affected row and cell rather than mutating, matching
`damageStructure` in `turn.ts`.

### `newScenario` produces `placement`, and nothing else moves it

The harness's `emptyState` starts a fresh board in `npc-move` with a comment
explaining that anywhere else would make round 1 disagree with every later
round. That reasoning is now obsolete: `startScenario` (shipped in
`dungeon-round-transitions`) is exactly the `placement → npc-move` transition,
so an authored scenario enters the round through the same function a loaded one
does.

No new transition is added, and in particular **there is no "back to setup"**.
A designer returns to placement the way the bench already offers: by stepping
back through the timeline to a frame before the scenario started.

## Risks / Trade-offs

- **The bench loses free mid-round editing** (place a unit, tweak an HP, at any
  moment) → It is traded for the bench and the game being the same game, which is
  the point of the correction. The timeline makes the cost small: step back,
  edit, replay. Two specific affordances are called out as revisitable in
  Non-Goals rather than silently dropped.
- **Saved bench positions may be refused** → Established policy: refuse with a
  reason, never migrate. The harness change owns the message; the designer should
  expect it rather than read it as a regression.
- **`setUnitHp` still has no upper clamp**, so a unit can be authored above its
  archetype maximum → Deliberate: "what if this thing had 12 HP" is a legitimate
  bench question, and `reconcileHp` only shifts HP by a definition delta, so an
  over-max unit stays coherent. Documented, not enforced.
- **A module-singleton fence is easy to leave set** → The existing engine-mode
  doc comment already mandates set-in-setup/restore-in-teardown; the new tests
  follow it, and the harness change deletes the blanket `setEngineMode('bench')`
  that phase 5 added at file scope (correction plan §6 step 3).
- **The fence now guards two categories of thing**, and someone will eventually
  read "behind the fence" as "a rule the bench breaks" → Mitigated in two places:
  the engine-mode doc comment says so explicitly, and the spec requirement states
  the distinction rather than leaving it to a comment.
