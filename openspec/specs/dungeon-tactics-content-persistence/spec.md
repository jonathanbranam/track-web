**App**: dungeon-tactics-solo

## Purpose

Persists Dungeon Tactics board content in dedicated single-game tables following the established
`def_json` pattern, validates every write against a server-side Zod schema, seeds a fresh database
from a bundled map that faithfully ports today's hardcoded board, and exposes content endpoints
(logged-in only) — read endpoints for the play path plus validated map create/update/delete writes
for the editor — alongside admin CLI commands for listing, showing, seeding, and writing content.

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
The system SHALL expose, on the games router and requiring a logged-in session, read endpoints that list regions and return a region's map(s) and a map's encounter(s) for the play path. Unauthenticated requests SHALL be rejected with `401`. Content **write** endpoints are provided separately (see "Any logged-in user writes map content over a validated API"); the read endpoints themselves SHALL remain read-only.

#### Scenario: Authenticated user reads content for play
- **WHEN** a logged-in client requests the content read endpoints
- **THEN** the system SHALL respond with the requested region/map/encounter content

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated client requests any content read endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT return data

### Requirement: Any logged-in user writes map content over a validated API
The system SHALL expose, on the games router and requiring a logged-in session but **no admin role** (matching the project's equal-rights default and the existing unit-def writes), endpoints to create, replace, and delete **maps** within the seeded region:

- `POST .../content/regions/:regionId/maps` — create a map in the region.
- `PUT .../content/maps/:mapId` — replace a map's authored content (size, terrain, objects, spawn zones, name).
- `DELETE .../content/maps/:mapId` — delete a map.

Every write body SHALL be validated against the server-side Zod `mapSchema` (the same authority used by the seed) **before** persisting, and the repository SHALL additionally enforce that the parent region exists and that every terrain value is in that region's `terrainTypes`. A write that fails validation SHALL be rejected with `400` (or `404` for an unknown parent) and SHALL NOT persist any partial change. Create SHALL assign the next ordering position and a stable `map_id`, returning the stored map. Delete SHALL cascade to the map's encounters and SHALL be **rejected** when it would remove the last remaining map in a region, so a seeded database always resolves a default map. This requirement covers maps only; region and encounter writes are out of scope.

#### Scenario: Logged-in user creates a valid map
- **WHEN** a logged-in client `POST`s a schema-valid map to a region's maps endpoint
- **THEN** the system SHALL persist it with the next ordering position and a stable id, and SHALL return the stored map

#### Scenario: Malformed map write is rejected
- **WHEN** a create or update body fails schema or referential validation (grid not matching `size`, out-of-bounds object, terrain outside the region's `terrainTypes`, or a composite condition)
- **THEN** the system SHALL reject it with `400`/`404` and SHALL NOT persist any change

#### Scenario: Unauthenticated write is rejected
- **WHEN** an unauthenticated client calls any map create/update/delete endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT persist any change

#### Scenario: Update replaces the map's authored content
- **WHEN** a logged-in client `PUT`s valid content for an existing map
- **THEN** the system SHALL replace that map's stored content wholesale and a subsequent read SHALL return the new content

#### Scenario: Deleting the last map is rejected
- **WHEN** a delete would remove the only remaining map in a region
- **THEN** the system SHALL reject the delete so the play path can still resolve a default map

### Requirement: Content is accessible over admin CLI commands
The system SHALL provide admin CLI commands mirroring the content read operations — listing regions and showing a map and an encounter — plus a command to force the seed. Every CLI command that returns data SHALL support a `--json` flag for script-friendly output.

#### Scenario: CLI lists and shows content as JSON
- **WHEN** an operator runs the content list/show CLI commands with `--json`
- **THEN** the commands SHALL emit the corresponding region/map/encounter data as JSON

#### Scenario: CLI can seed an empty store
- **WHEN** an operator runs the content seed command against a store with no content
- **THEN** the bundled Region/Map/Encounter SHALL be inserted without overwriting existing content
