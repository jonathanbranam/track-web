## Why

The dungeon-harness effort that this repo grew a surface for is stopped and
being backed out (`harness:docs/dungeon-harness/STATUS.md`). Two pieces of
track-web exist **only** to feed that effort — the Gherkin step catalog and
the `scenario-to-change` engineer skill — and nothing in the game or its
tests reads either. A third piece, the split of `melee` and `rogue` into
their own spec capabilities, was done as a by-product of that effort and
left the four PC archetypes filed across three capabilities with no rationale
that survives it.

This is step 1–2 of `harness:docs/dungeon-harness/backout-plan.md`, Part 1.
It removes the harness-facing surface and restores the archetype filing. The
game is untouched.

## What Changes

- **Delete the step catalog** (phase 04): `features/steps-catalog.json`, the
  `generate-step-catalog.ts` script, the `generate:step-catalog` npm script,
  and the catalog references in `features/README.md`.
- **Delete the engineer skill** (phase 07): `.claude/skills/scenario-to-change/`.
  This is the only skill removed; the `track-web:*` OpenSpec skills are
  untouched.
- **Refile the PC archetypes**: move the "Melee PC archetype" and "Rogue PC
  archetype" requirements **verbatim** back into `pc-archetypes`, and retire
  the `melee-archetype` and `rogue-archetype` capabilities. One capability
  again holds all four PC archetypes plus "PC HP starts at 3", as it did
  before the split.

**Explicitly kept** (frozen, not removed): the Gherkin runner
(`vitest.dungeon-tactics.config.mts`, `npm run test:dungeon-tactics`), the
`melee` and `rogue` `.feature` files, and `features/steps/`. They are real
regression coverage of shipped behavior. Frozen means: keep them green, do
not add scenarios through a harness, do not build new tooling on them.

**Not in scope**: removing quickpickle/cucumber, any change to the game or the
`@repo/dungeon-engine` package, and anything in the harness repo.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pc-archetypes`: gains the melee and rogue archetype requirements, moved
  verbatim from their split-out capabilities.
- `melee-archetype`: retired (capability directory deleted; see design.md) — its one requirement moves to `pc-archetypes`.
- `rogue-archetype`: retired — its one requirement moves to `pc-archetypes`.
- `dungeon-tactics-step-catalog`: retired — the capability exists only to
  serve harness-side scenario drafting.
- `dungeon-tactics-engineer-skill`: retired — it consumes a harness handoff
  bundle that will never be produced again.

## Impact

- **Code**: `client-games/scripts/generate-step-catalog.ts` (deleted),
  `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json`
  (deleted), `client-games/package.json` (one script line),
  `features/README.md` (catalog references).
- **Skills**: `.claude/skills/scenario-to-change/` (deleted).
- **Specs**: two capabilities retired outright, two merged into
  `pc-archetypes`, whose Purpose text needs updating to stop referring to the
  split.
- **No behavior change**: no game code, no API, no route, no database, no
  deploy wiring. `npm test`, `npm run test:dungeon-tactics`, and
  `npm run build:games` must all still pass unchanged.
