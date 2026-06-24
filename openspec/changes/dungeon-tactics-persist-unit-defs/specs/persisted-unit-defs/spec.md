**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: Definitions are organized into named scenarios with one default
Unit definitions SHALL be organized into named **scenarios** — each scenario a full set of per-archetype definitions for the game. The system SHALL track scenarios in a `game_scenarios` table keyed by `(game_slug, scenario_id)` with a display `name` and an `is_default` flag, and SHALL maintain **exactly one** default scenario per game at all times.

#### Scenario: Scenarios are named sets of definitions
- **WHEN** scenarios exist for `dungeon-tactics-solo`
- **THEN** each scenario SHALL have a stable id and a display name and SHALL own a full set of per-archetype `UnitDef`s

#### Scenario: Exactly one default at all times
- **WHEN** the scenarios for a game are inspected
- **THEN** exactly one scenario SHALL be marked as the default

### Requirement: A scenario can be created and named, copying an existing one
The system SHALL allow creating a new scenario with a caller-supplied name. A newly created scenario SHALL start as a copy of an existing scenario's definitions (the current default unless another source is specified), so the designer edits from a working baseline rather than authoring every archetype from scratch.

#### Scenario: Create copies the source scenario's defs
- **WHEN** a new scenario is created with a name
- **THEN** the system SHALL persist a new scenario with that name whose definitions are copied from the chosen source scenario (defaulting to the current default)

#### Scenario: Creating a scenario does not change which is default
- **WHEN** a new scenario is created
- **THEN** the existing default scenario SHALL remain the default until explicitly changed

### Requirement: The default scenario can be changed and is what play loads
The system SHALL allow setting any existing scenario as the default. Setting a new default SHALL clear the prior default so exactly one remains. **Play always loads the default scenario** — changing what a match plays is done only by changing the default.

#### Scenario: Setting a new default clears the old one
- **WHEN** a scenario is set as the default
- **THEN** that scenario SHALL become the default and the previously-default scenario SHALL no longer be marked default

#### Scenario: Play resolves the default scenario
- **WHEN** the game loads definitions for play
- **THEN** it SHALL receive the definitions of the scenario currently marked default

### Requirement: Definitions are persisted per archetype within a scenario
The system SHALL store each unit definition as one row per archetype **per scenario** in a `game_unit_defs` table, keyed by `(game_slug, scenario_id, archetype)`, with the `UnitDef` stored as a JSON document (`def_json`) and an `updated_at` timestamp. Writes SHALL upsert a single archetype's row within a scenario so definitions can be edited one unit at a time.

#### Scenario: Each archetype is its own row within a scenario
- **WHEN** a scenario's definitions are stored
- **THEN** there SHALL be one row per archetype keyed by `(game_slug, scenario_id, archetype)`, each holding that archetype's `UnitDef` as JSON

#### Scenario: Writing one archetype leaves the others unchanged
- **WHEN** a single archetype's definition is upserted in a scenario
- **THEN** only that archetype's row in that scenario SHALL be created or replaced and its `updated_at` refreshed, with all other rows unchanged

### Requirement: The bundled defaults seed a default scenario and stay canonical
The bundled `unitDefs.ts` table SHALL remain the canonical default. On startup, when no scenario exists for the game, the system SHALL seed a `default` scenario (marked default) from the bundled defaults rather than from data hardcoded in a migration, so the current definitions are preserved as the default scenario and adding a `UnitDef` field in a later stage requires no data migration.

#### Scenario: Empty store is seeded with a default scenario from code
- **WHEN** the backend starts and the game has no scenarios
- **THEN** the system SHALL create a `default` scenario marked default, with each archetype's row seeded from the bundled `unitDefs.ts` default

#### Scenario: Existing scenarios are not overwritten by seeding
- **WHEN** the backend starts and the game already has at least one scenario
- **THEN** seeding SHALL NOT create a duplicate default or overwrite any stored definition

### Requirement: Any logged-in user reads definitions over the endpoints
The system SHALL expose, requiring a logged-in session: `GET /api/games/dungeon-tactics-solo/unit-defs` returning the **default scenario's** full archetype set (the play path), `GET .../scenarios` listing scenarios (`id`, `name`, `isDefault`), and `GET .../scenarios/:scenario/unit-defs` returning one scenario's defs (the editor view).

#### Scenario: Authenticated user reads the default set for play
- **WHEN** a logged-in client requests `GET /api/games/dungeon-tactics-solo/unit-defs`
- **THEN** the system SHALL respond with every archetype's current `UnitDef` from the default scenario

#### Scenario: Authenticated user lists scenarios and reads one
- **WHEN** a logged-in client requests `GET .../scenarios` or `GET .../scenarios/:scenario/unit-defs`
- **THEN** the system SHALL respond with the scenario list (marking the default) or the named scenario's full def set respectively

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated client requests any unit-defs or scenarios endpoint
- **THEN** the system SHALL respond `401` and not return data

### Requirement: Any logged-in user writes definitions and scenarios over a validated API
The system SHALL expose, on the games router and requiring a logged-in session but **no admin role** for now (matching the project's equal-rights default): `PUT .../scenarios/:scenario/unit-defs/:archetype` (single), `PUT .../scenarios/:scenario/unit-defs` (bulk), `POST .../scenarios` (create + name), and `PUT .../scenarios/:scenario/default` (set default). Every request body SHALL be validated (the `UnitDef` writes against a Zod schema mirroring the `UnitDef` interface) before it is persisted. The endpoints SHALL be structured so an admin restriction can be added later without changing the API shape.

#### Scenario: Logged-in user upserts a valid definition in a scenario
- **WHEN** a logged-in client sends a `PUT .../scenarios/:scenario/unit-defs/:archetype` with a body that satisfies the `UnitDef` schema
- **THEN** the system SHALL persist the upsert into that scenario and return success

#### Scenario: Invalid definition is rejected
- **WHEN** a `UnitDef` write body fails schema validation
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Unauthenticated write is rejected
- **WHEN** an unauthenticated client calls any write, create-scenario, or set-default endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT persist any change

### Requirement: The client loads the default scenario into an in-memory store with a bundled fallback
At game start the client SHALL fetch the **default scenario's** definitions once via `GET .../unit-defs` into an in-memory def store that the engine reads from. If the fetch fails, the client SHALL fall back to the bundled `unitDefs.ts` table so the game remains playable. The engine SHALL NOT poll or re-fetch definitions during play.

#### Scenario: Default scenario loads from the backend at start
- **WHEN** the game starts and the fetch succeeds
- **THEN** the engine SHALL derive unit behavior from the loaded in-memory store (the default scenario's defs)

#### Scenario: Fetch failure falls back to bundled defaults
- **WHEN** the start-of-game fetch fails or returns no definitions
- **THEN** the engine SHALL use the bundled `unitDefs.ts` table and the game SHALL remain playable

#### Scenario: Fresh database plays identically to Stage 1
- **WHEN** the game runs against a freshly seeded store with no admin edits
- **THEN** every archetype's move range, max HP, attack damage, and footprint SHALL match the Stage 1 bundled values exactly

### Requirement: The editor panel provides a scenario picker, create, and set-default
The in-game editor panel SHALL provide a scenario picker that lists scenarios and marks which is the default, a control to create and name a new scenario (copying the selected scenario's defs), and a control to set the selected scenario as the default. The panel SHALL be available to any logged-in user (no admin gate for now).

#### Scenario: Picker lists scenarios and the default
- **WHEN** the editor panel is opened
- **THEN** it SHALL list the available scenarios and indicate which one is the default

#### Scenario: Create and name a new scenario from the panel
- **WHEN** a user creates a new scenario with a name in the panel
- **THEN** the system SHALL create it (copying the selected scenario's defs) and select it for editing

#### Scenario: Set the selected scenario as default
- **WHEN** a user sets the selected scenario as the default in the panel
- **THEN** that scenario SHALL become the default that play loads

### Requirement: Edits in the in-game editor panel apply to the loaded scenario and persist
Editing SHALL happen through the editor panel, available to any logged-in user (no admin gate for now). On save, the system SHALL (a) call the write endpoint to persist the edit into the selected scenario, and (b) when the selected scenario is the currently-loaded default, mutate the in-memory def store directly so the change takes effect immediately with no reload or re-fetch. Editing a non-loaded scenario SHALL persist only and take effect once that scenario is made default and the store reloads.

#### Scenario: Editing the loaded default applies without reload
- **WHEN** a user edits the currently-loaded default scenario in the panel and saves
- **THEN** the running session SHALL reflect the change immediately (no reload), driven by the mutated in-memory store, and the edit SHALL be persisted

#### Scenario: Editing a non-loaded scenario persists without changing the session
- **WHEN** a user edits a scenario other than the currently-loaded one and saves
- **THEN** the edit SHALL be persisted and the running session SHALL be unchanged until that scenario is made default and the store reloads

#### Scenario: Saved edit survives a fresh load
- **WHEN** a user saves an edit and that scenario is later loaded
- **THEN** the freshly loaded definitions SHALL include the persisted edit

### Requirement: A reload control re-syncs the store from persisted values
The editor panel SHALL provide a "Reload from server" control that re-runs the load path, replacing the in-memory store with the persisted values and discarding any unsaved in-memory edits.

#### Scenario: Reload discards unsaved edits
- **WHEN** a user makes an in-memory edit without saving and then triggers "Reload from server"
- **THEN** the in-memory store SHALL be replaced with the persisted definitions and the unsaved edit SHALL be discarded
