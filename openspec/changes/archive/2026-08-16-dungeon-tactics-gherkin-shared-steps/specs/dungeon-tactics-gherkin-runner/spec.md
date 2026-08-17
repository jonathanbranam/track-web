## MODIFIED Requirements

### Requirement: Gherkin feature files run under the existing test suite
The system SHALL run `.feature` files as part of `npm test` (root Vitest
suite) without introducing a second test runner or CLI, using `quickpickle`
(a Vitest plugin built on the official `@cucumber/gherkin` and
`@cucumber/cucumber-expressions` libraries) to load and execute them.
`.feature` files SHALL run directly — no paired step-definition file per
`.feature` file is required. Step definitions SHALL be registered globally,
matched by Cucumber Expression (e.g. `{int}`, `{word}`, `{string}`) against
step text, so one step definition can back any scenario using matching
phrasing across multiple `.feature` files.

#### Scenario: Feature file executes via npm test
- **WHEN** a developer runs `npm test` from the repo root
- **THEN** at least one Gherkin-driven scenario under `client-games/src/games/dungeon-tactics-solo/features/` executes and passes, reported as an ordinary Vitest test

#### Scenario: No second test runner is required
- **WHEN** a developer inspects `client-games/package.json` and the repo root `package.json`
- **THEN** no Cucumber CLI, Jest, or other test runner is present — only Vitest and `quickpickle` as a devDependency

#### Scenario: A single step definition matches multiple scenarios
- **WHEN** two different `.feature` scenarios (in the same or different files) use step text that matches the same Cucumber Expression pattern (e.g. `a {word} PC at column {int}, row {int}`) with different concrete values
- **THEN** both scenarios execute against the same single step-definition function, with no per-scenario or per-file step-definition duplicate required

## REMOVED Requirements

### Requirement: Feature files and steps are colocated with the pure engine
**Reason**: Superseded by the requirement below, which reflects that step
definitions no longer live 1:1 alongside each `.feature` file but in a
shared `steps/` directory within the same `features/` folder.
**Migration**: No code migration needed — see the replacement requirement
"Feature files and shared steps are colocated with the pure engine".

## ADDED Requirements

### Requirement: Feature files and shared steps are colocated with the pure engine
The system SHALL locate `.feature` files and their shared step-definition
library at `client-games/src/games/dungeon-tactics-solo/features/`
(step definitions under that directory's `steps/` subdirectory), colocated
with the pure engine modules they exercise (`pc.ts`, `npc.ts`, `turn.ts`),
not the server-side schema mirror in `src/games/dungeon-tactics/`.

#### Scenario: Feature directory location
- **WHEN** a developer looks for dungeon-tactics Gherkin scenarios
- **THEN** they find `.feature` files under `client-games/src/games/dungeon-tactics-solo/features/` and their step definitions under that directory's `steps/` subdirectory, alongside (not inside) the existing `*.test.ts` unit tests in that directory

#### Scenario: Step definitions are shared, not paired per feature file
- **WHEN** a developer adds a new `.feature` file whose scenarios reuse existing step phrasing (e.g. "a {word} PC at column {int}, row {int}")
- **THEN** no new step-definition file is required for that `.feature` file — the existing step definitions in `features/steps/` already match
