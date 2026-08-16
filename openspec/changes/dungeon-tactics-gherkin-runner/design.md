## Context

See proposal.md - Why. Relevant existing state:

- Root `vitest.config.mts` globs `client-games/src/**/*.test.ts` (and equivalents for other client apps) — there is no `*.spec.ts` pattern in the include list, and no per-workspace Vitest config.
- `pc.ts`/`npc.ts` are "pure" only in the sense of holding no Phaser/React state, but they still import `defStore.ts` and `contentStore.ts` for unit stats and map data. Both stores eagerly seed themselves from a bundled fallback table (`seedFromBundled()` in `defStore.ts`, `deserialize(BUNDLED_MAP.map)` in `contentStore.ts`) at module-load time, and only hit the network if `loadFromServer()` is explicitly called. Existing unit tests (`npc.test.ts`, `attackFootprint.test.ts`) already rely on this — they import `pc.ts`/`npc.ts` directly and never call `loadFromServer()`, so no network I/O occurs.
- `client-games/package.json` currently has no `devDependencies` block and no local `test` script; testing happens through the root `npm test` (`vitest run`) using the root config's include globs.

## Goals / Non-Goals

**Goals:**
- Wire `@amiceli/vitest-cucumber` so one `.feature` file drives a real Vitest test under the existing `npm test`.
- Keep the example deterministic and network-free, consistent with how `pc.ts`/`npc.ts` are already unit-tested.

**Non-Goals:**
- Writing the full step catalog or real scenario content (phase 04 / phase 08).
- Changing `vitest.config.mts`'s include globs, environment, or any other test configuration.
- Any change to `defStore.ts`/`contentStore.ts` behavior.

## Decisions

### File naming: `.test.ts`, not `.spec.ts`
The phase doc's carried-over decision text says step-definition files pair with `.feature` files as `*.spec.ts`. That does not match this repo: `vitest.config.mts`'s `include` only globs `*.test.ts` for every workspace, and every existing test in `dungeon-tactics-solo/` (`npc.test.ts`, `attackFootprint.test.ts`, etc.) uses that suffix. Using `.spec.ts` here would silently produce a test file Vitest never runs. Decision: step-definition files use the `.test.ts` suffix (e.g. `melee-attack.feature.test.ts` alongside `melee-attack.feature`), matching the project-wide convention instead of the phase doc's literal wording.

### No changes to `vitest.config.mts` or `client-games/package.json` scripts
`@amiceli/vitest-cucumber` exposes `loadFeature()`/`describeFeature()` as ordinary functions called from a `.test.ts` file — it needs no reporter, plugin, or config change to run under the existing root Vitest config. Only `client-games/package.json`'s `devDependencies` changes (new entry). This keeps the "no second test runner" goal literal, not just directional.

### Example scenario: melee PC attack via `pc.ts`
Reuses the existing bundled-fallback seeding (`defStore.ts`'s `seedFromBundled()`, `contentStore.ts`'s bundled map) the same way `npc.test.ts` already does — call `pc.ts` functions directly against a hand-built `GameState`/`Unit`, no mocking, no `loadFromServer()`. This is the smallest possible proof that Gherkin steps can drive the real engine deterministically.

### Convention doc placement: inline in `features/`
A `README.md` inside `client-games/src/games/dungeon-tactics-solo/features/` (rather than a separate file under `docs/games/dungeon-tactics/`) keeps the convention next to the code a future author is editing, consistent with this repo's colocate-tests-with-source pattern already cited in the phase doc. Cross-links from `docs/games/dungeon-tactics/dungeon-harness-phases/phase-02-trackweb-gherkin-runner.md` are not required since the phase doc already points here for the design record.

## Risks / Trade-offs

- **[Risk]** A future contributor copies the phase doc's literal `.spec.ts` wording and creates a file Vitest silently never runs. → **Mitigation:** the `features/README.md` states the `.test.ts` requirement explicitly and the example file demonstrates it.
- **[Risk]** `@amiceli/vitest-cucumber`'s API surface (`loadFeature`/`describeFeature`) could shift between versions in ways that affect phase 04's step-catalog approach. → **Mitigation:** pin the devDependency version; phase 04 is scoped separately and can re-evaluate if needed.

## Testing

- The example `.feature` + step-definition file itself IS the test coverage for the new "Gherkin runner" capability — `npm test` executing it green is the acceptance check for all four requirements in `specs/dungeon-tactics-gherkin-runner/spec.md`.
- No additional test infrastructure is needed beyond that one scenario per the proposal's proof-of-wiring scope.
