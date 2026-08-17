## Why

`@amiceli/vitest-cucumber` (phase 02's tool choice) requires each `.feature`
file to pair with its own step-definition file, and every `Scenario` block
to declare its steps by their exact literal text — no parameter matching, no
step reuse across scenarios or files. Building the `melee` unit's real
Gherkin coverage (`dungeon-tactics-melee-archetype`) surfaced how costly this
is in practice: every scenario's Given/When/Then text ends up duplicated —
once as prose in the `.feature` file, once as a literal string argument in
the paired `.test.ts` — so the `.feature` file carries no information the
code doesn't already restate, and could be deleted or regenerated from the
code without losing anything. That defeats the point of Gherkin as the
single source of truth the harness pipeline hands off and signs off on.

`quickpickle` fixes this while keeping everything phase 02 actually cared
about: it's a genuine Vitest plugin (`.feature` files run natively under
`npm test`, no second CLI/runner), and it's built on the same official
`@cucumber/gherkin` and `@cucumber/cucumber-expressions` libraries `cucumber-js`
itself uses — but with a **global** step registry matched by Cucumber
Expression (`{int}`, `{word}`, `{string}`, …), so one step definition backs
every scenario using matching phrasing, across every unit and feature file.

## What Changes

- Replace `@amiceli/vitest-cucumber` with `quickpickle` as the Gherkin
  runner, wired in as a Vite/Vitest plugin in the root `vitest.config.mts`.
- **BREAKING** (convention, not runtime behavior of already-passing
  scenarios): `.feature` files no longer pair with a same-name
  `.feature.test.ts`. Step definitions move to a shared `steps/` directory,
  registered once via `test.setupFiles`, matched by Cucumber Expression
  across every `.feature` file.
- Migrate melee's existing 3 scenarios onto the new shared step library
  (`steps/pc.steps.ts`) with parameterized step text — same scenario
  content, same passing behavior, no engine changes.
- Update the step-writing convention doc
  (`client-games/src/games/dungeon-tactics-solo/features/README.md`).

## Capabilities

### Modified Capabilities
- `dungeon-tactics-gherkin-runner`: swap the runner tool and the
  file-pairing convention (both currently codified by name/behavior in this
  capability's requirements).

## Impact

- `vitest.config.mts` — add the `quickpickle` plugin, `.feature` glob, and
  `setupFiles`.
- `client-games/package.json` — remove `@amiceli/vitest-cucumber`; root
  `package.json` gains `quickpickle` as a devDependency.
- `client-games/src/games/dungeon-tactics-solo/features/melee.feature.test.ts`
  — deleted.
- `client-games/src/games/dungeon-tactics-solo/features/steps/` — new:
  `index.ts` (registers all step modules), `pc.steps.ts` (shared PC steps).
- `client-games/src/games/dungeon-tactics-solo/features/README.md` —
  convention doc updated.
- Phase 04's step-catalog generator
  (`client-games/scripts/generate-step-catalog.ts`) is unaffected — it
  parses `.feature` files directly and has no dependency on the runner tool
  or the file-pairing convention.
- No engine code changes; melee's 3 scenarios still pass, same behavior.
