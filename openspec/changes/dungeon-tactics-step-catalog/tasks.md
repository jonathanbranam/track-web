## 1. Prerequisite: phase 02 implementation

- [ ] 1.1 Confirm `client-games/src/games/dungeon-tactics-solo/features/` exists with at least one `.feature` file (phase 02, `dungeon-tactics-gherkin-runner`). If not yet implemented, implement phase 02's `tasks.md` first — its planning artifacts are complete but its tasks are unbuilt.

## 2. Generator script

- [ ] 2.1 Create `client-games/scripts/generate-step-catalog.ts` that walks `client-games/src/games/dungeon-tactics-solo/features/*.feature`, parses each with `loadFeature()` from `@amiceli/vitest-cucumber`, and collects steps from each feature's `background`, `scenarii[].steps`, and `rules[].(background, scenarii[].steps)`.
- [ ] 2.2 Implement per-step-list keyword resolution: track the last-seen concrete Given/When/Then within each individual step list (background, each scenario, each rule's background/scenarios) and file `And`/`But` steps under that resolved keyword instead of literally.
- [ ] 2.3 Deduplicate collected `(keyword, details)` pairs (trimmed) across all files, then build `{ given: string[], when: string[], then: string[] }` with each array alphabetically sorted.
- [ ] 2.4 Write the result to `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json`, and handle the zero-`.feature`-files case by writing a catalog with empty arrays rather than erroring.

## 3. Wiring

- [ ] 3.1 Add `"generate:step-catalog": "tsx scripts/generate-step-catalog.ts"` to `client-games/package.json`'s `scripts` block.

## 4. Verification

- [ ] 4.1 Run `npm run generate:step-catalog -w client-games` against the real `features/` directory (containing phase 02's example scenario) and confirm `steps-catalog.json` is non-empty and contains that scenario's step texts under the correct keywords, including correct resolution of any `And`/`But` step.
- [ ] 4.2 Re-run the script a second time with no `.feature` changes and confirm the output is byte-for-byte identical (sorted, deterministic output).
- [ ] 4.3 Run `npm run build:games` (or the equivalent `client-games` build script) and confirm zero TypeScript errors.
- [ ] 4.4 Confirm no other client app's test config, build script, or deploy file (`Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`) needed changes — this change adds no new client app, API route, or runtime dependency.
