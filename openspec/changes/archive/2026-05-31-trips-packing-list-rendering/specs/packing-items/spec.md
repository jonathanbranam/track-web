**App**: trips

## ADDED Requirements

### Requirement: Packing items data model
The system SHALL store packing items as structured rows in a `packing_items` table with columns: `id INTEGER PRIMARY KEY`, `trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `section TEXT NOT NULL DEFAULT ''`, `text TEXT NOT NULL`, `position INTEGER NOT NULL DEFAULT 0`. The table SHALL be created via an inline migration in `db.ts` and added to `TABLE_NAMES`.

#### Scenario: Table created on startup
- **WHEN** the server starts with a database that does not yet have `packing_items`
- **THEN** the migration runs and the table exists with the correct schema

#### Scenario: Trip deletion cascades
- **WHEN** a trip is deleted
- **THEN** all `packing_items` rows for that trip are automatically deleted

### Requirement: List packing items
The system SHALL expose `GET /api/trips/:id/packing/items` returning `{ items: PackingItem[] }` ordered by `section ASC, position ASC`. Trip membership is required.

#### Scenario: Member retrieves items
- **WHEN** an authenticated trip member requests the items list
- **THEN** the response contains all items for that trip ordered by section then position

#### Scenario: Non-member is rejected
- **WHEN** an authenticated user who is not a member of the trip requests items
- **THEN** the server responds 403

#### Scenario: Empty list
- **WHEN** no items exist for the trip
- **THEN** the response is `{ items: [] }`

### Requirement: Create packing item
The system SHALL expose `POST /api/trips/:id/packing/items` accepting `{ section: string, text: string, position: number }` and returning the created `PackingItem`. Owner role is required.

#### Scenario: Owner creates item
- **WHEN** the trip owner posts a valid item body
- **THEN** the server responds 201 with the created item including its assigned `id`

#### Scenario: Member cannot create item
- **WHEN** a non-owner trip member posts to the create endpoint
- **THEN** the server responds 403

#### Scenario: Missing required field
- **WHEN** the request body omits `text`
- **THEN** the server responds 422

### Requirement: Update packing item
The system SHALL expose `PUT /api/trips/:id/packing/items/:itemId` accepting `{ section?: string, text?: string, position?: number }` and returning the updated `PackingItem`. Owner role is required.

#### Scenario: Owner updates item
- **WHEN** the owner sends a valid partial update
- **THEN** the server responds with the updated item, other fields unchanged

#### Scenario: Item not found
- **WHEN** the itemId does not exist or belongs to a different trip
- **THEN** the server responds 404

### Requirement: Delete packing item
The system SHALL expose `DELETE /api/trips/:id/packing/items/:itemId` and respond 204 on success. Owner role is required.

#### Scenario: Owner deletes item
- **WHEN** the owner sends a delete request for an existing item
- **THEN** the server removes the row and responds 204

#### Scenario: Item not found
- **WHEN** the itemId does not exist
- **THEN** the server responds 404

### Requirement: Bulk-replace packing items
The system SHALL expose `PUT /api/trips/:id/packing/items/bulk` accepting `{ items: Array<{ section: string, text: string, position: number }> }`. In a single transaction, it SHALL delete all existing items for the trip and insert the new array. Returns `{ items: PackingItem[] }` with the newly created items. Owner role is required.

#### Scenario: Owner replaces the full list
- **WHEN** the owner posts a valid items array
- **THEN** all previous items are deleted and the new items are inserted with new IDs; the response contains the inserted items in the posted order

#### Scenario: Empty array clears the list
- **WHEN** the owner posts `{ items: [] }`
- **THEN** all items are deleted; the response is `{ items: [] }`

#### Scenario: Partial failure rolls back
- **WHEN** an error occurs mid-insert
- **THEN** the transaction is rolled back and the previous items remain intact

### Requirement: PackingItem repository interface
The system SHALL define `PackingItem` type (`{ id, tripId, section, text, position }`) and `IPackingItemRepository` interface in `src/repositories/interfaces.ts` with methods: `listByTrip(tripId): PackingItem[]`, `create(tripId, data): PackingItem`, `update(id, data): PackingItem | null`, `delete(id): boolean`, `bulkReplace(tripId, items): PackingItem[]`.

#### Scenario: Interface is implemented
- **WHEN** `SqlitePackingItemRepository` is instantiated
- **THEN** it satisfies `IPackingItemRepository` at compile time (TypeScript)

### Requirement: Admin CLI commands for packing items
The system SHALL provide CLI commands for all packing item operations so the admin can manage the packing list without a UI. All list/get commands SHALL support a `--json` flag.

#### Scenario: List items via CLI
- **WHEN** the admin runs the list command for a trip
- **THEN** items are printed to stdout; with `--json` the output is valid JSON

#### Scenario: Bulk replace via CLI
- **WHEN** the admin runs the bulk-replace command with a JSON file path
- **THEN** the server replaces all items for the trip and confirms success

### Requirement: Read-only PackingPage
The system SHALL render a `PackingPage` at the `/packing` route in the trips client. On mount it SHALL fetch `GET /api/trips/:id/packing/items` and render items grouped by section: section name as a styled heading, each item as a list row with an unchecked checkbox icon and the item text. The page SHALL be read-only — no tap interactions. A NavBar tab SHALL link to `/packing`.

#### Scenario: Items rendered grouped by section
- **WHEN** the PackingPage mounts and items exist
- **THEN** items are displayed under their section headings in position order

#### Scenario: Empty state
- **WHEN** no items exist for the trip
- **THEN** the page displays "No packing list yet."

#### Scenario: NavBar tab present
- **WHEN** the user views any page in the trips app
- **THEN** a Packing tab is visible in the NavBar and navigates to `/packing`
