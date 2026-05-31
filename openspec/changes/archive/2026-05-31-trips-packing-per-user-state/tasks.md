## 1. Database Migration

- [x] 1.1 Add `packing_state` table migration to `src/db.ts` with columns `id`, `packing_item_id` (FK → `packing_items.id` ON DELETE CASCADE), `user_id`, `checked`; add unique constraint on `(packing_item_id, user_id)`
- [x] 1.2 Add `packing_state` to `TABLE_NAMES` in `src/db.ts`

## 2. Repository Layer

- [x] 2.1 Add `PackingState` type and `IPackingStateRepository` interface to `src/repositories/interfaces.ts` with `getState(tripId, userId): Record<number, boolean>` and `setState(itemId, userId, checked: boolean): void`
- [x] 2.2 Create `src/repositories/sqlite/packingState.repository.ts` implementing `IPackingStateRepository`; `getState` queries all checked items for the user across the trip; `setState` upserts via `INSERT OR REPLACE`
- [x] 2.3 Wire `SqlitePackingStateRepository` into `app.ts` / the dependency injection setup alongside the existing packing item repository

## 3. API Routes

- [x] 3.1 Add `GET /api/trips/:id/packing/state` to the packing router; requires membership; returns `{ state: Record<number, boolean> }` from `getState(tripId, userId)`
- [x] 3.2 Add `PUT /api/trips/:id/packing/state` accepting `{ itemId: number, checked: boolean }`; validate `itemId` belongs to the trip (404 if missing, 403 if wrong trip); requires membership; call `setState` and return `{ ok: true }`
- [x] 3.3 Add `GET /api/trips/:id/packing/summary` to the packing router; requires owner role; run SQL aggregation joining `packing_items` and `packing_state` to return `{ members: Array<{ userId, checked, total }> }`

## 4. Admin CLI Commands

- [x] 4.1 Add `packing state get <tripId> <userId>` CLI command; prints checked itemIds; supports `--json`
- [x] 4.2 Add `packing state set <tripId> <userId> <itemId> <true|false>` CLI command; calls PUT route or repo directly; confirms success
- [x] 4.3 Add `packing summary <tripId>` CLI command; prints per-member completion counts; supports `--json`
- [x] 4.4 Document new CLI commands in `README.md`

## 5. Frontend — PackingPage

- [x] 5.1 Update `PackingPage` to fetch `/packing/items` and `/packing/state` (and `/packing/summary` if owner) in parallel via `Promise.all` on mount
- [x] 5.2 Merge state map into item list before render: each item gets a `checked` boolean derived from the state record
- [x] 5.3 Replace static unchecked checkbox icons with interactive checkboxes bound to each item's `checked` state
- [x] 5.4 Implement optimistic toggle: on tap, immediately flip local state, fire `PUT /packing/state`, revert on error
- [x] 5.5 Render owner-only completion summary section above the item list: one row per member showing `checked/total` (visible only when `userId === 1`)

## 6. API Documentation & Context

- [x] 6.1 Add the three new packing state routes to `openapi.yaml` (`GET /packing/state`, `PUT /packing/state`, `GET /packing/summary`)
- [x] 6.2 Update `llm-context.md` to note per-user packing state and owner summary route

## 7. Build Verification

- [x] 7.1 Run `npm run build:server` and confirm zero TypeScript errors
- [x] 7.2 Run `npm run build` (all clients) and confirm zero TypeScript errors
