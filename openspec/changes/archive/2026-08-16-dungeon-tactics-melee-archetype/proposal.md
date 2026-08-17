## Why

The `melee` PC archetype's behavior is already fully pinned down by
`openspec/specs/pc-archetypes/spec.md`'s "Melee PC archetype" requirement
and by the already-implemented, already-tested engine
(`unitDefs.ts`, `attackFootprint.ts`, `pc.ts`). What's missing is real,
executable Gherkin coverage: `features/melee.feature` today has only one
scenario (attack damage), leaving move range and attack targeting
untested at the Gherkin layer. This change extracts that missing coverage
directly from the existing prose spec and implementation — no new design
decisions — per
`docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`.

At the same time, `pc-archetypes` today bundles all four PC archetypes
(melee, ranger, magic-user, rogue) into one capability spec. This change
splits `melee` out into its own dedicated capability, so melee's
requirement and its Gherkin scenarios live together under one capability
rather than mixed in with the other three archetypes.

## What Changes

- Add two new Gherkin scenarios to `features/melee.feature`: move range
  (range 4, orthogonal) and attack targeting (single adjacent cell in the
  chosen direction). The existing attack-damage scenario is unchanged.
- **BREAKING** (spec structure only, not runtime behavior): remove the
  "Melee PC archetype" requirement from the `pc-archetypes` capability.
- Add a new `melee-archetype` capability spec covering melee's full
  requirement (move range, attack targeting, attack damage, color),
  carrying forward the requirement text removed from `pc-archetypes`.

## Capabilities

### New Capabilities
- `melee-archetype`: the `melee` PC archetype's full behavior (move
  range, attack targeting, attack damage, rendered color) and its
  executable Gherkin scenarios.

### Modified Capabilities
- `pc-archetypes`: remove the "Melee PC archetype" requirement (melee
  moves to its own capability, above). Ranger, magic-user, and rogue
  requirements are unaffected.

## Impact

- `client-games/src/games/dungeon-tactics-solo/features/melee.feature` —
  two new scenarios.
- `client-games/src/games/dungeon-tactics-solo/features/melee.feature.test.ts`
  — two new step-definition blocks (engine calls only, per the
  `dungeon-tactics-gherkin-runner` capability's convention).
- `openspec/specs/pc-archetypes/spec.md` — "Melee PC archetype"
  requirement removed.
- `openspec/specs/melee-archetype/spec.md` — new capability spec.
- No engine code changes — `unitDefs.ts`/`attackFootprint.ts`/`pc.ts`
  already implement this behavior correctly; this change only adds test
  coverage and reorganizes the spec.
