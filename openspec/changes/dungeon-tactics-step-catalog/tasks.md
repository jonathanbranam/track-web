## 1. Prerequisite: phase 02 implementation

- [x] 1.1 Confirm `client-games/src/games/dungeon-tactics-solo/features/` exists with at least one `.feature` file. Done — phase 02 (`dungeon-tactics-gherkin-runner`, commit `92fa2cc`) is implemented, including `melee-attack.feature` with an `And` step, which exercises the keyword-resolution logic in task 2.2.

## 2. Generator script

- [x] 2.1 Create `client-games/scripts/generate-step-catalog.ts` that walks `client-games/src/games/dungeon-tactics-solo/features/*.feature`. Implemented as a lightweight line-based extractor rather than `loadFeature()` from `@amiceli/vitest-cucumber` — see design.md's updated Decisions section for why (the package's public API turns out to only work inside a live Vitest run, not as a standalone script).
- [x] 2.2 Implement keyword resolution: scan each file's lines top-to-bottom tracking the last-seen concrete Given/When/Then, and file `And`/`But` step lines under that resolved keyword instead of literally (skipping doc-string block bodies so their content isn't misparsed as steps).
- [x] 2.3 Deduplicate collected `(keyword, details)` pairs (trimmed) across all files, then build `{ given: string[], when: string[], then: string[] }` with each array alphabetically sorted.
- [x] 2.4 Write the result to `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json`, and handle the zero-`.feature`-files case by writing a catalog with empty arrays rather than erroring.

## 3. Wiring

- [x] 3.1 Add `"generate:step-catalog": "tsx scripts/generate-step-catalog.ts"` to `client-games/package.json`'s `scripts` block.

## 4. Verification

- [x] 4.1 Run `npm run generate:step-catalog -w client-games` against the real `features/` directory (containing `melee-attack.feature`) and confirm `steps-catalog.json` is non-empty and contains that scenario's step texts under the correct keywords — including its `And` step (`an NPC with 3 hp at column 6, row 5`), which must resolve to `given`, not a literal `and` bucket. Verified: output contains 2 `given`, 1 `when`, 1 `then`, with the `And` line correctly filed under `given`.
- [x] 4.2 Re-run the script a second time with no `.feature` changes and confirm the output is byte-for-byte identical (sorted, deterministic output). Verified via `diff` — identical.
- [x] 4.3 Run `npm run build:games` (or the equivalent `client-games` build script) and confirm zero TypeScript errors. Verified — `tsc -b && vite build` succeeded (the script lives outside `tsconfig.app.json`'s `src` include, so it isn't type-checked or bundled by this build; it's a dev-only script run via `tsx`).
- [x] 4.4 Confirm no other client app's test config, build script, or deploy file (`Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`) needed changes — this change adds no new client app, API route, or runtime dependency. Confirmed — no such files touched, and `@amiceli/vitest-cucumber` is unused by this change after the pivot to a dependency-free extractor.
