**App**: dungeon-tactics-solo

## Purpose

Lets the dungeon-tactics-solo engine be exercised by Gherkin `.feature` scenarios that run as part of track-web's existing Vitest suite, so gameplay behavior can be described in a shared, readable vocabulary and tested deterministically without Phaser or network I/O.

## Requirements

### Requirement: Gherkin feature files run under a dedicated Vitest config
The system SHALL run `.feature` files via a dedicated Vitest config (`vitest.dungeon-tactics.config.mts`) and npm script (`npm run test:dungeon-tactics`), separate from the shared root `vitest.config.mts`/`npm test` used by every other workspace. Both configs SHALL use the same tool — Vitest — so this remains a second scoped invocation of the existing test runner, not a second CLI or test framework. `quickpickle` (a Vitest plugin built on the official `@cucumber/gherkin` and `@cucumber/cucumber-expressions` libraries) SHALL load and execute `.feature` files within that dedicated config only. `.feature` files SHALL run directly — no paired step-definition file per `.feature` file is required. Step definitions SHALL be registered globally, matched by Cucumber Expression (e.g. `{int}`, `{word}`, `{string}`) against step text, so one step definition can back any scenario using matching phrasing across multiple `.feature` files.

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

### Requirement: Feature files and shared steps are colocated with the pure engine
The system SHALL locate `.feature` files and their shared step-definition library at `client-games/src/games/dungeon-tactics-solo/features/` (step definitions under that directory's `steps/` subdirectory), colocated with the pure engine modules they exercise (`pc.ts`, `npc.ts`, `turn.ts`), not the server-side schema mirror in `src/games/dungeon-tactics/`.

#### Scenario: Feature directory location
- **WHEN** a developer looks for dungeon-tactics Gherkin scenarios
- **THEN** they find `.feature` files under `client-games/src/games/dungeon-tactics-solo/features/` and their step definitions under that directory's `steps/` subdirectory, alongside (not inside) the existing `*.test.ts` unit tests in that directory

#### Scenario: Step definitions are shared, not paired per feature file
- **WHEN** a developer adds a new `.feature` file whose scenarios reuse existing step phrasing (e.g. "a {word} PC at column {int}, row {int}")
- **THEN** no new step-definition file is required for that `.feature` file — the existing step definitions in `features/steps/` already match

### Requirement: Step definitions exercise the engine directly, not the network-backed stores
Step definitions SHALL construct `GameState`/`UnitDef` inputs and assert outcomes by calling `pc.ts`, `npc.ts`, and `turn.ts` functions directly against in-memory state. Step definitions SHALL NOT go through `defStore.ts` or `contentStore.ts`, since both perform network I/O against track-web's own `/api` and are unsuitable for deterministic tests.

#### Scenario: Step definition calls the engine in-memory
- **WHEN** a step definition needs a unit's attack outcome
- **THEN** it calls the relevant function in `pc.ts` or `npc.ts` directly with an in-memory `GameState`, with no HTTP request made during the test

#### Scenario: Step definition does not import the network-backed stores
- **WHEN** a developer inspects a step-definition file under `features/`
- **THEN** it does not import `defStore.ts` or `contentStore.ts`

### Requirement: Step-writing convention is documented
The system SHALL document, in a location a future step-definition author can find (a short doc under `docs/games/dungeon-tactics/`, or inline in the `features/` directory), how to write new steps: building `GameState`/`UnitDef` inputs and asserting outcomes via direct engine calls, per the requirement above.

#### Scenario: Convention doc exists and is discoverable
- **WHEN** a developer opens `docs/games/dungeon-tactics/` or `client-games/src/games/dungeon-tactics-solo/features/`
- **THEN** they find a doc explaining the step-definition convention, including the constraint against using `defStore.ts`/`contentStore.ts`
