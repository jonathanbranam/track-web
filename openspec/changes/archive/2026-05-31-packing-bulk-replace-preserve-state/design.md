## Context

`PUT /api/trips/:id/packing/items/bulk` is the primary authoring path for packing lists. Its current implementation deletes all `packing_items` rows for the trip, then re-inserts the payload. Because `packing_state.packing_item_id` has `ON DELETE CASCADE`, every call wipes every family member's checked progress. Any edit to the list mid-trip (adding an item, fixing a typo, reordering) destroys state.

There are no existing API clients; the endpoint is only used via CLI/curl by the admin.

## Goals / Non-Goals

**Goals:**
- Bulk replace preserves `packing_state` for items that remain in the list (identified by `id`)
- Items without an `id` in the payload are inserted as new rows
- Items present in the DB but absent from the payload are deleted (state cascades)
- Single transaction — the list is never partially updated
- No DB schema changes

**Non-Goals:**
- Partial updates to individual items (that's `PUT /packing/items/:itemId`)
- Reordering-only semantics or diffing by content
- Any frontend changes

## Decisions

### D1 — Items are identified by `id`, not by content

Using `id` as the stable key is the only correct choice: item text can be edited, section can change, position can change. Content-hashing or positional matching would silently break state. The payload carries an optional `id`; presence means "update this row", absence means "insert new row".

*Alternative considered:* match by `text` — rejected because renaming an item would be treated as a delete + insert, losing state.

### D2 — Unknown `id` values are a 400 error

If the payload contains an `id` that does not belong to this trip, the request is rejected with 400. Silently ignoring a foreign ID would mask client bugs; silently inserting a new row would be surprising.

The check is: `SELECT id FROM packing_items WHERE trip_id = ? AND id IN (...)`. Any `id` not in that result set triggers the 400 before any mutations occur.

### D3 — Update-or-insert for payload items; user-scope-aware delete for omitted items

For items with an `id` (after validation passes): `UPDATE packing_items SET section=?, text=?, position=? WHERE id = ?`.  
For items without an `id`: `INSERT INTO packing_items (trip_id, section, text, position) VALUES (?, ?, ?, ?)`.

For deletions, the scope is **user-scope-aware**: only delete rows whose `user_id` is represented in the payload. Specifically:
- If the payload contains any shared items (`userId: null`): delete shared items for the trip not in the payload
- If the payload contains items for user X: delete user X's personal items for the trip not in the payload
- Items for users not mentioned anywhere in the payload are left untouched

This means a payload of only shared items won't accidentally delete any personal items; a payload of shared + user 3's items replaces both those scopes while leaving users 2 and 4's items alone.

All three operations run inside a single `better-sqlite3` transaction. On error the transaction is rolled back and a 500 is returned.

*Alternative considered:* delete all items for the trip not in payload (no scope) — rejected because it forces the admin to include all personal items in every bulk call or they will be deleted.

### D4 — Response returns the full updated list in section/position order

Same as current behavior — `{ items: PackingItem[] }` ordered by `section ASC, position ASC`. No shape change.

### D5 — `IPackingItemRepository.bulkReplace` input type widens to accept optional `id`

```ts
// before
bulkReplace(tripId: number, items: Array<{ section: string; text: string; position: number }>): PackingItem[]

// after
bulkReplace(tripId: number, items: Array<{ id?: number; section: string; text: string; position: number }>): PackingItem[]
```

The route's Zod schema adds `id: z.number().int().positive().optional()` to the item shape. No other interface or type changes.

## Risks / Trade-offs

**[Risk] Admin passes stale IDs from a cached payload** → Items that no longer exist in the DB will cause a 400. The admin will need to fetch the current list first (`GET /packing/items`) if building a payload from scratch. Mitigation: document this in the spec; the CLI should fetch-then-edit rather than sending a hard-coded payload.

**[Risk] Partial success feels atomic but the 400 check must run before any writes** → Mitigated by D2: validate all IDs up front before entering the transaction. The request either succeeds fully or fails with no changes.

**[Trade-off] Items without an `id` always create new rows** → An admin who drops the `id` field from an existing item accidentally creates a duplicate and loses state for the original. This is acceptable because the admin controls the payload and the CLI will surface IDs in its output.

## Migration Plan

No schema migration required. Changes are purely in application code:

1. Update `IPackingItemRepository.bulkReplace` input type in `interfaces.ts`
2. Rewrite `SqlitePackingItemRepository.bulkReplace` with validation + upsert + selective delete
3. Update `bulkReplaceSchema` in `routes/packing.ts` to accept optional `id`
4. No data migration — existing `packing_items` and `packing_state` rows are unaffected

Rollback: revert the three files. No DB state to undo.

### D6 — Sequencing with `trips-packing-items-per-user`

The `trips-packing-items-per-user` change adds `user_id` to `packing_items`. These two changes compose cleanly in either order:

- **If this change lands first**: the `user_id` column doesn't exist yet, so user-scope-aware delete degrades gracefully — all items are treated as shared (correct, since no personal items can exist yet). When `user_id` is added, the scoping logic activates automatically.
- **If `trips-packing-items-per-user` lands first**: the `user_id` column already exists. The bulk payload items may include a `userId` field (null = shared, number = personal for that user). The user-scope-aware delete logic in D3 handles both cases correctly.

**Payload item type** (when `trips-packing-items-per-user` is present): `{ id?: number, userId?: number | null, section: string, text: string, position: number }`. The `userId` field is optional — omitting it defaults to null (shared).

**ID validation** (D2) scopes to the union of all items the requester may modify: for the owner, all items for the trip; for a member (if members are ever permitted to call bulk), only their personal items. An `id` outside that scope returns 400.

## Open Questions

_(none — no existing clients means no backward-compatibility constraint)_
