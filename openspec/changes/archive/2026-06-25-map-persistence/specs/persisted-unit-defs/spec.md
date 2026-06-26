**App**: dungeon-tactics-solo

## MODIFIED Requirements

### Requirement: Definitions are organized into named scenarios with one default
Unit definitions SHALL be organized into named **scenarios** — each scenario a full set of per-archetype definitions for the game. The system SHALL track scenarios in a `game_dt_variants` table keyed by `variant_id` (renamed from `game_scenarios` keyed by `(game_slug, scenario_id)`; the redundant `game_slug` column is dropped because the table is single-game) with a display `name` and an `is_default` flag, and SHALL maintain **exactly one** default scenario at all times. The default index SHALL be named `idx_game_dt_variants_default`.

#### Scenario: Scenarios are named sets of definitions
- **WHEN** scenarios exist for `dungeon-tactics-solo`
- **THEN** each scenario SHALL have a stable id and a display name and SHALL own a full set of per-archetype `UnitDef`s

#### Scenario: Exactly one default at all times
- **WHEN** the scenarios are inspected
- **THEN** exactly one scenario SHALL be marked as the default

#### Scenario: Existing scenarios survive the rename migration
- **WHEN** the rename migration runs against a database that already has `game_scenarios` rows
- **THEN** every prior scenario SHALL be preserved in `game_dt_variants` keyed by its `variant_id`, retaining its `name`, `is_default` flag, and the same single default

### Requirement: Definitions are persisted per archetype within a scenario
The system SHALL store each unit definition as one row per archetype **per scenario** in a `game_dt_unit_defs` table, keyed by `(variant_id, archetype)` (renamed from `game_unit_defs` keyed by `(game_slug, scenario_id, archetype)`; the redundant `game_slug` column is dropped), with the `UnitDef` stored as a JSON document (`def_json`) and an `updated_at` timestamp. Writes SHALL upsert a single archetype's row within a scenario so definitions can be edited one unit at a time.

#### Scenario: Each archetype is its own row within a scenario
- **WHEN** a scenario's definitions are stored
- **THEN** there SHALL be one row per archetype keyed by `(variant_id, archetype)`, each holding that archetype's `UnitDef` as JSON

#### Scenario: Writing one archetype leaves the others unchanged
- **WHEN** a single archetype's definition is upserted in a scenario
- **THEN** only that archetype's row in that scenario SHALL be created or replaced and its `updated_at` refreshed, with all other rows unchanged

#### Scenario: Existing defs survive the rename migration
- **WHEN** the rename migration runs against a database that already has `game_unit_defs` rows
- **THEN** every prior archetype row SHALL be preserved in `game_dt_unit_defs` keyed by `(variant_id, archetype)` with its `def_json` intact
