## Context

See proposal.md - Why. Direct follow-up to `dungeon-tactics-gherkin-shared-steps`
(design.md's "Risks / Trade-offs" section, task 5.1), which deliberately
deferred this split to avoid stacking too much infra change into one pass
while the melee extraction was still the primary goal.

## Goals / Non-Goals

**Goals:**
- Restore `npm test`'s wall-clock time to what it was before quickpickle was
  introduced, for every workspace that isn't dungeon-tactics.
- Keep the dungeon-tactics `.feature` tests runnable with a single command,
  discoverable from the docs a dungeon-tactics contributor would actually
  read.

**Non-Goals:**
- No change to scenario content, step definitions, or engine code — this is
  purely a test-invocation split.
- Not merging the two configs back together later via Vitest's
  workspace/`projects` feature — a second flat config file is simpler here
  and this repo's Vitest version (2.1.9) predates the stable `test.projects`
  API (that arrived in Vitest 3.x); a `vitest.workspace.ts` file is the
  closest 2.x equivalent but adds its own indirection for one extra config.
  Revisit if a third specialized test config is ever needed.

## Decisions

- **A second flat `vitest.config.mts` file, not a Vitest workspace.** Given
  the Vitest 2.x/3.x split above, the two realistic options were a
  `vitest.workspace.ts` (multi-project) or a second standalone config
  invoked via `--config`. For exactly one extra scoped test group, a second
  config file is more direct: `npm run test:dungeon-tactics` = `vitest run
  --config vitest.dungeon-tactics.config.mts` is legible on its own, and
  nothing about the root config needs to change shape (no workspace
  indirection) for everyone else's tests.
- **`npm test` stops covering dungeon-tactics `.feature` tests by default.**
  This is a deliberate scope narrowing, not an oversight: these tests are
  slower to set up (quickpickle/cucumber-expressions parsing) and only
  relevant to one game among many in this monorepo. A contributor working on
  dungeon-tactics is expected to run `npm run test:dungeon-tactics`
  explicitly — documented in the same places a dungeon-tactics contributor
  would already be looking (`features/README.md`, the phase docs).
  - Note this reads as in tension with `dungeon-tactics-gherkin-runner`'s
    existing "without introducing a second test runner or CLI" language.
    The tool is still exactly `vitest` in both configs — no second binary,
    no Cucumber CLI — but there are now two separate `vitest` *invocations*
    with different scopes. The spec delta below updates that requirement's
    wording to be precise about this distinction rather than leaving it
    contradicted.
- **Still no CI wiring for `test:dungeon-tactics`.** This repo doesn't have
  a CI pipeline configured in this change's scope (no `.github/workflows`
  changes proposed) — `npm test` remains whatever the deploy/CI path (if
  any) already runs, unchanged and unaffected by this split.

## Risks / Trade-offs

- **[Risk]** A contributor changes dungeon-tactics engine code, runs
  `npm test`, sees it pass, and assumes the Gherkin scenarios are fine too
  — but never ran `npm run test:dungeon-tactics`. **Mitigation:** documented
  prominently in `features/README.md` (the file a dungeon-tactics
  contributor touching `pc.ts`/`npc.ts` is most likely to be near) and in
  `CLAUDE.md`'s Commands section, which every session reads. No automated
  enforcement (e.g. a git hook) is added in this change — out of scope
  unless it becomes a recurring real problem.

## Migration Plan

No runtime migration. On archive:
`openspec/specs/dungeon-tactics-gherkin-runner/spec.md`'s "Gherkin feature
files run under the existing test suite" requirement is updated to describe
the two-command split. Code/config/doc changes land ahead of archive, same
pattern as the two prior dungeon-tactics changes this session.
