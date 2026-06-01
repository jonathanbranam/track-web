## Why

The `PUT /api/trips/:id/packing/items/bulk` endpoint currently deletes all packing items and re-inserts them, issuing new primary keys each time. Because `packing_state` rows reference `packing_item.id` with `ON DELETE CASCADE`, every bulk replace silently wipes every family member's checked progress. Any list update mid-trip (adding an item, fixing a typo) destroys in-progress state.

## What Changes

- `PUT /api/trips/:id/packing/items/bulk` request body changes: items now optionally carry an `id` field — items with an existing `id` are updated in-place (row is preserved, so `packing_state` survives); items without an `id` are inserted as new rows; items absent from the payload are deleted only within the user-id scopes present in the payload (see design D3).
- **BREAKING**: `IPackingItemRepository.bulkReplace(tripId, items)` input type changes from `Array<{ section, text, position }>` to `Array<{ id?: number, userId?: number | null, section: string, text: string, position: number }>`.
- The repository implementation changes from a single `DELETE WHERE trip_id = ?` + bulk insert to a transactional upsert + user-scope-aware selective delete.
- Bulk replace handles both shared items (`userId: null`) and personal items (`userId: <number>`); items for users not mentioned in the payload are never touched.
- No changes to the response shape, other endpoints, frontend, or `packing_state` table.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `packing-items`: bulk-replace requirement changes from delete-all-then-insert to id-aware upsert — items with a known `id` are updated in-place, new items are inserted, and only items absent from the payload are deleted.

## Impact

- `src/repositories/interfaces.ts` — `IPackingItemRepository.bulkReplace` input type
- `src/repositories/sqlite/packing-items.repository.ts` — implementation of `bulkReplace`
- `src/routes/packing.ts` — request validation schema for the bulk route
- CLI packing scripts that call `bulk` (if any pass items without IDs, behavior is unchanged; if they pass IDs, they now get update semantics)
- No frontend changes required
