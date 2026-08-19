# Gherkin scenarios for dungeon-tactics-solo

> **⚠️ Kept, but frozen — the plan these were written for is dead.** These
> `.feature` files came out of the `dungeon-harness` plan (phase 08a), which
> was **stopped on 2026-08-18** and is being backed out; see
> `docs/games/dungeon-tactics/dungeon-harness-phases/README.md` and, in the
> sibling repo, `harness/docs/dungeon-harness/STATUS.md`.
>
> **What that means here:** the runner and these scenarios **stay** — they
> are real regression coverage of already-shipped `melee`/`rogue` behavior,
> and removing cucumber is explicitly not in scope yet. What is gone is the
> idea that `.feature` files are a *design surface* fed by a harness: no
> more harness-authored scenarios, and `steps-catalog.json` (phase 04, which
> existed only to feed harness drafting) has been deleted. Keep these green;
> don't build new tooling on them.

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
  `initialState()`, imported from `@repo/dungeon-engine`, and overriding
  `units`) and assert outcomes by calling the engine's PC, NPC, and turn
  functions directly against that in-memory state. Per-scenario state lives on
  quickpickle's `world.data` (a fresh `Record<string, any>` per scenario) — see
  `steps/pc.steps.ts`'s `getState`/`setState` helpers.
- Step definitions import the rules from `@repo/dungeon-engine` and must
  **never** import the host-side loaders (`defStoreLoader.ts`,
  `contentStoreLoader.ts`). Those perform network I/O against track-web's own
  `/api` (`loadFromServer()`); calling that from a test would make it
  non-deterministic and dependent on a running server. The engine's own def and
  content stores are safe to touch: they hold bundled-fallback data (unit stats,
  map layout) and perform no I/O of any kind — a host has to hand them loaded
  content explicitly, which these tests never do.
