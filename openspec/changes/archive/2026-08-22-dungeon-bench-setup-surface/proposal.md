## Why

The design bench in the sibling `harness` repo holds one invariant above all
others: **the engine referees every rule, and the harness derives none of its
own.** Its setup path never adopted it. `BenchStore` hand-rolls an
`emptyState()` — a second, independent construction of a `GameState` sitting
beside `initialState()` — and its setup operations decide game facts locally:

```ts
if (this.state.units.some((u) => u.col === col && u.row === row)) return fail('… already occupied')
if (this.state.cells[row][col].hasStructure)                      return fail('… holds a structure')
const unit: Unit = { id: `${unitType}-${++this.unitSeq}`, …, hp: hp ?? def.maxHp }
```

"A structure blocks a tile", "two units cannot share a tile", "a fresh unit
starts at its archetype's max HP", and how a unit id is formed are all engine
facts, implemented in the harness. Setup was waved through as "not gameplay",
so nobody noticed.

This is also a prerequisite. The bench is about to be held to the game's phase
rules exactly (harness `docs/dungeon-harness/harness-rebuild/phase-5-correction.md`
§9, change 3), and a strict phase guard breaks bench setup outright: a fresh
bench board starts in `npc-move` and the designer edits it freely, because
nothing ever refused. Setup has to become an explicit phase with an explicit
engine surface before that guard can land.

**In the game, the starting position is loaded, never authored** —
`initialState()` builds it from the content store and the host only supplies
the bytes. The bench needs to author one instead. That is not a rule break: the
game has a setup phase too, the bench's is simply richer. But it belongs in the
engine, behind a fence, like every other bench-only affordance.

## What Changes

- **New bench-only scenario-setup surface in `@repo/dungeon-engine`.** Every
  function refused unless `getEngineMode() === 'bench'` **and**
  `state.phase === 'placement'`:
  - `newScenario(cells)` — a fresh authored state in `placement`, replacing the
    harness's `emptyState`. (Bench mode only; it takes no prior state, so there
    is no phase to check.)
  - `placeUnit`, `removeUnit`, `relocateUnit`, `setUnitHp`, `clearUnits` — the
    rule checks currently living in `BenchStore`, moved.
  - `placeStructure`, `removeStructure`, `moveStructure` — **new**. The bench
    cannot place or move a structure today; structures arrive only by generating
    a board or authoring exact rows. These touch `cells`, not `units`, so they
    are a separate code path.
- **The engine owns unit-id generation for authored scenarios**, derived from
  the units already in the state rather than from a host-held counter — so ids
  survive scrubbing back and loading a saved position with gaps in them.
- **A refusal carries a reason**, in the shape the sequencer already uses, so
  the bench forwards the engine's sentence rather than composing its own.
- **The engine-mode doc comment states that the fence now covers two different
  kinds of thing**: a rule-break the game must never reach (`amendTelegraph`)
  and an authoring surface the game has no use for (this). Inferring that
  everything behind the fence is a rule the bench breaks is exactly how the
  mistake this whole correction exists to fix was made.
- **BREAKING (bench only, sibling repo):** a bench scenario now begins in
  `placement` and reaches `npc-move` through the engine's `startScenario`,
  instead of starting in `npc-move` and being editable at any moment. The
  `GameState` shape does not change, so saved bench positions still load; if a
  later change does alter the shape, the established policy stands — refuse with
  a reason, do not migrate. Nothing in the shipped game changes.

## Capabilities

### New Capabilities

- `dungeon-tactics-scenario-setup`: authoring a starting position directly —
  board cells, structures, and units of either side on any tile with any
  starting HP — as a bench-only engine surface reachable only in the
  `placement` phase.

### Modified Capabilities

<!-- None. The game's own placement phase (`dungeon-tactics-spawn-placement`)
     is untouched, and no existing engine requirement changes: this is
     additive, fenced, and unreachable from the game. -->

## Impact

- `packages/dungeon-engine/src/scenario.ts` — new module holding the surface.
- `packages/dungeon-engine/src/index.ts` — export it.
- `packages/dungeon-engine/src/engine-mode.ts` — doc comment only (§10.6).
- Harness (sibling repo), landing as its own change: `BenchStore` drops
  `emptyState`, its local rule checks, and its `unitSeq` counter, and becomes a
  thin wrapper again; the bench starts in `placement`; the client grows a way to
  start the scenario and to place structures.
- No change to `client-games` or to any shipped-game code path.
