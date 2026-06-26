**App**: dungeon-tactics-solo

## Purpose

Persists Dungeon Tactics Solo unit definitions in the backend, organized into named
**scenarios** — each a full set of per-archetype `UnitDef`s, with exactly one default per
game. The bundled `unitDefs.ts` table remains canonical and seeds the default scenario. Any
logged-in user can read, edit, create, and set the default scenario through validated
endpoints. The client loads the active scenario (a per-browser remembered selection, falling
back to the default, then to bundled defaults) into an in-memory store the engine reads from.
The in-game editor panel is the sole editing surface: edits apply **live** to the running match
(HP reconciled, affected NPCs re-planned), **Save** persists the active scenario in bulk, and
**Reload** hot-swaps the persisted defs into the running match without restarting it.

## Requirements

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

### Requirement: A scenario can be created and named, copying an existing one
The system SHALL allow creating a new scenario with a caller-supplied name. A newly created scenario SHALL start as a copy of an existing scenario's definitions (the current default unless another source is specified), so the designer edits from a working baseline rather than authoring every archetype from scratch.

#### Scenario: Create copies the source scenario's defs
- **WHEN** a new scenario is created with a name
- **THEN** the system SHALL persist a new scenario with that name whose definitions are copied from the chosen source scenario (defaulting to the current default)

#### Scenario: Creating a scenario does not change which is default
- **WHEN** a new scenario is created
- **THEN** the existing default scenario SHALL remain the default until explicitly changed

### Requirement: The default scenario is the canonical seed and fallback
The system SHALL allow setting any existing scenario as the default. Setting a new default SHALL clear the prior default so exactly one remains. The default scenario is the **canonical baseline**: it is what the read endpoint (`GET .../unit-defs`) returns and what the client loads when there is no remembered active selection. Which scenario a given client actually plays is the client-side **active selection** (see "The client loads the active scenario …").

#### Scenario: Setting a new default clears the old one
- **WHEN** a scenario is set as the default
- **THEN** that scenario SHALL become the default and the previously-default scenario SHALL no longer be marked default

#### Scenario: Read endpoint resolves the default scenario
- **WHEN** a client requests the default-scenario read endpoint
- **THEN** it SHALL receive the definitions of the scenario currently marked default

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
The system SHALL expose, on the games router and requiring a logged-in session but **no admin role** for now (matching the project's equal-rights default): `PUT .../scenarios/:scenario/unit-defs` (bulk), `POST .../scenarios` (create + name), and `PUT .../scenarios/:scenario/default` (set default). There SHALL be no single-archetype write endpoint; the bulk write upserts each archetype internally. Every request body SHALL be validated before it is persisted. The `UnitDef` write schema (Zod, mirroring the `UnitDef` interface) SHALL enforce the same per-field bounds as the editor — `maxHp` in `[1,20]`, `movement.range` in `[0,22]`, `attack.damage` in `[0,15]`, `attack.targeting.minRange` in `[0,22]`, `attack.targeting.maxRange` in `[1,22]` — and SHALL reject a def whose `maxRange` is less than its `minRange`, so the schema (not only the UI) is the authority and no client can persist an out-of-range or inverted-range def. The endpoints SHALL be structured so an admin restriction can be added later without changing the API shape.

#### Scenario: Logged-in user upserts valid definitions in a scenario
- **WHEN** a logged-in client sends a `PUT .../scenarios/:scenario/unit-defs` with a body whose archetypes satisfy the `UnitDef` schema
- **THEN** the system SHALL persist the upserts into that scenario and return success

#### Scenario: Invalid definition is rejected
- **WHEN** a `UnitDef` write body fails schema validation
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Out-of-range value is rejected by the schema
- **WHEN** a write body carries a value outside the per-field bounds (e.g. `maxHp` of `0` or `25`, `attack.damage` of `40`, or `movement.range` of `30`)
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Inverted range pair is rejected by the schema
- **WHEN** a write body carries a def whose `attack.targeting.maxRange` is less than its `attack.targeting.minRange`
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Unauthenticated write is rejected
- **WHEN** an unauthenticated client calls any write, create-scenario, or set-default endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT persist any change

### Requirement: The client loads the active scenario into an in-memory store with a bundled fallback
At game start the client SHALL load definitions once into an in-memory def store the engine reads from, resolving the **active scenario**: the per-browser remembered selection (`localStorage`) if present and still valid, otherwise the **default scenario** via `GET .../unit-defs`. If a remembered selection is missing/stale the client SHALL fall back to the default; if all fetches fail the client SHALL fall back to the bundled `unitDefs.ts` table so the game remains playable. The engine SHALL NOT poll or re-fetch definitions during play.

#### Scenario: Active scenario loads from the backend at start
- **WHEN** the game starts and the load succeeds
- **THEN** the engine SHALL derive unit behavior from the loaded in-memory store (the remembered active scenario, or the default when none is remembered)

#### Scenario: Stale or absent selection falls back to the default
- **WHEN** the remembered active selection no longer exists, or none is remembered
- **THEN** the client SHALL load the default scenario and (for a stale selection) clear the remembered value

#### Scenario: Fetch failure falls back to bundled defaults
- **WHEN** the start-of-game fetches all fail
- **THEN** the engine SHALL use the bundled `unitDefs.ts` table and the game SHALL remain playable

#### Scenario: Fresh database plays identically to Stage 1
- **WHEN** the game runs against a freshly seeded store with no admin edits and no remembered selection
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
- **THEN** that scenario SHALL become the default baseline (used on a fresh start when no active selection is remembered, and returned by the read endpoint)

### Requirement: Selecting a scenario makes it the active one and Reset replays it
Picking a scenario in the editor SHALL make it the **active** scenario: the system SHALL swap the in-memory def store to that scenario so the running match reflects it immediately (reconciling each unit's current HP by the max-HP delta, floored at 1), and SHALL remember the selection per browser (`localStorage`). The Reset control SHALL restart the whole match using the active scenario. The selection SHALL NOT require setting a default or a server reload to take effect.

#### Scenario: Picking a scenario activates it immediately
- **WHEN** a user picks a scenario in the editor
- **THEN** the in-memory store SHALL swap to that scenario, the running match SHALL reflect it without a reload, and the selection SHALL be remembered for subsequent game starts on that browser

#### Scenario: Reset replays the active scenario
- **WHEN** a user has an active scenario selected and presses Reset
- **THEN** the match SHALL restart with that scenario's definitions

### Requirement: Edits in the in-game editor panel apply to the active scenario and persist
Editing SHALL happen through the editor panel, available to any logged-in user (no admin gate for now). The editor edits the active scenario. Edits SHALL apply **live**: as a user changes a field, the system SHALL mutate the in-memory def store so the running match reflects the change immediately, **without requiring a Save and without a reload or re-fetch**. Each live application SHALL reconcile every affected unit's current HP by its archetype's max-HP delta (raising or lowering current HP by the same amount), floored at 1 so lowering max HP can never kill a unit. Live-applied values SHALL be clamped to the engine's valid ranges before they enter the store, so the running match never runs on values the write API would reject. **Save** SHALL persist the active scenario's current defs to the backend via the bulk write endpoint; Save SHALL be the only action that persists, and it SHALL NOT be required for edits to take effect in the running match.

#### Scenario: Editing applies live without saving
- **WHEN** a user changes a field in the editor for the active scenario and does not press Save
- **THEN** the running match SHALL reflect the new value immediately, driven by the mutated in-memory store

#### Scenario: Raising max HP raises current HP by the same amount
- **WHEN** a user raises an archetype's max HP in the editor
- **THEN** each affected unit's current HP SHALL increase by the same amount (e.g. a 3/3 unit becomes 4/4 and a 1/3 unit becomes 2/4)

#### Scenario: Lowering max HP lowers current HP, floored at 1
- **WHEN** a user lowers an archetype's max HP in the editor
- **THEN** each affected unit's current HP SHALL decrease by the same amount but never below 1, so lowering max HP can never kill a unit

#### Scenario: Save persists the live edits
- **WHEN** a user presses Save after making live edits
- **THEN** the system SHALL persist the active scenario's current defs and a later fresh load of that scenario SHALL include them

#### Scenario: Unsaved live edits are not persisted
- **WHEN** a user makes live edits and does not press Save
- **THEN** the backend SHALL retain the previously-saved definitions (the live edits exist only in the in-memory store)

### Requirement: Editor numeric fields enforce per-field range bounds
The unit editor's numeric fields SHALL constrain each value to a sensible range so a designer cannot commit or persist an invalid `UnitDef`. The bounds are:

| Field | Min | Max |
|-------|-----|-----|
| Max HP | 1 | 20 |
| Move (movement range) | 0 | 22 |
| Damage | 0 | 15 |
| Min range | 0 | 22 |
| Max range | 1 | 22 |

The maxima of 22 for movement and range equal the board's maximum Manhattan span (a 16×8 board: `(16-1)+(8-1)`), the farthest any move or attack can reach. Each field SHALL carry native `min`/`max` input attributes as a browser affordance, and the value committed to the in-memory store SHALL be clamped to the field's range (after the existing integer rounding) so that a typed or pasted out-of-range value can never enter the store regardless of the affordance.

#### Scenario: Negative entry is clamped to the field minimum
- **WHEN** a user types a negative value into any numeric field (e.g. Move = `-5`)
- **THEN** the value committed to the store SHALL be the field's minimum (Move → `0`), and no negative value SHALL reach the running match or be persisted

#### Scenario: Zero is rejected where a field requires at least one
- **WHEN** a user enters `0` for Max HP or Max range
- **THEN** the committed value SHALL be clamped to that field's minimum (`1`), so a unit can never have `maxHp` of 0 nor an attack that reaches no tile

#### Scenario: Over-cap entry is clamped to the field maximum
- **WHEN** a user enters a value above a field's cap (e.g. Damage = `40`, or Move = `30`)
- **THEN** the committed value SHALL be the field's maximum (Damage → `15`, Move → `22`)

### Requirement: The min/max range pair stays coupled so max is never below min
The editor SHALL keep the attack range pair consistent such that Max range is never less than Min range. The field the user edits SHALL keep the value entered; the partner field SHALL be moved to match when the pair would otherwise invert:
- Raising **Min range** above the current **Max range** SHALL raise Max range to equal the new Min range.
- Lowering **Max range** below the current **Min range** SHALL lower Min range to equal the new Max range.

After either adjustment the two values SHALL be equal. The coupled (already-consistent) pair is what enters the store and is persisted.

#### Scenario: Raising min above max pulls max up to match
- **WHEN** Max range is `3` and the user sets Min range to `5`
- **THEN** Min range SHALL be `5` and Max range SHALL be raised to `5`

#### Scenario: Lowering max below min pulls min down to match
- **WHEN** Min range is `6` and the user sets Max range to `2`
- **THEN** Max range SHALL be `2` and Min range SHALL be lowered to `2`

#### Scenario: An edit that keeps the pair ordered leaves the partner untouched
- **WHEN** Min range is `2` and Max range is `8` and the user sets Min range to `4`
- **THEN** Min range SHALL be `4` and Max range SHALL remain `8`

### Requirement: Editing an NPC archetype re-plans only the affected units
When a def change alters an **NPC** archetype during the player phase (and no NPC playback is animating), the system SHALL re-run NPC planning for **only** the units whose `unitType` is in the changed-archetype set, leaving every other NPC's telegraphed plan unchanged, so the affected enemies' shown move/attack reach reflects the new def without waiting for the next turn. A re-planned unit SHALL plan against the same board state the normal turn-start planner would give it (avoiding earlier units' planned destinations and later units' current positions). Changes to **PC**-only archetypes SHALL NOT trigger any NPC re-plan. When the change occurs outside the player phase or during NPC playback, the def SHALL still take effect and the next normal planning pass SHALL reflect it.

#### Scenario: Editing an NPC archetype re-plans its units
- **WHEN** the player phase is active, no NPC is animating, and a user changes an NPC archetype's movement or attack reach
- **THEN** every NPC unit of that archetype SHALL immediately re-run planning so its telegraphed plan reflects the new def

#### Scenario: Other enemies' telegraphs are left intact
- **WHEN** an NPC archetype is changed and its units re-plan
- **THEN** NPC units of other archetypes SHALL keep their existing telegraphed plans (they SHALL NOT be re-planned)

#### Scenario: Editing a PC archetype does not re-plan enemies
- **WHEN** a user changes a PC-only archetype's def during the player phase
- **THEN** no NPC re-plan SHALL occur and all enemy telegraphs SHALL remain unchanged

#### Scenario: Change outside the player phase defers to the next planning pass
- **WHEN** an NPC archetype is changed during placement or while NPC playback is animating
- **THEN** the def SHALL still take effect in the store and the next normal NPC planning pass SHALL reflect it

### Requirement: A reload control re-syncs the store from persisted values into the running match
The editor panel SHALL provide a **Reload** control that re-runs the load path (the active scenario, default fallback), replacing the in-memory store with the persisted values and discarding any unsaved live edits. Reload SHALL apply the restored definitions **into the running match** rather than restarting it: the system SHALL diff the pre- and post-reload definitions, reconcile each affected unit's current HP by its archetype's max-HP delta (floored at 1), and re-plan only the NPC units whose archetype's def changed. Restarting the match SHALL remain the responsibility of the separate Reset control, not Reload.

#### Scenario: Reload discards unsaved edits
- **WHEN** a user makes a live edit without saving and then triggers Reload
- **THEN** the in-memory store SHALL be replaced with the persisted definitions of the active scenario and the unsaved edit SHALL be discarded

#### Scenario: Reload keeps the match running
- **WHEN** a user triggers Reload during an in-progress match
- **THEN** the match SHALL continue with its current unit positions and turn state (it SHALL NOT restart), with restored definitions applied live

#### Scenario: Reload re-plans NPCs whose defs were restored
- **WHEN** Reload restores a definition that differs for an NPC archetype, during the player phase
- **THEN** the NPC units of that archetype SHALL re-plan to reflect the restored def while other enemies' telegraphs remain unchanged
