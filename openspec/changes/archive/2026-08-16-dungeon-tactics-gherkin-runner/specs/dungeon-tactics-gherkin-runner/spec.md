**App**: dungeon-tactics-solo

## Purpose

Lets the dungeon-tactics-solo engine be exercised by Gherkin `.feature` scenarios that run as part of track-web's existing Vitest suite, so gameplay behavior can be described in a shared, readable vocabulary and tested deterministically without Phaser or network I/O.

## ADDED Requirements

### Requirement: Gherkin feature files run under the existing test suite
The system SHALL run `.feature` files as part of `npm test` (root Vitest suite) without introducing a second test runner or CLI. Each `.feature` file SHALL pair with a step-definition file that loads it via `@amiceli/vitest-cucumber` and is picked up by track-web's existing Vitest include glob.

#### Scenario: Feature file executes via npm test
- **WHEN** a developer runs `npm test` from the repo root
- **THEN** at least one Gherkin-driven scenario under `client-games/src/games/dungeon-tactics-solo/features/` executes and passes, reported as an ordinary Vitest test

#### Scenario: No second test runner is required
- **WHEN** a developer inspects `client-games/package.json` and the repo root `package.json`
- **THEN** no Cucumber CLI, Jest, or other test runner is present — only Vitest and `@amiceli/vitest-cucumber` as a devDependency

### Requirement: Feature files and steps are colocated with the pure engine
The system SHALL locate `.feature` files and their step-definition files at `client-games/src/games/dungeon-tactics-solo/features/`, colocated with the pure engine modules they exercise (`pc.ts`, `npc.ts`, `turn.ts`), not the server-side schema mirror in `src/games/dungeon-tactics/`.

#### Scenario: Feature directory location
- **WHEN** a developer looks for dungeon-tactics Gherkin scenarios
- **THEN** they find them under `client-games/src/games/dungeon-tactics-solo/features/`, alongside (not inside) the existing `*.test.ts` unit tests in that directory

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
