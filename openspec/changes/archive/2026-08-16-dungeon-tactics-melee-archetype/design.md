## Context

See proposal.md - Why. This is phase 08a of the `dungeon-harness` plan
(`docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`):
agent-driven Gherkin extraction for an existing, already-implemented unit,
not a harness design session. The engineer additionally directed that
melee be split out of the shared `pc-archetypes` capability into its own
`melee-archetype` capability, rather than modifying `pc-archetypes` in
place — this diverges from phase 08a's default suggestion ("target the
existing `pc-archetypes` capability's per-unit Requirements") by explicit
instruction.

## Goals / Non-Goals

**Goals:**
- Real, passing Gherkin coverage for melee's move range and attack
  targeting, extracted from existing prose spec + implementation, not
  freshly designed.
- Melee's requirement and its executable scenarios consolidated under one
  dedicated capability (`melee-archetype`), separate from the other three
  PC archetypes still under `pc-archetypes`.

**Non-Goals:**
- No engine changes. `unitDefs.ts`, `attackFootprint.ts`, and `pc.ts`
  already implement melee's move range, attack targeting, and attack
  damage correctly (see `unitDefs.test.ts`/`attackFootprint.test.ts`).
- No Gherkin coverage for melee's rendered color. Per direction from the
  engineer, unit-definition scenarios should not test color or anything
  that interacts with Phaser — rendering is out of scope for
  `@amiceli/vitest-cucumber` step definitions against engine state. The
  color *requirement* (prose SHALL statement) is still carried into the
  new `melee-archetype` spec for completeness, since it's true, existing,
  documented behavior — only the executable scenario is omitted.
- Ranger, magic-user, and rogue are untouched; they remain under
  `pc-archetypes` until their own 08a bundles land.

## Decisions

- **Split melee into its own capability rather than modifying
  `pc-archetypes` in place.** Per explicit engineer direction. Rationale:
  as each remaining archetype (ranger, rogue, magic-user) goes through its
  own 08a extraction, per-archetype capabilities keep each unit's
  requirement and Gherkin scenarios colocated and independently
  reviewable/archivable, rather than accumulating four archetypes'
  worth of `MODIFIED Requirements` churn on one shared spec file.
- **Baseline was not actually empty.** Phase 08a's doc assumed
  track-web's canonical `.feature` corpus was empty for all 4 units. In
  practice `features/melee.feature` already had one real, passing scenario
  (`melee-attack-adjacent-npc`, added during the Gherkin-runner phase and
  tagged during the step-catalog phase). That scenario already accurately
  covers "Melee attack damage" and is carried forward unchanged; only the
  two new scenarios below are new coverage.
- **Move-range scenario uses a boundary check, not full reachable-set
  enumeration.** Hand-computing the melee PC's full ~34-tile reachable set
  against the real board's structure layout (`bundledMap.ts`'s
  `power-center`/`tower` objects) is fragile and error-prone to transcribe
  by hand, and adds no signal beyond confirming the range value. Instead,
  the scenario runs along board row 7 (no structures on that row), and
  asserts a tile at exactly range 4 is reachable while the next tile out
  (range 5) is not — a clean, obstacle-free test of the range boundary
  itself.
- **Attack-targeting scenario exercises `attackSquares` (planning),
  distinct from the existing damage scenario's `resolvePcAction`
  (resolution).** These are different code paths in `pc.ts`; testing both
  gives coverage of the full targeting → resolution pipeline rather than
  only resolution.

## Implementation notes from handoff

The following is carried over verbatim from the handoff bundle's
`melee-implementation-notes.md`:

> **Provenance:** This bundle was produced by **direct extraction** from
> existing, already-tested code and specs — not a harness design session.
> Per `docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`,
> melee's behavior is already fully pinned down by
> `openspec/specs/pc-archetypes/spec.md`'s "Melee PC archetype" requirement
> and by the already-implemented, already-tested engine
> (`client-games/src/games/dungeon-tactics-solo/unitDefs.ts`,
> `attackFootprint.ts`, `pc.ts`'s `validMoveDests`/`attackSquares`, plus
> `unitDefs.test.ts`/`attackFootprint.test.ts`). No new design decisions were
> made; this is a format conversion (prose scenario + implementation →
> literal Gherkin).
>
> **Baseline was not actually empty.** Phase 08a's doc was written assuming
> track-web's canonical `.feature` corpus was empty for all 4 units. In
> practice, `client-games/src/games/dungeon-tactics-solo/features/melee.feature`
> already contains one real, passing scenario
> (`@scenario-id:melee-attack-adjacent-npc`, "A melee PC attacks an adjacent
> NPC") — added earlier during the Gherkin-runner phase (phase 02) as its
> example fixture, then tagged during the step-catalog phase (phase 05). That
> scenario already accurately covers the "Melee attack damage" prose
> scenario (2 damage, matching `unitDefs.melee.attack.damage`), so it's
> carried into this bundle **unchanged**, not re-added. Only the two new
> scenarios below are genuinely new Gherkin coverage.
>
> **New scenarios added:**
> - `melee-move-range` — covers the prose "Melee move range" scenario (move
>   range 4, orthogonal). Tested via `pc.ts`'s `validMoveDests`, asserting a
>   tile at exactly range 4 is reachable and the next tile out (range 5) is
>   not — a boundary check rather than enumerating the full ~34-tile reachable
>   set, which is fragile to hand-compute against the real board's structure
>   layout (`bundledMap.ts`'s `power-center`/`tower` objects) and adds no
>   signal beyond confirming the range value. The scenario runs along board
>   row 7, which has no structures, so the boundary is purely range-limited,
>   not obstacle-confounded.
> - `melee-attack-targeting` — covers the prose "Melee attack targeting"
>   scenario (only the single adjacent cell in the chosen direction is a
>   valid target). Tested via `pc.ts`'s `attackSquares` after
>   `setPlanAttack`, distinct from the existing damage-resolution scenario
>   which exercises `resolvePcAction` instead.
>
> **Explicitly out of scope for this bundle:** the prose spec's "Melee
> color" scenario (fill color `0x4a90e2`). Per direction from the engineer,
> unit-definition Gherkin coverage should not test color or anything that
> interacts with Phaser — rendering is exercised elsewhere, not through
> `@amiceli/vitest-cucumber` step definitions against engine state.

This section is informational only; it did not change what's in
`features/melee.feature` or the `specs/` deltas beyond what's described
above.

## Risks / Trade-offs

- **[Risk]** Splitting melee out of `pc-archetypes` while ranger/rogue/
  magic-user stay behind leaves the capability structure inconsistent
  until the other three archetypes get their own 08a bundles.
  **Mitigation:** phase 08a is explicitly scoped to run once per unit
  (melee, rogue, ranger, magic-user), so this is an expected intermediate
  state, not a bug — the remaining three will follow the same split
  pattern in their own changes.

## Migration Plan

No runtime migration — this is a test-coverage and spec-organization
change only. On archive, `features/melee.feature` merges into the
canonical tree (replacing the current file, which is a subset of it) and
`openspec/specs/pc-archetypes/spec.md` / `openspec/specs/melee-archetype/spec.md`
are updated per the deltas below.
