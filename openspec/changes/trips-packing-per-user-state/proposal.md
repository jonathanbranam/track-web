## Why

The packing list is visible but static — users can see items but cannot check them off. This spec adds per-user checked state so each family member can track their own packing progress independently without affecting anyone else's view.

## What Changes

- New `packing_state` table tracking `(packing_item_id, user_id, checked)` with `ON DELETE CASCADE` on `packing_item_id`
- New `IPackingStateRepository` interface and `SqlitePackingStateRepository` implementation
- New routes: `GET /api/trips/:id/packing/state` (current user's state), `PUT /api/trips/:id/packing/state` (toggle an item), `GET /api/trips/:id/packing/summary` (owner-only per-member completion counts)
- PackingPage updated: checkboxes are now interactive with per-user state applied; tap to toggle with optimistic update and error revert; owner (user_id 1) sees a per-member completion summary above the list

## Capabilities

### New Capabilities
- `packing-user-state`: Per-user checked state for packing items — DB table, repository interface, state read/write routes, and owner-only summary route

### Modified Capabilities
- `packing-items`: PackingPage requirements change from read-only static checkboxes to interactive per-user checkboxes with state fetched on mount, optimistic toggle on tap, and an owner-only completion summary section

## Impact

- **Backend**: `src/db.ts` (new migration), `src/repositories/interfaces.ts` (new type + interface), new `src/repositories/sqlite/packingState.repository.ts`, new packing state routes mounted in the existing packing router
- **Frontend**: `client-trips/src/pages/PackingPage.tsx` — adds state fetch, checkbox interactivity, optimistic toggle logic, owner summary bar
- **Dependencies**: Requires Spec 6 (packing items table and routes) to be in place
