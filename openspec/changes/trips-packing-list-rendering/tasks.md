## 1. Database & Migration

- [x] 1.1 Add `packing_items` table migration (`0023_packing_items`) in `src/db.ts` with columns: `id, trip_id, section, text, position` and `ON DELETE CASCADE` on `trip_id`
- [x] 1.2 Add `'packing_items'` to `TABLE_NAMES` in `src/db.ts`

## 2. Repository Layer

- [x] 2.1 Add `PackingItem` type and `IPackingItemRepository` interface to `src/repositories/interfaces.ts`
- [x] 2.2 Create `src/repositories/sqlite/packing-items.repository.ts` implementing `listByTrip`, `create`, `update`, `delete`, and `bulkReplace` (transaction)

## 3. API Routes

- [x] 3.1 Create `src/routes/packing.ts` with `createPackingRouter(tripRepo, packingItemRepo)` factory
- [x] 3.2 Implement `GET /:id/packing/items` — list items ordered by `section, position`; membership required
- [x] 3.3 Implement `POST /:id/packing/items` — create item; owner required; validate `section, text, position`
- [x] 3.4 Implement `PUT /:id/packing/items/bulk` — bulk-replace in transaction; owner required (register before `/:id/packing/items/:itemId` to avoid route conflict)
- [x] 3.5 Implement `PUT /:id/packing/items/:itemId` — update item; owner required; 404 if not found
- [x] 3.6 Implement `DELETE /:id/packing/items/:itemId` — delete item; owner required; 204 on success; 404 if not found
- [x] 3.7 Instantiate `SqlitePackingItemRepository` and mount the packing router in `src/app.ts`

## 4. Admin CLI Commands

- [x] 4.1 Add CLI command to list packing items for a trip (supports `--json`)
- [x] 4.2 Add CLI command to create a single packing item
- [x] 4.3 Add CLI command to bulk-replace items from a JSON file
- [x] 4.4 Add CLI command to delete a packing item by ID
- [x] 4.5 Update `README.md` with the new CLI commands

## 5. Frontend — PackingPage

- [x] 5.1 Add `PackingItem` type to `client-trips/src/types.ts`
- [x] 5.2 Add `fetchPackingItems(tripId)` to `client-trips/src/api.ts`
- [x] 5.3 Create `client-trips/src/pages/PackingPage.tsx`: fetch items on mount, group by section, render section headings and item rows with unchecked checkbox icons; empty state "No packing list yet."
- [x] 5.4 Add `/packing` route in `client-trips/src/App.tsx`
- [x] 5.5 Add Packing tab to `client-trips/src/components/NavBar.tsx`

## 6. Documentation & Spec Hygiene

- [x] 6.1 Update `openapi.yaml` with all five new packing items routes
- [x] 6.2 Update `llm-context.md` if packing items routes affect API consumer behavior or auth notes
- [x] 6.3 Build client-trips and confirm zero TypeScript errors (`npm run build:trips` or equivalent)
- [x] 6.4 Verify server builds clean (`npm run build:server`)
