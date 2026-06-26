**App**: dungeon-tactics-solo

## Purpose

Persists Dungeon Tactics board content in dedicated single-game tables following the established
`def_json` pattern, validates every write against a server-side Zod schema, seeds a fresh database
from a bundled map that faithfully ports today's hardcoded board, and exposes read-only content
endpoints (logged-in only) plus admin CLI commands for listing, showing, and force-seeding content.

## Requirements

### Requirement: Content is persisted in dedicated DT content tables
The system SHALL persist board content in three single-game tables — `game_dt_regions`, `game_dt_maps`, and `game_dt_encounters` — following the established `def_json` pattern: identity and ordering fields (`region_id`/`map_id`/`encounter_id`, parent id where applicable, `name`, `sort_order`, timestamps) SHALL be real columns for listing, and the shaped payload (region `terrainTypes`; map `size`/`terrain`/`objects`/spawn zones; encounter `waves`/`win`/`lose`/`achievements`) SHALL be stored as a single validated `def_json` TEXT column. The tables SHALL NOT carry a `game_slug` column. Each table name SHALL be present in `TABLE_NAMES`.

#### Scenario: Content tables exist with identity columns and a def_json blob
- **WHEN** the database is migrated
- **THEN** `game_dt_regions`, `game_dt_maps`, and `game_dt_encounters` SHALL exist, each with identity/ordering columns and a `def_json` payload column, and each SHALL be listed in `TABLE_NAMES`

#### Scenario: Maps and encounters reference their parent
- **WHEN** a Map or Encounter row is stored
- **THEN** the Map SHALL be keyed within its `region_id` and the Encounter within its `map_id`, preserving the Region → Map → Encounter hierarchy

### Requirement: Every content write is validated by a Zod schema
The system SHALL validate every region/map/encounter write against a server-side Zod schema (the authority, mirroring `unitDefSchema`) before persisting, so a malformed map or encounter can never be stored. A write that fails validation SHALL be rejected and SHALL NOT persist any change.

#### Scenario: Valid content persists
- **WHEN** a region/map/encounter satisfying the schema is written
- **THEN** the system SHALL persist it

#### Scenario: Malformed content is rejected
- **WHEN** a content write fails schema validation (e.g. terrain value outside the region enum, grid not matching `size`, out-of-bounds object, or a composite condition)
- **THEN** the system SHALL reject it and SHALL NOT persist any change

### Requirement: A fresh database is seeded with the bundled map, never overwriting
On startup, when no content exists for the game, the system SHALL seed one Region, one Map, and one Encounter from a bundled `BUNDLED_MAP` constant (a faithful port of today's hardcoded board), inserting them via a `seedDefaultIfEmpty`-style operation. Seeding SHALL NOT overwrite or duplicate any existing content when content is already present.

#### Scenario: Empty store is seeded from the bundled map
- **WHEN** the backend starts and the game has no content
- **THEN** the system SHALL insert the bundled Region/Map/Encounter so the game has a default map to load

#### Scenario: Existing content is not overwritten
- **WHEN** the backend starts and content already exists
- **THEN** seeding SHALL NOT create duplicates or overwrite any stored content

### Requirement: The seed is a faithful port of the current board
The bundled seed Map SHALL reproduce today's hardcoded board exactly: a `16×8` size; terrain derived from `INITIAL_MAP`; the five power centers and the tower as `objects` carrying their current HP; `enemySpawnZone` from `SPAWNER_POSITIONS`; and `playerSpawnZone` from the authored spawn layout. Deserializing the seed SHALL reproduce the exact prior board, spawner set, and spawn-zone set.

#### Scenario: Deserialized seed equals the prior hardcoded board
- **WHEN** the bundled seed Map is deserialized into the engine's board representation
- **THEN** the resulting terrain grid, structure placement/HP, enemy spawner tiles, and player spawn-zone tiles SHALL match the prior hardcoded values exactly

### Requirement: Any logged-in user reads content over the endpoints
The system SHALL expose, on the games router and requiring a logged-in session, read-only endpoints that list regions and return a region's map(s) and a map's encounter(s) for the play path. Unauthenticated requests SHALL be rejected with `401`. This change SHALL NOT add any content write (create/update/delete) endpoint.

#### Scenario: Authenticated user reads content for play
- **WHEN** a logged-in client requests the content read endpoints
- **THEN** the system SHALL respond with the requested region/map/encounter content

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated client requests any content endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT return data

### Requirement: Content is accessible over admin CLI commands
The system SHALL provide admin CLI commands mirroring the content read operations — listing regions and showing a map and an encounter — plus a command to force the seed. Every CLI command that returns data SHALL support a `--json` flag for script-friendly output.

#### Scenario: CLI lists and shows content as JSON
- **WHEN** an operator runs the content list/show CLI commands with `--json`
- **THEN** the commands SHALL emit the corresponding region/map/encounter data as JSON

#### Scenario: CLI can seed an empty store
- **WHEN** an operator runs the content seed command against a store with no content
- **THEN** the bundled Region/Map/Encounter SHALL be inserted without overwriting existing content
