## Why

`melee-archetype`'s Gherkin coverage (`features/melee.feature`) currently
proves move range, attack targeting, and attack damage in isolation, but
misses two behaviors the already-implemented engine also enforces for
melee: that its move range respects obstacles/occupied tiles (not just an
open-board boundary), and that it can move and attack in the same turn.
Both are already implemented and exercised by non-Gherkin tests
(`pc.ts`'s `validMoveDests` BFS, the `move-attack` `PcAction` variant), so
this is extraction — same category of work as the melee move-range/
attack-targeting scenarios added in the archived
`dungeon-tactics-melee-archetype` change (phase 08a of the
`dungeon-harness` plan, see
`docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`)
— no new design decisions, no engine changes.

These scenarios are scoped to `melee-archetype` specifically, not a
shared/generic capability, per explicit engineer direction: move-blocking
and move-then-attack could plausibly diverge per archetype in the future
(e.g. a unit with pass-through movement, or one that can't act after
moving), even though today the behavior is generic engine code shared by
all PC archetypes.

## What Changes

- Add two new Gherkin scenarios to `features/melee.feature`, extending
  the existing `melee-archetype` capability's "Melee PC archetype"
  requirement:
  - **Melee movement is blocked by obstacles/occupied tiles** — a tile
    occupied by a structure or another unit is never a valid move
    destination, and blocks paths from routing through it.
  - **Melee can move and attack in the same turn** — a single turn action
    can move the PC and then resolve an attack from its new position.
- New step definitions in `features/steps/pc.steps.ts` (the shared
  quickpickle step library) to back these scenarios: placing a structure
  or a second unit as a movement obstacle, and issuing a combined
  `move-attack` action.

Explicitly **out of scope**: PC HP reaching 0 / removal-on-death. That
behavior is governed by `pc-archetypes`' existing "PC HP starts at 3"
requirement, which is generic to all PC archetypes, not melee-specific —
it does not belong in this melee-scoped change.

## Capabilities

### Modified Capabilities
- `melee-archetype`: add two scenarios ("Melee movement respects
  obstacles", "Melee move-and-attack in one turn") to the existing "Melee
  PC archetype" requirement. Move range, attack targeting, attack damage,
  and color are unchanged.

## Impact

- `client-games/src/games/dungeon-tactics-solo/features/melee.feature` —
  two new scenarios.
- `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`
  — new Given/When/Then step definitions.
- `openspec/specs/melee-archetype/spec.md` — two new scenarios added to
  the existing "Melee PC archetype" requirement.
- No engine code changes — `pc.ts`'s `validMoveDests` and
  `resolvePcAction` already implement this behavior correctly; this
  change only adds Gherkin coverage.
