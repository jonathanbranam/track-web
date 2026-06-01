**App**: trips

## Purpose

Structured packing list per trip. Items are organized by section and managed via API by the trip owner or individual members (for their own personal items). The `packing_items` table supports two scopes: shared items (`user_id IS NULL`, visible to all members) and personal items (`user_id` set, visible only to that user and the owner). The app renders items read-only; per-user check-off state is handled separately (see `packing-state`).

## Requirements

### Requirement: Packing items data model
The system SHALL store packing items as structured rows in a `packing_items` table with columns: `id INTEGER PRIMARY KEY`, `trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `section TEXT NOT NULL DEFAULT ''`, `text TEXT NOT NULL`, `position INTEGER NOT NULL DEFAULT 0`, `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE` (nullable — NULL means shared, non-null means personal to that user). The table SHALL be created via an inline migration in `db.ts` and added to `TABLE_NAMES`. The `user_id` column SHALL be added to the existing table via an `ALTER TABLE ADD COLUMN` migration.

#### Scenario: Table created on startup
- **WHEN** the server starts with a database that does not yet have `packing_items`
- **THEN** the migration runs and the table exists with the correct schema including `user_id`

#### Scenario: Trip deletion cascades
- **WHEN** a trip is deleted
- **THEN** all `packing_items` rows for that trip are automatically deleted

#### Scenario: User deletion cascades personal items
- **WHEN** a user is deleted
- **THEN** all `packing_items` rows with that `user_id` are automatically deleted

#### Scenario: Existing items default to shared
- **WHEN** the `user_id` column migration runs on an existing database
- **THEN** all existing rows have `user_id = NULL` (shared)

### Requirement: List packing items
The system SHALL expose `GET /api/trips/:id/packing/items` returning `{ items: PackingItem[] }` ordered by `section ASC, position ASC` within each scope. Trip membership is required. If the requester is the trip owner, the response SHALL include all items (shared and all personal). If the requester is a regular member, the response SHALL include shared items (`user_id IS NULL`) plus items personal to the requester (`user_id = requester.id`).

#### Scenario: Member retrieves shared and personal items
- **WHEN** an authenticated trip member requests the items list
- **THEN** the response contains shared items and items personal to that member, ordered by section then position

#### Scenario: Member does not receive other members' personal items
- **WHEN** member A requests the items list and member B has personal items
- **THEN** member B's personal items are not included in member A's response

#### Scenario: Owner retrieves all items
- **WHEN** the trip owner requests the items list
- **THEN** the response contains shared items and all members' personal items

#### Scenario: Non-member is rejected
- **WHEN** an authenticated user who is not a member of the trip requests items
- **THEN** the server responds 403

#### Scenario: Empty list
- **WHEN** no items exist for the trip
- **THEN** the response is `{ items: [] }`

### Requirement: Create packing item
The system SHALL expose `POST /api/trips/:id/packing/items` accepting `{ section: string, text: string, position: number, userId?: number }` and returning the created `PackingItem`. Trip membership is required. A non-owner member MAY create personal items only: the item is stored with `user_id` set to their own user ID regardless of any `userId` in the request body; they cannot create shared items or items for other users. The owner MAY create shared items (no `userId`) or personal items for any user (with `userId`). There is no UI affordance for member item creation in this change; members use the API directly.

#### Scenario: Owner creates shared item
- **WHEN** the trip owner posts a valid item body without `userId`
- **THEN** the server responds 201 with the created item with `userId: null`

#### Scenario: Owner creates personal item for a user
- **WHEN** the trip owner posts a valid item body with a `userId`
- **THEN** the server responds 201 with the created item with the specified `userId`

#### Scenario: Member creates their own personal item
- **WHEN** a non-owner trip member posts a valid item body
- **THEN** the server responds 201 with the created item with `userId` set to the requester's user ID

#### Scenario: Member cannot create shared item
- **WHEN** a non-owner trip member posts without `userId` (or with `userId: null`)
- **THEN** the item is still stored as personal to the requester, not shared

#### Scenario: Member cannot create item for another user
- **WHEN** a non-owner trip member posts with a `userId` belonging to a different user
- **THEN** the server responds 403

#### Scenario: Non-member is rejected
- **WHEN** an authenticated user who is not a trip member posts to the create endpoint
- **THEN** the server responds 403

#### Scenario: Missing required field
- **WHEN** the request body omits `text`
- **THEN** the server responds 422

### Requirement: Update packing item
The system SHALL expose `PUT /api/trips/:id/packing/items/:itemId` accepting `{ section?: string, text?: string, position?: number, userId?: number | null }` and returning the updated `PackingItem`. Owner role is required. Passing `userId: null` converts a personal item to shared; passing a `userId` assigns or reassigns a personal item.

#### Scenario: Owner updates item fields
- **WHEN** the owner sends a valid partial update without changing `userId`
- **THEN** the server responds with the updated item, other fields unchanged

#### Scenario: Owner converts shared item to personal
- **WHEN** the owner sends `{ userId: <id> }` for a shared item
- **THEN** the item is updated with the specified `userId`

#### Scenario: Owner converts personal item to shared
- **WHEN** the owner sends `{ userId: null }` for a personal item
- **THEN** the item is updated with `userId = NULL`

#### Scenario: Item not found
- **WHEN** the itemId does not exist or belongs to a different trip
- **THEN** the server responds 404

### Requirement: Delete packing item
The system SHALL expose `DELETE /api/trips/:id/packing/items/:itemId` and respond 204 on success. The owner MAY delete any item. A non-owner member MAY delete only items where `user_id = requester.id`; attempting to delete a shared item or another member's personal item SHALL return 403.

#### Scenario: Owner deletes any item
- **WHEN** the owner sends a delete request for any existing item
- **THEN** the server removes the row and responds 204

#### Scenario: Member deletes their own personal item
- **WHEN** a non-owner trip member sends a delete request for an item with `user_id = requester.id`
- **THEN** the server removes the row and responds 204

#### Scenario: Member cannot delete shared item
- **WHEN** a non-owner trip member sends a delete request for a shared item (`user_id IS NULL`)
- **THEN** the server responds 403

#### Scenario: Member cannot delete another member's personal item
- **WHEN** a non-owner trip member sends a delete request for an item belonging to a different user
- **THEN** the server responds 403

#### Scenario: Item not found
- **WHEN** the itemId does not exist or belongs to a different trip
- **THEN** the server responds 404

### Requirement: Bulk-replace packing items
The system SHALL expose `PUT /api/trips/:id/packing/items/bulk` accepting `{ items: Array<{ id?: number, userId?: number | null, section: string, text: string, position: number }> }`. Owner role is required. In a single transaction it SHALL:

1. Validate that every `id` present in the payload belongs to this trip — if any `id` is unrecognised, respond 400 and make no changes.
2. For each payload item that carries a known `id`: UPDATE the existing row's `section`, `text`, and `position` in-place (the row's primary key is unchanged, preserving any `packing_state` rows that reference it).
3. For each payload item without an `id`: INSERT a new row (new primary key assigned).
4. DELETE rows for this trip that were not present in the payload, scoped to the union of `userId` values represented in the payload: if the payload contains shared items (`userId` null or absent), delete shared items not in the payload; if the payload contains items for user X, delete user X's personal items not in the payload. Items belonging to users whose `userId` does not appear anywhere in the payload SHALL NOT be deleted.

Returns `{ items: PackingItem[] }` ordered by `section ASC, position ASC`.

#### Scenario: Existing item updated in-place preserves state
- **WHEN** the owner posts a bulk payload that includes an item's existing `id` with modified `text`
- **THEN** the row's primary key is unchanged, the text is updated, and any `packing_state` rows for that item ID survive

#### Scenario: New item without id is inserted
- **WHEN** the owner posts a bulk payload containing an item with no `id` field
- **THEN** a new row is inserted and the response includes it with a freshly assigned `id`

#### Scenario: Item absent from payload is deleted within its scope
- **WHEN** the owner posts a payload of shared items that omits a previously-existing shared item
- **THEN** the omitted shared item is deleted (and its `packing_state` rows cascade)

#### Scenario: Personal item for out-of-scope user is preserved
- **WHEN** the owner posts a payload containing only shared items, and a member has personal items
- **THEN** the member's personal items are not deleted

#### Scenario: Personal items for in-scope user are replaced
- **WHEN** the owner posts a payload that includes items with `userId: 3` and omits one of user 3's previous personal items
- **THEN** the omitted personal item for user 3 is deleted; user 3's items present in the payload are preserved or updated

#### Scenario: Unknown id returns 400 before any writes
- **WHEN** the owner posts a payload containing an `id` that does not exist in this trip's packing items
- **THEN** the server responds 400 and no items are modified, inserted, or deleted

#### Scenario: Empty array clears all items in scope
- **WHEN** the owner posts `{ items: [] }`
- **THEN** all items for the trip are deleted and the response is `{ items: [] }`

#### Scenario: Partial failure rolls back
- **WHEN** an error occurs mid-transaction
- **THEN** the transaction is rolled back and the item list is unchanged

#### Scenario: Response is ordered
- **WHEN** the bulk replace succeeds
- **THEN** the response items are ordered by `section ASC, position ASC` regardless of payload order

### Requirement: PackingItem repository interface
The system SHALL define `PackingItem` type (`{ id, tripId, section, text, position, userId: number | null }`) and `IPackingItemRepository` interface in `src/repositories/interfaces.ts` with methods: `listByTrip(tripId, requestingUserId: number): PackingItem[]` (returns shared + personal for that user, or all if owner), `create(tripId, data): PackingItem`, `update(id, data): PackingItem | null`, `delete(id): boolean`, `bulkReplace(tripId, items): PackingItem[]`. The `data` parameter for `create` SHALL include optional `userId?: number | null`. Authorization enforcement (who may create for whom, who may delete) is the responsibility of the route layer, not the repository.

The `bulkReplace` method signature SHALL accept items with an optional `id` and optional `userId`:
```ts
bulkReplace(
  tripId: number,
  items: Array<{ id?: number; userId?: number | null; section: string; text: string; position: number }>
): PackingItem[]
```
The method SHALL throw if any provided `id` does not belong to `tripId` (caller catches and returns 400).

#### Scenario: Interface is implemented
- **WHEN** `SqlitePackingItemRepository` is instantiated
- **THEN** it satisfies `IPackingItemRepository` at compile time (TypeScript)

#### Scenario: listByTrip filters personal items for regular member
- **WHEN** called with a `requestingUserId` that is not the owner
- **THEN** returns shared items and items where `user_id = requestingUserId` only

#### Scenario: listByTrip returns all items for owner
- **WHEN** called with the owner's `userId`
- **THEN** returns all items regardless of `user_id`

#### Scenario: Unknown id throws
- **WHEN** `bulkReplace` is called with an `id` not present in `packing_items` for the given `tripId`
- **THEN** the method throws before committing any changes

### Requirement: Admin CLI commands for packing items
The system SHALL provide CLI commands for all packing item operations so the admin can manage the packing list without a UI. All list/get commands SHALL support a `--json` flag. The `add` and `update` commands SHALL accept an optional `--user <userId>` flag to create or update personal items. The `list` command SHALL show all items (shared and personal) by default.

#### Scenario: List all items via CLI
- **WHEN** the admin runs the list command for a trip
- **THEN** all items (shared and personal) are printed to stdout; with `--json` the output is valid JSON including the `userId` field on each item

#### Scenario: Add shared item via CLI
- **WHEN** the admin runs the add command without `--user`
- **THEN** the item is created with `user_id = NULL` and confirmed to stdout

#### Scenario: Add personal item via CLI
- **WHEN** the admin runs the add command with `--user <userId>`
- **THEN** the item is created with the specified `user_id` and confirmed to stdout

#### Scenario: Update item userId via CLI
- **WHEN** the admin runs the update command with `--user <userId>`
- **THEN** the item's `user_id` is updated accordingly

#### Scenario: Bulk replace via CLI
- **WHEN** the admin runs the bulk-replace command with a JSON file path
- **THEN** the server replaces all items for the trip and confirms success

### Requirement: Read-only PackingPage
The system SHALL render a `PackingPage` at the `/packing` route in the trips client. On mount it SHALL fetch `GET /api/trips/:id/packing/items` and `GET /api/trips/:id/packing/state` in parallel. It SHALL render shared items grouped by section (section name as a styled heading, each item as a list row with a checkbox). Personal items (those returned with `userId` matching the current user) SHALL be rendered in a separate section labeled **"FYP"**, after the shared sections, also as checkboxable rows. Tapping a checkbox SHALL optimistically toggle the local state and fire `PUT /api/trips/:id/packing/state`; on error it SHALL revert the toggle. For the trip owner (user_id 1), the page SHALL additionally fetch `GET /api/trips/:id/packing/summary` in parallel and render a per-member completion summary section above the item list. The owner SHALL see each member's FYP items rendered under a **"FYP – [member name or userId]"** heading. A NavBar tab SHALL link to `/packing`.

#### Scenario: Shared items rendered under section headings
- **WHEN** the PackingPage mounts and items are fetched
- **THEN** shared items are displayed under their section headings in position order with checkboxes reflecting the current user's checked state

#### Scenario: Personal items rendered in FYP section
- **WHEN** the current user has personal items in the response
- **THEN** a "FYP" section appears after the shared sections containing those items with checkboxes

#### Scenario: No FYP section when user has no personal items
- **WHEN** the current user has no personal items
- **THEN** no "FYP" section is rendered

#### Scenario: Owner sees all members' FYP items
- **WHEN** the owner views the PackingPage and multiple members have personal items
- **THEN** the owner sees a "FYP – [member]" section per member containing that member's personal items

#### Scenario: Tap to check an item
- **WHEN** the user taps an unchecked checkbox
- **THEN** the checkbox immediately shows as checked (optimistic), and a PUT request is sent to persist the state

#### Scenario: Tap to uncheck an item
- **WHEN** the user taps a checked checkbox
- **THEN** the checkbox immediately shows as unchecked (optimistic), and a PUT request is sent to persist the state

#### Scenario: Toggle reverts on error
- **WHEN** the PUT request for a toggle fails
- **THEN** the checkbox reverts to its prior state

#### Scenario: Owner sees completion summary
- **WHEN** the owner (user_id 1) views the PackingPage
- **THEN** a summary section above the list shows one row per member with their `checked/total` count

#### Scenario: Non-owner does not see summary
- **WHEN** a non-owner member views the PackingPage
- **THEN** no summary section is rendered

#### Scenario: Empty state
- **WHEN** no items exist for the trip
- **THEN** the page displays "No packing list yet."

#### Scenario: NavBar tab present
- **WHEN** the user views any page in the trips app
- **THEN** a Packing tab is visible in the NavBar and navigates to `/packing`
