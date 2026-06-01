## 1. Repository Interface

- [x] 1.1 In `src/repositories/interfaces.ts`, update the `bulkReplace` item input type to `Array<{ id?: number; userId?: number | null; section: string; text: string; position: number }>` — keep the return type `PackingItem[]` unchanged

## 2. Repository Implementation

- [x] 2.1 In `SqlitePackingItemRepository.bulkReplace`, add an up-front validation query: collect all `id` values from the payload, query `SELECT id FROM packing_items WHERE trip_id = ? AND id IN (...)`, and throw if any payload ID is not in the result
- [x] 2.2 Replace the `DELETE` + bulk `INSERT` transaction body with: UPDATE rows for payload items that carry a known `id` (section, text, position only); INSERT new rows for payload items without an `id`
- [x] 2.3 Implement user-scope-aware delete: collect the distinct `userId` values present in the payload (null counts as shared); for each scope, delete rows for the trip in that scope whose `id` is not in the payload; leave rows for unmentioned users untouched
- [x] 2.4 Return a fresh `SELECT * FROM packing_items WHERE trip_id = ? ORDER BY section ASC, position ASC` after the transaction so the response reflects the final state in order

## 3. Route Validation

- [x] 3.1 In `src/routes/packing.ts`, update `bulkReplaceSchema` item shape to add `id: z.number().int().positive().optional()` and `userId: z.number().int().positive().nullable().optional()`
- [x] 3.2 Wrap the `packingItemRepo.bulkReplace(...)` call in a try/catch; on thrown error (unknown ID), return `c.json({ error: 'One or more item IDs not found for this trip' }, 400)`

## 4. CLI

- [x] 4.1 Check the packing CLI bulk command — if it constructs items from fetched API data, confirm the `id` field flows through naturally; if it reads from a static file/template, document that IDs should be included to preserve state and update the CLI help text accordingly

## 5. API Documentation

- [x] 5.1 Update `openapi.yaml`: for `PUT /api/trips/{id}/packing/items/bulk`, update the request body item schema to include `id` (integer, optional) and `userId` (integer, nullable, optional); update the description to explain ID-preserving semantics

## 6. Verification

- [x] 6.1 Run `npm run build:server` and confirm zero TypeScript errors
- [ ] 6.2 Manual test: create items via POST, record their IDs, call bulk replace with those IDs and modified text — confirm IDs are unchanged in the response and any packing_state rows survive
- [ ] 6.3 Manual test: call bulk replace with a mix of items with and without `id` — confirm existing items are updated and new items receive fresh IDs
- [ ] 6.4 Manual test: call bulk replace omitting one existing item — confirm the omitted item is deleted
- [ ] 6.5 Manual test: call bulk replace with an `id` that does not exist for the trip — confirm 400 and no changes to the item list
