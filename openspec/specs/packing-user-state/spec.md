**App**: trips

## Purpose

Per-user checked state for packing items. Each trip member tracks their own packing progress independently. State persists via the `packing_state` table keyed on `(packing_item_id, user_id)`. The owner can view a per-member completion summary.

## Requirements

### Requirement: Packing state data model
The system SHALL store per-user checked state in a `packing_state` table with columns: `id INTEGER PRIMARY KEY`, `packing_item_id INTEGER NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE`, `user_id INTEGER NOT NULL`, `checked INTEGER NOT NULL DEFAULT 0`. A unique constraint on `(packing_item_id, user_id)` SHALL be enforced. The table SHALL be created via an inline migration in `db.ts` and added to `TABLE_NAMES`.

#### Scenario: Table created on startup
- **WHEN** the server starts with a database that does not yet have `packing_state`
- **THEN** the migration runs and the table exists with the correct schema

#### Scenario: Item deletion cascades state
- **WHEN** a `packing_items` row is deleted
- **THEN** all `packing_state` rows with that `packing_item_id` are automatically deleted

#### Scenario: Unique constraint enforced
- **WHEN** an insert is attempted for a `(packing_item_id, user_id)` pair that already exists
- **THEN** the database raises a unique constraint violation (the application uses UPSERT to avoid this)

### Requirement: Packing state repository interface
The system SHALL define `IPackingStateRepository` in `src/repositories/interfaces.ts` with methods: `getState(tripId, userId): Record<number, boolean>` (returns a map of itemId → checked for checked items only; absent keys are implicitly false), `setState(itemId, userId, checked: boolean): void` (upserts the state row), `getSummary(tripId): PackingMemberSummary[]`.

#### Scenario: Interface is implemented
- **WHEN** `SqlitePackingStateRepository` is instantiated
- **THEN** it satisfies `IPackingStateRepository` at compile time (TypeScript)

#### Scenario: getState returns only checked items
- **WHEN** a user has checked 3 of 10 items
- **THEN** `getState` returns a map with exactly 3 entries, all with value `true`

### Requirement: Get packing state
The system SHALL expose `GET /api/trips/:id/packing/state` returning `{ state: Record<number, boolean> }` — a map of `itemId` to `true` for items the authenticated user has checked. Absent keys are implicitly unchecked. Trip membership is required.

#### Scenario: Member retrieves their state
- **WHEN** an authenticated trip member requests their state
- **THEN** the response contains a map with `true` for each item they have checked

#### Scenario: Non-member is rejected
- **WHEN** an authenticated user who is not a member requests state
- **THEN** the server responds 403

#### Scenario: No items checked
- **WHEN** the user has not checked any items
- **THEN** the response is `{ state: {} }`

### Requirement: Toggle packing state
The system SHALL expose `PUT /api/trips/:id/packing/state` accepting `{ itemId: number, checked: boolean }`. It SHALL upsert the `packing_state` row for the authenticated user and the given item. The route SHALL validate that `itemId` belongs to the specified trip before writing. Returns `{ ok: true }` on success. Trip membership is required.

#### Scenario: Member checks an item
- **WHEN** an authenticated trip member sends `{ itemId: 5, checked: true }`
- **THEN** the state row is upserted with `checked = 1` and the response is `{ ok: true }`

#### Scenario: Member unchecks an item
- **WHEN** an authenticated trip member sends `{ itemId: 5, checked: false }`
- **THEN** the state row is upserted with `checked = 0` and the response is `{ ok: true }`

#### Scenario: Item belongs to a different trip
- **WHEN** `itemId` refers to an item that belongs to a different trip
- **THEN** the server responds 403

#### Scenario: Item does not exist
- **WHEN** `itemId` does not exist in `packing_items`
- **THEN** the server responds 404

#### Scenario: Non-member is rejected
- **WHEN** an authenticated user who is not a trip member sends a toggle
- **THEN** the server responds 403

### Requirement: Packing completion summary
The system SHALL expose `GET /api/trips/:id/packing/summary` returning `{ members: Array<{ userId: number, checked: number, total: number }> }`. It SHALL count total items for the trip and checked items per member via a SQL aggregation. Owner role is required.

#### Scenario: Owner retrieves summary
- **WHEN** the trip owner requests the summary and 2 members have checked some items
- **THEN** the response contains one entry per member who has any state, with correct `checked` and `total` counts

#### Scenario: Non-owner member is rejected
- **WHEN** a non-owner trip member requests the summary
- **THEN** the server responds 403

#### Scenario: No state exists
- **WHEN** no members have checked any items
- **THEN** the response is `{ members: [] }`

### Requirement: Admin CLI commands for packing state
The system SHALL provide CLI commands for packing state operations. All data-returning commands SHALL support a `--json` flag.

#### Scenario: Get state via CLI
- **WHEN** the admin runs the state-get command for a trip and user
- **THEN** the checked item IDs are printed; with `--json` the output is valid JSON

#### Scenario: Set state via CLI
- **WHEN** the admin runs the state-set command specifying a trip, user, itemId, and checked value
- **THEN** the server upserts the state row and confirms success

#### Scenario: Summary via CLI
- **WHEN** the admin runs the summary command for a trip
- **THEN** per-member completion counts are printed; with `--json` the output is valid JSON
