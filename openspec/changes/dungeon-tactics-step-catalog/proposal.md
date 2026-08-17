## Why

The dungeon-harness plan (`docs/games/dungeon-tactics/dungeon-harness-phases/README.md`) has the harness repo draft new Gherkin scenarios by reusing existing step vocabulary instead of inventing near-duplicates, and by flagging which steps in a draft are genuinely new (harness repo's phase 06). That requires a machine-readable catalog of every Given/When/Then step text already implemented in track-web's `.feature` files. Phase 02 (`dungeon-tactics-gherkin-runner`) establishes the `.feature`/step-definition convention and one example scenario but produces no such catalog. This change adds the generator.

## What Changes

- Add a script, `client-games/scripts/generate-step-catalog.ts`, that walks `client-games/src/games/dungeon-tactics-solo/features/*.feature` and extracts every unique Given/When/Then step text using a small dependency-free line-based extractor (see design.md — `@amiceli/vitest-cucumber`'s `loadFeature()` was the original plan but turned out to only work inside a live Vitest run, not a standalone script).
- Emit `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json` — a flat, deterministically-ordered list of unique step texts grouped by keyword (Given/When/Then), mechanically derived from the canonical `.feature` tree so "implemented steps" is definitionally "step text present in `features/`".
- Wire an npm script (e.g. `generate:step-catalog` in `client-games/package.json`) that runs the generator on demand. No pre-test hook or CI staleness check in v1 — manual/on-demand is the cheapest option and matches the proposal's cost-consciousness; revisit only if the catalog is observed to drift from reality in practice.
- Regenerate the catalog against phase 02's example scenario (`melee-attack.feature`) to confirm the pipeline produces a real, non-empty, correctly-shaped catalog end-to-end.

## Capabilities

### New Capabilities
- `dungeon-tactics-step-catalog`: track-web's ability to mechanically generate a JSON catalog of every implemented Gherkin step text from the canonical `.feature` tree, on demand.

### Modified Capabilities
(none — this is additive tooling; it does not change any existing capability's requirements, including `dungeon-tactics-gherkin-runner`'s)

## Impact

- **Code:** new `client-games/scripts/generate-step-catalog.ts`; new generated file `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json`; new npm script in `client-games/package.json`.
- **Dependencies:** none added, and none reused either — the generator is a self-contained script with no Gherkin-parsing dependency (see design.md for why `@amiceli/vitest-cucumber` wasn't usable here despite being a devDependency from phase 02).
- **Test config / deploy files:** none expected — this is a dev-time script, not a runtime app; no Caddyfile/server-deploy/dev-local changes.
- **Downstream:** unblocks harness repo's phases 06 and 08, which read `steps-catalog.json` to check draft scenarios against existing step vocabulary.
