## 1. Split the runner

- [x] 1.1 Create `vitest.dungeon-tactics.config.mts` at the repo root: the
      `quickpickle` plugin, `test.include` scoped to
      `client-games/src/games/dungeon-tactics-solo/features/*.feature`, and
      `test.setupFiles` pointed at the shared step library.
- [x] 1.2 Remove the `quickpickle` plugin, `.feature` include glob, and
      `setupFiles` from the root `vitest.config.mts`.
- [x] 1.3 Add `"test:dungeon-tactics": "vitest run --config vitest.dungeon-tactics.config.mts"`
      to root `package.json` scripts.

## 2. Verification

- [x] 2.1 Run `npm test` and confirm it no longer executes `melee.feature`,
      wall-clock time is back down near pre-quickpickle levels, and every
      other test still passes. (46/46 files, 416/416 tests, ~5.9s, `setup 0ms`.)
- [x] 2.2 Run `npm run test:dungeon-tactics` and confirm melee's 3 scenarios
      still pass, unchanged.

## 3. Docs

- [x] 3.1 Update `client-games/src/games/dungeon-tactics-solo/features/README.md`
      to say these tests run via `npm run test:dungeon-tactics`, not `npm test`.
- [x] 3.2 Update `docs/arch/track-web-architecture.md`'s Testing section to
      describe the two-config split.
- [x] 3.3 Add `npm test` and `npm run test:dungeon-tactics` to `CLAUDE.md`'s
      Commands section (replacing the stale "No lint or test commands are
      configured" line), noting the latter only needs to run when working
      on dungeon-tactics.
- [x] 3.4 Update
      `docs/games/dungeon-tactics/dungeon-harness-phases/phase-02-trackweb-gherkin-runner.md`'s
      status note to reference the new command.
- [x] 3.5 Apply the `dungeon-tactics-gherkin-runner` spec delta (handled by
      `archive-change`/`sync-specs`).
