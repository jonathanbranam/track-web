**App**: trips

## MODIFIED Requirements

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
The system SHALL define `PackingItem` type (`{ id, tripId, section, text, position }`) and `IPackingItemRepository` interface in `src/repositories/interfaces.ts` with methods: `listByTrip(tripId): PackingItem[]`, `create(tripId, data): PackingItem`, `update(id, data): PackingItem | null`, `delete(id): boolean`, `bulkReplace(tripId, items): PackingItem[]`.

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

#### Scenario: Unknown id throws
- **WHEN** `bulkReplace` is called with an `id` not present in `packing_items` for the given `tripId`
- **THEN** the method throws before committing any changes
