# Gherkin scenarios for dungeon-tactics-solo

`.feature` files here run as ordinary Vitest tests via
[`quickpickle`](https://github.com/dnotes/quickpickle) — same tool
(Vitest), not a second test runner or CLI, but a **separate command**:

```bash
npm run test:dungeon-tactics
```

These scenarios are **not** part of the default `npm test` (which uses the
shared root `vitest.config.mts`) — they run via their own
`vitest.dungeon-tactics.config.mts`, so every other workspace's tests don't
pay the cost of loading quickpickle's Cucumber parsing/expression libraries.
Run `npm run test:dungeon-tactics` whenever you change anything under
`client-games/src/games/dungeon-tactics-solo/` (engine, step definitions, or
`.feature` files) — `npm test` alone will not catch a regression here.

`.feature` files execute directly (no paired `.feature.test.ts`/spec file);
step definitions live in `steps/` and are registered globally, matched by
[Cucumber Expression](https://github.com/cucumber/cucumber-expressions)
(`{int}`, `{word}`, `{string}`, …) against step text in **any** `.feature`
file in this directory. One step definition backs every scenario that uses
matching phrasing, across units and files — the `.feature` file is the sole
source of truth for a scenario's behavior; nothing restates it in code.

Previously this used `@amiceli/vitest-cucumber`, which requires each
`.feature` file to pair with its own step-definition file, and each
`Scenario` block to declare its steps with the exact literal text of that
one scenario (no parameter matching, no reuse across scenarios). That meant
every scenario's Given/When/Then text was effectively duplicated — once in
the `.feature` file, once as a literal string argument in the paired
`.test.ts` — making the `.feature` file redundant with the code next to it.
Migrated to `quickpickle` (built on the same official `@cucumber/gherkin`
and `@cucumber/cucumber-expressions` libraries) to fix that, while still
running natively inside Vitest. It was initially wired into the shared root
`vitest.config.mts`, but that made every workspace's tests pay quickpickle's
import cost via a global `setupFiles` entry — moved to its own
`vitest.dungeon-tactics.config.mts`/`npm run test:dungeon-tactics` shortly
after for that reason.

## Step-writing convention

- Add new step definitions to `steps/` (e.g. `pc.steps.ts` for PC-related
  steps, `npc.steps.ts` if NPC-only steps are needed later), and register
  the file in `steps/index.ts`. `vitest.dungeon-tactics.config.mts`'s
  `test.setupFiles` loads `steps/index.ts` once before the suite runs,
  which is what makes every step definition available to every `.feature`
  file.
- Prefer parameterized step text (`{int}`, `{word}`, `{string}`) over literal
  numbers/words baked into the step definition, so one step definition
  covers many concrete scenario lines (different units, positions,
  directions, HP values) instead of needing a new definition per literal
  value.
- Steps build `GameState`/`UnitDef` inputs by hand (typically starting from
  `initialState()` in `../npc` and overriding `units`) and assert outcomes
  by calling `pc.ts`, `npc.ts`, and `turn.ts` functions directly against
  that in-memory state. Per-scenario state lives on quickpickle's `world.data`
  (a fresh `Record<string, any>` per scenario) — see `steps/pc.steps.ts`'s
  `getState`/`setState` helpers.
- Step definitions must **never** import `defStore.ts` or `contentStore.ts`
  directly. Both perform network I/O against track-web's own `/api`
  (`loadFromServer()`); calling that from a test would make it
  non-deterministic and dependent on a running server. `pc.ts`/`npc.ts`
  already import those stores internally for bundled-fallback data (unit
  stats, map layout) — that's fine, since it never hits the network unless
  `loadFromServer()` is called explicitly, which these tests never do.
