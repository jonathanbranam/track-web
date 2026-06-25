**App**: dungeon-tactics-solo

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Any logged-in user writes definitions and scenarios over a validated API
The system SHALL expose, on the games router and requiring a logged-in session but **no admin role** for now (matching the project's equal-rights default): `PUT .../scenarios/:scenario/unit-defs` (bulk), `POST .../scenarios` (create + name), and `PUT .../scenarios/:scenario/default` (set default). There SHALL be no single-archetype write endpoint; the bulk write upserts each archetype internally. Every request body SHALL be validated (the `UnitDef` writes against a Zod schema mirroring the `UnitDef` interface) before it is persisted. The endpoints SHALL be structured so an admin restriction can be added later without changing the API shape.

#### Scenario: Logged-in user upserts valid definitions in a scenario
- **WHEN** a logged-in client sends a `PUT .../scenarios/:scenario/unit-defs` with a body whose archetypes satisfy the `UnitDef` schema
- **THEN** the system SHALL persist the upserts into that scenario and return success

#### Scenario: Invalid definition is rejected
- **WHEN** a `UnitDef` write body fails schema validation
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Unauthenticated write is rejected
- **WHEN** an unauthenticated client calls any write, create-scenario, or set-default endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT persist any change

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
