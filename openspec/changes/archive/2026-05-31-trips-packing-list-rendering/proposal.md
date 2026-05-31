## Why

The Trips app has no packing list. This spec adds the structured `packing_items` data model and a read-only `PackingPage` so family members can see what to pack, grouped by section — laying the groundwork for per-user check-off state in Spec 7.

## What Changes

- New `packing_items` table: `id, trip_id, section, text, position`
- `PackingItem` type in `src/repositories/interfaces.ts`
- `IPackingItemRepository` with list, create, update, delete, and bulk-replace operations
- `SqlitePackingItemRepository` implementing the above
- API routes under `/api/trips/:id/packing/items`: list (GET), create (POST), update (PUT), delete (DELETE), bulk-replace (PUT bulk)
- New `PackingPage` at `/packing` route with NavBar entry
- Read-only UI: items grouped by section with unchecked checkbox icons (no interactivity yet)
- Empty state: "No packing list yet."

## Capabilities

### New Capabilities

- `packing-items`: Structured packing list — DB table, repository, CRUD + bulk-replace API, and read-only PackingPage tab

### Modified Capabilities

*(none — no existing spec-level behavior changes)*

## Impact

- `src/db.ts` — inline migration for `packing_items` table
- `src/repositories/interfaces.ts` — `PackingItem` type and `IPackingItemRepository` interface
- `src/repositories/sqlite/packing-items.repository.ts` — new SQLite implementation
- `src/routes/packing.ts` — new Hono router mounted at `/api/trips/:id/packing`
- `src/app.ts` — mount packing router
- `client-trips/src/pages/PackingPage.tsx` — new page component
- `client-trips/src/App.tsx` — add `/packing` route
- `client-trips/src/components/NavBar.tsx` — add Packing tab
- `client-trips/src/api.ts` — add `fetchPackingItems` helper
- `client-trips/src/types.ts` — add `PackingItem` type
