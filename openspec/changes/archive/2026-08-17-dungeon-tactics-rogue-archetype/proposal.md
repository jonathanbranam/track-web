## Why

The `rogue` PC archetype's behavior is already fully pinned down by
`openspec/specs/pc-archetypes/spec.md`'s "Rogue PC archetype" requirement
and by the already-implemented, already-tested engine (`unitDefs.ts`,
`attackFootprint.ts`, `pc.ts`). track-web has zero Gherkin coverage for
rogue today — this change extracts that missing coverage directly from
the existing prose spec and implementation, no new design decisions, per
`docs/games/dungeon-tactics/dungeon-harness-phases/phase-08a-trackweb-existing-unit-extraction.md`.

At the same time, `pc-archetypes` today bundles ranger, magic-user, and
rogue into one capability spec (melee was already split out in
`2026-08-16-dungeon-tactics-melee-archetype`). This change splits `rogue`
out into its own dedicated capability too, per that change's status notes
recording rogue/ranger/magic-user as expected to follow the same
per-unit-capability split.

## What Changes

- Add three new Gherkin scenarios to a new `features/rogue.feature`: move
  range (range 4, orthogonal), attack targeting (single adjacent cell in
  the chosen direction), and attack damage (1 damage against an adjacent
  NPC). All three are new coverage — track-web has no prior rogue
  scenario anywhere.
- **BREAKING** (spec structure only, not runtime behavior): remove the
  "Rogue PC archetype" requirement from the `pc-archetypes` capability.
- Add a new `rogue-archetype` capability spec covering rogue's full
  requirement (move range, attack targeting, attack damage, color),
  carrying forward the requirement text removed from `pc-archetypes`.

## Capabilities

### New Capabilities
- `rogue-archetype`: the `rogue` PC archetype's full behavior (move
  range, attack targeting, attack damage, rendered color) and its
  executable Gherkin scenarios.

### Modified Capabilities
- `pc-archetypes`: remove the "Rogue PC archetype" requirement (rogue
  moves to its own capability, above). Ranger and magic-user requirements
  are unaffected.

## Impact

- `client-games/src/games/dungeon-tactics-solo/features/rogue.feature` —
  new file, three scenarios.
- `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`
  — no changes expected; all three scenarios reuse existing generic step
  definitions (parameterized by unit type/direction/HP already).
- `openspec/specs/pc-archetypes/spec.md` — "Rogue PC archetype"
  requirement removed.
- `openspec/specs/rogue-archetype/spec.md` — new capability spec.
- No engine code changes — `unitDefs.ts`/`attackFootprint.ts`/`pc.ts`
  already implement this behavior correctly; this change only adds test
  coverage and reorganizes the spec.
