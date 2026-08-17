> Copied from the `harness` repo's
> `harness/docs/dungeon-harness/phases/phase-02-trackweb-gherkin-runner.md`
> as part of the dungeon-harness plan's track-web-scoped phases — see
> [`../dungeon-harness-phases/README.md`](README.md) for why this copy
> exists and how it relates to the other 7 phases (mostly harness-repo
> work). Full design rationale lives in the harness repo's
> `docs/dungeon-harness/proposal.md`.

# Phase 02 — track-web Gherkin test runner

**Status:** Done — implemented via OpenSpec change `dungeon-tactics-gherkin-runner`,
archived 2026-08-16. **Tool superseded 2026-08-16** via
[`dungeon-tactics-gherkin-shared-steps`](../../../../openspec/changes/archive/2026-08-16-dungeon-tactics-gherkin-shared-steps/proposal.md):
`@amiceli/vitest-cucumber` required a step-definition file paired 1:1 with
each `.feature` file and fully literal (non-parameterized) step text per
`Scenario`, which meant a scenario's Given/When/Then text was effectively
duplicated in code — this surfaced building `dungeon-tactics-melee-archetype`'s
real scenario content. Replaced with `quickpickle` (a Vitest plugin built on
the official `@cucumber/gherkin`/`@cucumber/cucumber-expressions` libraries):
`.feature` files run directly (no paired `.test.ts`), and step definitions
are registered once, globally, matched by Cucumber Expression
(`{int}`/`{word}`/`{string}`) across every `.feature` file. Convention now
lives at `client-games/src/games/dungeon-tactics-solo/features/README.md`;
shared steps at that directory's `steps/` subdirectory.

**Repo:** `track-web`
**Depends on:** none (parallel with harness repo's phase 01, harness scaffold)
**Blocks:** phase 04 (this repo); harness repo's phases 06, 07 (which read
what this phase produces)

## Goal

Give track-web the ability to run Gherkin `.feature` files as Vitest
acceptance tests for unit behavior, without Phaser — the "one change for
track-web" from the original ask.

## Decisions carried over from the proposal

- **Tool: `@amiceli/vitest-cucumber`.** track-web runs everything through
  Vitest already (`vitest.config.mts`; no Jest, no existing Cucumber
  dependency — confirmed via `package.json`), so this is the option that
  doesn't add a second test runner/CLI. `.feature` files pair with a
  `*.spec.ts` calling `loadFeature()`/`describeFeature()`, with ordinary
  Vitest assertions per Given/When/Then, running under the existing
  `npm test`.
  - Considered and set aside: classic `@cucumber/cucumber` has a stronger
    built-in global step-registry/dry-run story (which would make phase
    04's catalog close to free), but costs a second CLI/runner alongside
    Vitest for comparatively little gain, since phase 04's catalog approach
    sidesteps needing a step registry at all.
- **Placement: `client-games/src/games/dungeon-tactics-solo/features/`.**
  Follows track-web's existing colocate-tests-with-source convention
  (`unitDefs.test.ts` sits beside `unitDefs.ts`) — this is where the pure
  engine under test (`pc.ts`/`npc.ts`/`turn.ts`) actually lives, not the
  server-side schema mirror in `src/games/dungeon-tactics/`.

## Concrete steps

- Add `@amiceli/vitest-cucumber` as a devDependency of `client-games`.
- Create `client-games/src/games/dungeon-tactics-solo/features/`.
- Write **one** trivial example `.feature` + matching `.spec.ts` exercising
  an existing pure engine function (e.g. a melee unit's attack via `pc.ts`)
  to prove the wiring end-to-end under `npm test`. This is a
  proof-of-wiring example only — real scenario content is phase 08.
- Document the step-writing convention (short doc under
  `docs/games/dungeon-tactics/`, or inline in the `features/` directory):
  a step definition builds `GameState`/`UnitDef` inputs and asserts
  outcomes by calling `pc.ts`/`npc.ts`/`turn.ts` functions **directly**
  against in-memory state — not through `defStore.ts`/`contentStore.ts`,
  which both do network I/O against track-web's own `/api` and aren't
  appropriate for deterministic tests (per the proposal's engine-reuse
  note).

## Deliverable

`npm test` runs at least one Gherkin-driven test end-to-end, non-Phaser,
and the convention for writing more steps is written down somewhere a
future step-definition author (including phase 08's work) can find it.

## Suggested OpenSpec capability

`dungeon-tactics-gherkin-runner`.
