## Context

See proposal.md - Why. This directly amends phase 02 of the
`dungeon-harness` plan
(`docs/games/dungeon-tactics/dungeon-harness-phases/phase-02-trackweb-gherkin-runner.md`),
whose tool choice (`@amiceli/vitest-cucumber`) is being replaced, and lands
after `dungeon-tactics-melee-archetype`, whose real scenario content is
carried forward onto the new step library unchanged.

## Goals / Non-Goals

**Goals:**
- A single step definition, matched by pattern, backs any scenario using
  matching phrasing — across units and `.feature` files — instead of one
  step-definition file per `.feature` file with fully literal step text.
- `.feature` files remain the sole source of truth: nothing in code restates
  a scenario's Given/When/Then text.
- Stay inside `npm test` (`vitest run`) — no second CLI/test runner, per
  phase 02's original constraint.

**Non-Goals:**
- No change to melee's (or any future unit's) scenario *content* — same 3
  scenarios, same passing assertions, same engine code.
- No change to phase 04's step-catalog generator, which parses `.feature`
  files directly and never depended on the runner tool.
- Not attempting to optimize `npm test`'s wall-clock time beyond what's
  needed to confirm the swap doesn't meaningfully regress it (see Risks).

## Decisions

- **`quickpickle` over `@cucumber/cucumber` (the official runner).**
  `@cucumber/cucumber` ships its own CLI (`cucumber-js`) with its own
  runner/World/hooks model — it does not execute inside Vitest. Adopting it
  would mean dungeon-tactics feature tests stop running under `npm test`
  unless a second command is also run, with separate config, watch mode,
  and no shared coverage reporting with the rest of the monorepo's suite.
  That's the same second-runner cost phase 02 explicitly rejected for
  `@amiceli/vitest-cucumber`, and it still applies to real `cucumber-js`.
  `quickpickle` is built on the same official `@cucumber/gherkin` and
  `@cucumber/cucumber-expressions` parsing/expression libraries `cucumber-js`
  itself uses, wired in as a genuine Vitest plugin instead — so canonical
  Gherkin/Cucumber-Expression semantics are preserved without losing
  single-runner `npm test`.
  - Alternative considered: stay on `@amiceli/vitest-cucumber` and just
    write shorter step bodies via shared helper functions called from each
    `Scenario` block. Rejected — the library still requires each `Scenario`
    to declare its own `Given`/`When`/`Then` calls with the scenario's exact
    literal step text (no parameter expressions, no cross-scenario
    matching), so the `.feature` text would still be effectively restated
    in code; only the callback *bodies* would shrink, not the core
    duplication problem.
- **Step definitions live in a `steps/` directory, not paired 1:1 with
  `.feature` files.** quickpickle has no per-file step scoping — Given/When/
  Then registered anywhere are global — so there's no mechanical reason to
  keep a file-per-feature convention. Steps are grouped by subject
  (`pc.steps.ts` today; an `npc.steps.ts` etc. can be added later) and
  registered via a single `steps/index.ts` barrel loaded once through
  `test.setupFiles`.
- **Parameter expressions (`{int}`, `{word}`) over literal step text.** This
  is what actually kills the duplication: `Given('a {word} PC at column
  {int}, row {int}', ...)` matches `a melee PC at column 5, row 5`, `a rogue
  PC at column 2, row 7`, etc. — the same step definition will directly
  cover rogue/ranger/magic-user's future 08a bundles without new step code,
  as long as their scenario phrasing matches the existing patterns.
- **`world.data` as the per-scenario state bag**, following quickpickle's
  own `QuickPickleWorldInterface.data: Record<string, any>` (fresh per
  scenario). Small `getState`/`setState` helpers in `pc.steps.ts` wrap it so
  step bodies don't touch `world.data` directly.

## Risks / Trade-offs

- **[Risk]** `quickpickle` is a small, single-maintainer project (v1.11.2)
  versus `@cucumber/cucumber`'s large, long-established org — real maturity
  risk (bus factor, slower fixes, smaller community) that the official
  runner wouldn't carry. **Mitigation:** it depends on the same official
  `@cucumber/*` parsing/expression packages for the parts that matter most
  (Gherkin correctness, expression matching), so the surface area unique to
  quickpickle itself (the Vitest plugin glue) is comparatively small. If it
  becomes a blocker later, the step-catalog generator and `.feature` files
  are unaffected by the runner choice, so a future swap stays scoped to the
  `steps/` directory and `vitest.config.mts`.
- **[Risk]** `test.setupFiles` in the root `vitest.config.mts` is global —
  every one of the repo's ~47 test files now imports the step library (and
  transitively `@cucumber/gherkin`/`cucumber-expressions`) before running,
  not just the dungeon-tactics ones. Measured impact: `npm test` wall-clock
  went from ~5.4s to ~8.8s. **Mitigation:** none applied in this change —
  flagged to the engineer as a follow-up (`tasks.md`) to scope
  `setupFiles`/the plugin to only the dungeon-tactics feature tests via a
  Vitest workspace/project split, if the regression becomes bothersome as
  more scenarios are added.
- **[Risk]** `npm audit` reports new moderate/high advisories pulled in via
  `quickpickle`'s dependency tree (`@cucumber/gherkin`, `js-yaml`, `lodash`,
  transitively). **Mitigation:** these are devDependencies used only for
  local/CI test execution, never shipped in any client bundle or exposed to
  untrusted input — consistent with the existing risk profile of this
  repo's other dev tooling (several of which already carry similar
  advisories per `npm audit` today).

## Migration Plan

No runtime migration. On archive: `openspec/specs/dungeon-tactics-gherkin-runner/spec.md`
is updated to describe `quickpickle` and the shared-`steps/`-directory
convention in place of `@amiceli/vitest-cucumber` and the 1:1 file-pairing
convention. Already-implemented code changes (this change's actual
deliverable) land ahead of archive, same as `dungeon-tactics-melee-archetype`.
