## 1. Database Migration

- [ ] 1.1 Add `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE` (nullable, default NULL) to `packing_items` via `ALTER TABLE ADD COLUMN` inline migration in `src/db.ts`
- [ ] 1.2 Confirm existing rows default to `user_id = NULL` (shared) after migration

## 2. Repository Interface

- [ ] 2.1 Update `PackingItem` type in `src/repositories/interfaces.ts` to add `userId: number | null`
- [ ] 2.2 Update `IPackingItemRepository.listByTrip` signature to `listByTrip(tripId: number, requestingUserId: number): PackingItem[]`
- [ ] 2.3 Update `create` and `bulkReplace` data parameter types to include `userId?: number | null`

## 3. SQLite Repository Implementation

- [ ] 3.1 Update `SqlitePackingItemRepository.listByTrip` to return all items when `requestingUserId === 1` (owner), or shared (`user_id IS NULL`) + personal (`user_id = requestingUserId`) for other members
- [ ] 3.2 Update `SqlitePackingItemRepository.create` to persist `userId` from the data argument
- [ ] 3.3 Update `SqlitePackingItemRepository.bulkReplace` to persist `userId` on each item in the array

## 4. Route Authorization — List & Bulk

- [ ] 4.1 Update `GET /api/trips/:id/packing/items` handler to pass `requestingUserId` (from session) to `listByTrip`
- [ ] 4.2 Update `PUT /api/trips/:id/packing/items/bulk` to accept optional `userId` on each item in the request body and pass it through to `bulkReplace`

## 5. Route Authorization — Create

- [ ] 5.1 Update `POST /api/trips/:id/packing/items` to accept trip membership (not just owner)
- [ ] 5.2 For non-owner requesters: always store item with `user_id = requester.id`; ignore any `userId` in the request body
- [ ] 5.3 For owner: store with `userId` from body if provided, else `NULL` (shared)

## 6. Route Authorization — Update & Delete

- [ ] 6.1 Update `PUT /api/trips/:id/packing/items/:itemId` to accept optional `userId?: number | null` in body (owner-only, existing auth unchanged)
- [ ] 6.2 Update `DELETE /api/trips/:id/packing/items/:itemId` to allow non-owner members to delete items where `user_id = requester.id`; return 403 for shared items or other members' personal items

## 7. Admin CLI

- [ ] 7.1 Add optional `--user <userId>` flag to the `packing items add` CLI command; pass through as `userId` in the API request
- [ ] 7.2 Add optional `--user <userId>` flag to the `packing items update` CLI command
- [ ] 7.3 Confirm `packing items list` displays `userId` field for each item and `--json` output includes it

## 8. Client — PackingPage

- [ ] 8.1 Split items returned from `GET /api/trips/:id/packing/items` into shared (no `userId`) and personal (`userId === currentUser.id`) arrays
- [ ] 8.2 Render shared items grouped by section as before
- [ ] 8.3 Render personal items in a **"FYP"** section after all shared sections; omit the section when the user has no personal items
- [ ] 8.4 For owner view: group all non-null-userId items by `userId` and render each group as a **"FYP – [userId]"** section after shared sections

## 9. Documentation & API Spec

- [ ] 9.1 Update `openapi.yaml`: `POST /api/trips/:id/packing/items` — change auth from owner-only to member, add optional `userId` request field and `userId` response field
- [ ] 9.2 Update `openapi.yaml`: `DELETE /api/trips/:id/packing/items/:itemId` — update auth description to reflect member self-delete rule
- [ ] 9.3 Update `openapi.yaml`: `PUT /api/trips/:id/packing/items/:itemId` — add optional `userId` request and response field
- [ ] 9.4 Update `openapi.yaml`: `GET /api/trips/:id/packing/items` — add `userId` field to `PackingItem` schema
- [ ] 9.5 Update `llm-context.md` to note that packing item create/delete is open to all trip members for personal items

## 10. Build & Verify

- [ ] 10.1 Build server (`npm run build:server`) and confirm zero TypeScript errors
- [ ] 10.2 Build trips client and confirm zero TypeScript errors
