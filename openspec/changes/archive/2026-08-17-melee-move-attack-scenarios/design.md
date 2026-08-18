## Context

See proposal.md - Why. This is a small follow-on to the archived
`dungeon-tactics-melee-archetype` change (phase 08a of the
`dungeon-harness` plan): same extraction category (prose/spec scenario +
already-implemented, already-tested engine → Gherkin), same capability
(`melee-archetype`), no engine changes. Since that change landed, the
project migrated its Gherkin runner from `@amiceli/vitest-cucumber` to
`quickpickle` (see `client-games/src/games/dungeon-tactics-solo/features/README.md`),
so step definitions now live in the shared, parameterized
`features/steps/pc.steps.ts` library rather than a per-`.feature`
`.test.ts` file — this change follows the current convention, not the
archived one's file layout.

## Goals / Non-Goals

**Goals:**
- Real, passing Gherkin coverage for melee's move-range obstacle
  exclusion and its move-and-attack-in-one-turn action, extracted from
  already-implemented, already-tested engine code (`pc.ts`'s
  `validMoveDests`/`resolvePcAction`), not freshly designed.
- New step definitions reusable by future archetypes' extraction bundles
  (rogue, ranger, magic-user still pending under `pc-archetypes`), per
  the shared-step-library convention.

**Non-Goals:**
- No engine changes. `pc.ts` already excludes occupied/structure tiles
  from `validMoveDests`'s BFS and already handles the `move-attack`
  `PcAction` variant in `resolvePcAction`.
- No PC-death/HP-reaches-0 coverage — that's `pc-archetypes`' generic "PC
  HP starts at 3" requirement, explicitly out of scope here (see
  proposal.md).
- No full-reachable-set or maze-style pathing coverage. Per the archived
  change's precedent, boundary/exclusion-style checks give the needed
  signal without fragile hand-computation against the real bundled
  board's structure layout.

## Decisions

- **Obstacle scenario places a structure explicitly via a new step,
  rather than relying on the bundled map's real structure layout.** Same
  rationale as the archived change's move-range scenario (which picked
  board row 7 specifically because it has no structures): hand-computing
  against `bundledMap.ts`'s real `power-center`/`tower` placement is
  fragile and would silently break if the bundled map is edited. A new
  `a structure at column {int}, row {int}` Given step mutates
  `state.cells` directly, keeping the scenario deterministic and
  independent of the bundled map's content. It still runs on board row 7
  (consistent with the existing move-range scenario) so the placed
  structure is the *only* obstacle in play.
- **One scenario covers both obstacle kinds (structure and
  unit-occupied), not two.** `validMoveDests` excludes tiles via the same
  two checks (`structureKeys`/`occupiedKey`) in one BFS loop; separating
  them into two scenarios would double step count for no added signal.
  The existing `an NPC with {int} hp at column {int}, row {int}` step
  already exercises the unit-occupied path with no changes needed.
- **The scenario does not assert on a farther tile "behind" the
  obstacle.** `validMoveDests` is a full 2D BFS (not a single-row walk),
  so a tile behind an obstacle can still be reachable via a detour
  through an adjacent row within move range. Asserting a farther tile is
  unreachable would encode an incidental fact about the specific
  coordinates chosen, not the requirement itself, and could break on an
  unrelated range/position tweak. The requirement is fully captured by
  asserting the occupied tile itself is excluded — `validMoveDests`
  structurally cannot expand past a tile it never visits, so "no route
  through it" doesn't need a separate assertion.
- **Move-and-attack scenario passes an empty `path` array.**
  `resolvePcAction`'s `move`/`move-attack` handling only reads
  `action.toCol`/`toRow` (for the blocked-check and the position update);
  `path` and `fromCol`/`fromRow` are unused during resolution (they exist
  on `PcAction` for the immediate-move/undo bookkeeping in
  `applyMove`/`undoLastMove`, a different code path this scenario doesn't
  exercise). A new `the PC moves to column {int}, row {int} and attacks
  to the {word}` step constructs the action directly against
  `resolvePcAction`, matching how the existing `the PC attacks to the
  {word}` step already calls it for the plain-attack case.

## Risks / Trade-offs

- **[Risk]** New step definitions (`a structure at column {int}, row
  {int}`, `the PC moves to column {int}, row {int} and attacks to the
  {word}`, `the PC should be at column {int}, row {int}`) are general
  enough to be reused by future non-melee scenarios, which slightly
  broadens `pc.steps.ts`'s surface beyond this change's immediate need.
  **Mitigation:** this matches the file's own stated purpose ("one step
  definition here can back any number of scenarios/units") and the
  pending rogue/ranger/magic-user 08a bundles will need equivalent
  coverage anyway.

## Migration Plan

No runtime migration — test-coverage and spec-scenario addition only. On
archive, the `melee-archetype` MODIFIED Requirements delta merges into
`openspec/specs/melee-archetype/spec.md`, and the two new scenarios merge
into the canonical `features/melee.feature`.
