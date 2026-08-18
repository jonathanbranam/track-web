## Context

See proposal.md - Why. This is phase 08a of the `dungeon-harness` plan
(`docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`):
agent-driven Gherkin extraction for an existing, already-implemented unit,
not a harness design session. Following the precedent set by
`2026-08-16-dungeon-tactics-melee-archetype`, rogue is split out of the
shared `pc-archetypes` capability into its own `rogue-archetype`
capability, confirmed with the engineer via AskUserQuestion during this
change's `scenario-to-change` run rather than assumed silently.

## Goals / Non-Goals

**Goals:**
- Real, passing Gherkin coverage for rogue's move range, attack
  targeting, and attack damage, extracted from existing prose spec +
  implementation, not freshly designed.
- Rogue's requirement and its executable scenarios consolidated under one
  dedicated capability (`rogue-archetype`), separate from ranger and
  magic-user, which still remain under `pc-archetypes`.

**Non-Goals:**
- No engine changes. `unitDefs.ts`, `attackFootprint.ts`, and `pc.ts`
  already implement rogue's move range, attack targeting, and attack
  damage correctly (see `unitDefs.test.ts`/`attackFootprint.test.ts`).
- No Gherkin coverage for rogue's rendered color. Per the same direction
  applied to melee, unit-definition scenarios should not test color or
  anything that interacts with Phaser — rendering is out of scope for
  step definitions against engine state. The color *requirement* (prose
  SHALL statement) is still carried into the new `rogue-archetype` spec
  for completeness, since it's true, existing, documented behavior — only
  the executable scenario is omitted.
- Ranger and magic-user are untouched; they remain under `pc-archetypes`
  until their own 08a bundles land.

## Decisions

- **Split rogue into its own capability rather than modifying
  `pc-archetypes` in place.** Consistent with the melee precedent and
  phase 08a's status notes ("rogue/ranger/magic-user... are expected to
  follow the same per-unit-capability split"), confirmed for this change
  specifically via AskUserQuestion rather than assumed. Rationale: as each
  remaining archetype (ranger, magic-user) goes through its own 08a
  extraction, per-archetype capabilities keep each unit's requirement and
  Gherkin scenarios colocated and independently reviewable/archivable,
  rather than accumulating multiple archetypes' worth of `MODIFIED
  Requirements` churn on one shared spec file.
- **Baseline for rogue is genuinely empty**, unlike melee's. Melee already
  had one real, passing scenario (`melee-attack-adjacent-npc`) carried
  over from the Gherkin-runner phase before its 08a extraction ran. Rogue
  has no prior Gherkin coverage anywhere — confirmed by grepping
  `client-games/src/games/dungeon-tactics-solo/` for `rogue` (only engine
  code, unit-def tables, and rendering hex-color maps reference it, no
  `.feature`/step-definition content). All three scenarios in this change
  are new, matching the changeset's `status: "added"` for all three.
- **Move-range scenario uses a boundary check, not full reachable-set
  enumeration** — same technique as melee's, and for the same reason:
  hand-computing rogue's full reachable set against the real board's
  structure layout (`bundledMap.ts`'s `power-center`/`tower` objects) is
  fragile and adds no signal beyond confirming the range value. The
  scenario runs along board row 7 (no structures on that row), asserting
  a tile at exactly range 4 is reachable while the next tile out (range
  5) is not.
- **Attack-targeting scenario exercises `attackSquares` (planning),
  distinct from the attack-damage scenario's `resolvePcAction`
  (resolution)** — same split as melee's, covering both the targeting →
  resolution pipeline stages rather than only resolution.
- **No new step definitions expected.** All three scenarios reuse step
  text already registered in
  `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`,
  which is parameterized by unit type/direction/HP (`a {word} PC at
  column...`, etc.) rather than hardcoded to melee. This is exactly the
  generic-step-library design melee's extraction established, now paying
  off for a second unit with zero new step-definition work.

## Implementation notes from handoff

The following is carried over verbatim from the handoff bundle's
`rogue-implementation-notes.md`:

> # Rogue implementation notes (handoff)
>
> **Provenance:** This bundle was produced by **direct extraction** from
> existing, already-tested code and specs — not a harness design session.
> Per `docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`,
> the rogue's behavior is already fully pinned down by
> `openspec/specs/pc-archetypes/spec.md`'s "Rogue PC archetype" requirement
> and by the already-implemented, already-tested engine
> (`client-games/src/games/dungeon-tactics-solo/unitDefs.ts`,
> `attackFootprint.ts`, `pc.ts`'s `validMoveDests`/`attackSquares`, plus
> `unitDefs.test.ts`/`attackFootprint.test.ts`). No new design decisions were
> made; this is a format conversion (prose scenario + implementation →
> literal Gherkin).
>
> **Baseline is genuinely empty for this unit.** Unlike melee (which already
> had one passing scenario carried over from the Gherkin-runner phase),
> track-web's canonical `features/` tree has no `rogue.feature` yet and no
> prior rogue-related scenario anywhere in the engine test suite (confirmed
> by grep across `client-games/src/games/dungeon-tactics-solo/`). All three
> scenarios in this bundle are genuinely new Gherkin coverage, and the
> changeset correctly marks all three `status: "added"` against an empty
> baseline.
>
> **Engine data for rogue** (`unitDefs.ts`):
> - `movement.range: 4`
> - `attack.damage: 1`
> - `attack.targeting: { mode: 'direction', arc: 'cardinal', minRange: 1, maxRange: 1 }`
> - `attack.propagation: { shape: 'single', penetration: 'none' }`
>
> This is structurally identical to melee's def except `attack.damage` (1 for
> rogue vs. 2 for melee) — same move range, same single-adjacent-cell attack
> footprint. Confirmed against `unitDefs.test.ts`'s existing table (`rogue:
> { maxHp: 3, range: 4, damage: 1, shape: 'single', penetration: 'none',
> minRange: 1, maxRange: 1 }`) and `attackFootprint.test.ts`'s `describe('single
> (melee/rogue)', ...)` block, which already exercises the shared footprint
> logic both units use.
>
> **Scenario derivation, mirroring melee's precedent exactly:**
> - `rogue-move-range` — same technique as `melee-move-range`: runs along
>   board row 7 (no structures on that row per `bundledMap.ts`), asserting a
>   tile at exactly range 4 is reachable and the next tile out (range 5) is
>   not. A boundary check, not full reachable-set enumeration, for the same
>   reason melee's did this (fragile/error-prone to hand-compute the full
>   reachable set against the real board's structure layout).
> - `rogue-attack-targeting` — same technique as `melee-attack-targeting`:
>   exercises `attackSquares` after `setPlanAttack` (the planning path),
>   distinct from the damage scenario's `resolvePcAction` (the resolution
>   path).
> - `rogue-attack-adjacent-npc` — same shape as melee's carried-forward
>   scenario, but the expected NPC HP differs to reflect rogue's lower
>   damage: an NPC starting at 3 HP ends at 2 HP (1 damage), vs. melee's 3 →
>   1 (2 damage).
>
> **No step definitions are expected to be new.** All three scenarios reuse
> step text already registered in
> `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`
> (`a {word} PC at column...`, `the player queries valid move destinations
> for the PC`, `the player selects the attack direction {word} for the
> PC`, `the PC attacks to the {word}`, and the corresponding `Then` steps),
> which are already parameterized by unit type and take no rogue-specific
> work — this is exactly why melee's step library was written generically
> in the first place.
>
> **Explicitly out of scope for this bundle:** the prose spec's "Rogue
> color" scenario (fill color `0xe67e22`). Per the same engineer direction
> that applied to melee, unit-definition Gherkin coverage does not test
> color or anything that interacts with Phaser — rendering is out of scope
> for step definitions run against engine state, not Phaser.
>
> **Capability split precedent:** phase 08a's status notes record that
> melee was split out of the shared `pc-archetypes` capability into its own
> `melee-archetype` capability by explicit engineer direction, and that
> `rogue`/`ranger`/`magic-user` are "expected to follow the same
> per-unit-capability split" as their own bundles land. This bundle assumes
> that precedent applies to rogue too (own `rogue-archetype` capability),
> subject to the engineer confirming via the `scenario-to-change` skill's
> capability-selection step rather than silently assuming it.

This section is informational only; it did not change what's in
`features/rogue.feature` or the `specs/` deltas beyond what's described
above.

## Risks / Trade-offs

- **[Risk]** Splitting rogue out of `pc-archetypes` while ranger/
  magic-user stay behind leaves the capability structure inconsistent
  until those two get their own 08a bundles. **Mitigation:** phase 08a is
  explicitly scoped to run once per unit, so this is an expected
  intermediate state, not a bug — the remaining two will follow the same
  split pattern in their own changes.

## Migration Plan

No runtime migration — this is a test-coverage and spec-organization
change only. On archive, `features/rogue.feature` merges into the
canonical tree (a new file, since none existed before) and
`openspec/specs/pc-archetypes/spec.md` / `openspec/specs/rogue-archetype/spec.md`
are updated per the deltas below.
