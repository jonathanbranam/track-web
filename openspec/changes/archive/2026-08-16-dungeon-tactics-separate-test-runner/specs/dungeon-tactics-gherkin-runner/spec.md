## MODIFIED Requirements

### Requirement: Gherkin feature files run under a dedicated Vitest config
The system SHALL run `.feature` files via a dedicated Vitest config
(`vitest.dungeon-tactics.config.mts`) and npm script (`npm run
test:dungeon-tactics`), separate from the shared root `vitest.config.mts`/
`npm test` used by every other workspace. Both configs SHALL use the same
tool — Vitest — so this remains a second scoped invocation of the existing
test runner, not a second CLI or test framework. `quickpickle` (a Vitest
plugin built on the official `@cucumber/gherkin` and
`@cucumber/cucumber-expressions` libraries) SHALL load and execute
`.feature` files within that dedicated config only. `.feature` files SHALL
run directly — no paired step-definition file per `.feature` file is
required. Step definitions SHALL be registered globally, matched by
Cucumber Expression (e.g. `{int}`, `{word}`, `{string}`) against step text,
so one step definition can back any scenario using matching phrasing across
multiple `.feature` files.

#### Scenario: Feature file executes via a dedicated command
- **WHEN** a developer runs `npm run test:dungeon-tactics` from the repo root
- **THEN** at least one Gherkin-driven scenario under `client-games/src/games/dungeon-tactics-solo/features/` executes and passes, reported as an ordinary Vitest test

#### Scenario: Default npm test does not run dungeon-tactics feature tests
- **WHEN** a developer runs `npm test` from the repo root
- **THEN** no `.feature` file executes, and the root `vitest.config.mts` does not load the `quickpickle` plugin or the dungeon-tactics step library

#### Scenario: No second test-running tool is required
- **WHEN** a developer inspects `client-games/package.json` and the repo root `package.json`
- **THEN** no Cucumber CLI, Jest, or other test *tool* is present — only Vitest (invoked twice, via two configs) and `quickpickle` as a devDependency

#### Scenario: A single step definition matches multiple scenarios
- **WHEN** two different `.feature` scenarios (in the same or different files) use step text that matches the same Cucumber Expression pattern (e.g. `a {word} PC at column {int}, row {int}`) with different concrete values
- **THEN** both scenarios execute against the same single step-definition function, with no per-scenario or per-file step-definition duplicate required
