## Why

`dungeon-tactics-gherkin-shared-steps` wired `quickpickle` into the single
root `vitest.config.mts` via a global `test.setupFiles` entry. That config
is shared by every workspace's tests (`src/`, `client-watch`, `client-games`,
`client-trips`, `client-play`, `client-talks`, `packages/config`) — so all
~47 test files now pay the cost of importing the step library (and
transitively `@cucumber/gherkin`/`@cucumber/cucumber-expressions`) before
running, even though only 1 file actually needs it. That change's own
design.md flagged this as a known, unaddressed regression (`npm test`
wall-clock ~5.4s → ~8.8s) and left "scope it to only the dungeon-tactics
feature tests" as an explicit follow-up. This change does that follow-up:
split the dungeon-tactics `.feature` tests into their own Vitest
config/command, out of the default `npm test` path, run only when actually
working on dungeon-tactics.

## What Changes

- **BREAKING** (dev workflow, not runtime behavior): `npm test` no longer
  runs `client-games/src/games/dungeon-tactics-solo/features/*.feature`.
  Those scenarios move to a new `npm run test:dungeon-tactics` command.
- Add `vitest.dungeon-tactics.config.mts` — a second Vitest config scoped to
  just the `.feature` tests, with the `quickpickle` plugin and step-library
  `setupFiles` that used to live in the shared root config.
- Remove the `quickpickle` plugin, `.feature` include glob, and `setupFiles`
  from the root `vitest.config.mts`, restoring it to only the workspaces'
  ordinary `*.test.ts` files.
- Update the dungeon-tactics Gherkin convention doc and related planning
  docs to point at `npm run test:dungeon-tactics` instead of `npm test`.

## Capabilities

### Modified Capabilities
- `dungeon-tactics-gherkin-runner`: the requirement that `.feature` tests
  run as part of the shared root `npm test` invocation is replaced by a
  requirement that they run via a separate, dungeon-tactics-scoped Vitest
  config/command.

## Impact

- `vitest.config.mts` — quickpickle plugin, `.feature` glob, and
  `setupFiles` removed.
- `vitest.dungeon-tactics.config.mts` — new, scoped Vitest config.
- `package.json` — new `test:dungeon-tactics` script.
- `client-games/src/games/dungeon-tactics-solo/features/README.md` — run
  instructions updated.
- `docs/arch/track-web-architecture.md` — Testing section updated to
  describe the two-config split.
- `CLAUDE.md` — Commands section gains `npm test` and
  `npm run test:dungeon-tactics` entries (previously undocumented).
- `docs/games/dungeon-tactics/dungeon-harness-phases/phase-02-trackweb-gherkin-runner.md`
  — status note updated.
- No engine or scenario-content changes; melee's 3 scenarios still pass,
  unchanged, just under a different command.
