**App**: dungeon-tactics-solo

## Purpose

Lets downstream tooling (the dungeon-harness scenario drafting flow) discover which Gherkin step texts are already implemented in track-web's `.feature` files, by generating a machine-readable catalog directly from the canonical feature tree on demand.

## ADDED Requirements

### Requirement: Catalog is generated on demand from the canonical feature tree
The system SHALL provide a way to regenerate the step catalog on demand (an npm script) that reads every `.feature` file under `client-games/src/games/dungeon-tactics-solo/features/` and writes the resulting catalog to `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json`. The catalog SHALL NOT be treated as a separate source of truth — every entry SHALL be derived mechanically from step text found in the `.feature` files, with no hand-maintained additions.

#### Scenario: Regenerating produces an up-to-date catalog
- **WHEN** a developer runs the catalog generation npm script after adding or changing a `.feature` file
- **THEN** `steps-catalog.json` is overwritten to reflect exactly the Given/When/Then step texts currently present in `features/*.feature`

#### Scenario: Catalog reflects an empty feature set
- **WHEN** the catalog generation script is run against a `features/` directory containing no `.feature` files
- **THEN** the script completes without error and writes a catalog with an empty step list, rather than failing or leaving a stale file in place

### Requirement: Catalog entries are unique step texts
The system SHALL deduplicate step text so that a Given/When/Then line appearing in multiple scenarios or feature files is represented exactly once in the catalog.

#### Scenario: Duplicate step text across scenarios is deduplicated
- **WHEN** two different scenarios (in the same or different `.feature` files) contain an identical step text under the same keyword (e.g. both have `Given a melee unit with 10 HP`)
- **THEN** the generated catalog contains only one entry for that step text under that keyword

### Requirement: Catalog is machine-readable JSON grouped by step keyword
The system SHALL emit the catalog as JSON, with step texts identifiable by their Given/When/Then keyword, so downstream tooling can programmatically compare a drafted scenario's steps against the catalog without parsing Gherkin itself.

#### Scenario: Catalog structure is parseable and grouped
- **WHEN** `steps-catalog.json` is parsed as JSON
- **THEN** it contains, for each of Given/When/Then, a list of the unique step texts implemented under that keyword

### Requirement: Catalog generation is verified against real scenario content
The system SHALL be demonstrated to produce a correct, non-empty catalog when run against at least one real implemented scenario (not just synthetic test input), so the generator is proven against the actual canonical feature tree it is meant to serve.

#### Scenario: Catalog reflects the existing example scenario
- **WHEN** the catalog generation script is run against the current `features/` directory, which contains the phase 02 example scenario (a melee PC attack)
- **THEN** the generated catalog contains the Given/When/Then step texts from that scenario
