## Why

The dungeon-tactics-solo engine (`pc.ts`/`npc.ts`/`turn.ts`) is currently tested only with ordinary Vitest unit tests. The dungeon-harness plan (see `docs/games/dungeon-tactics/dungeon-harness-phases/README.md`) wants scenario-level acceptance coverage expressed as Gherkin `.feature` files, readable by non-engineers and reusable as a shared vocabulary between track-web and the harness repo. Nothing in track-web can run `.feature` files today — this change adds that ability, scoped to a single proof-of-wiring example, so later phases (the step catalog and real scenario content) have a foundation to build on.

## What Changes

- Add `@amiceli/vitest-cucumber` as a devDependency of `client-games`, so `.feature` files run as ordinary Vitest tests via `npm test` — no second test runner/CLI alongside the existing Vitest setup.
- Create `client-games/src/games/dungeon-tactics-solo/features/` to hold `.feature` files and their step-definition files, colocated with the pure engine they exercise (not the server-side schema mirror in `src/games/dungeon-tactics/`).
- Add one trivial example `.feature` + matching step-definition test file exercising an existing pure engine function (e.g. a melee unit's attack via `pc.ts`), proving the Gherkin-to-Vitest wiring end-to-end. This is proof-of-wiring only; real scenario content is out of scope (tracked separately as phase 08).
- Document the step-writing convention: step definitions build `GameState`/`UnitDef` inputs and assert outcomes by calling `pc.ts`/`npc.ts`/`turn.ts` directly against in-memory state, never through `defStore.ts`/`contentStore.ts` (which do network I/O against track-web's own `/api` and aren't appropriate for deterministic tests).

## Capabilities

### New Capabilities
- `dungeon-tactics-gherkin-runner`: track-web's ability to run Gherkin `.feature` files as Vitest acceptance tests against the dungeon-tactics-solo engine, including the file layout and step-definition convention future scenario authors follow.

### Modified Capabilities
(none — this is additive tooling for the existing `dungeon-tactics-solo` engine; no existing capability's requirements change)

## Impact

- **Code:** `client-games/package.json` (new devDependency), new directory `client-games/src/games/dungeon-tactics-solo/features/` (one `.feature` file, one step-definition test file, one convention doc).
- **Test config:** none expected — root `vitest.config.mts` already includes `client-games/src/**/*.test.ts`; the step-definition file must use a `.test.ts` suffix (not `.spec.ts`) to be picked up, since track-web's Vitest config only globs `*.test.ts`.
- **Dependencies:** adds `@amiceli/vitest-cucumber` (devDependency only, no production bundle impact — confirms the CLAUDE.md build-cost guidance is unaffected since this never ships to the client bundle).
- **Downstream:** unblocks phase 04 (step catalog, same repo) and harness-repo phases 06/07, which read the convention this phase documents.
