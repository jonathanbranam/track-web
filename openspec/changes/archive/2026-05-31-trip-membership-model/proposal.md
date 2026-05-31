## Why

The trips app currently scopes all data to a single owner via `trips.user_id`, making it impossible to share a trip with family members who have their own accounts. Adding a `trip_members` table establishes the multi-user access model that all subsequent tabs (Days, Info, Packing) depend on, and makes this a deliberate breaking change now — before family members are added to the system.

## What Changes

- **BREAKING**: Add `trip_members` table; membership (not `trips.user_id`) now gates read access to trips and all sub-resources.
- New `trip_members` table with `trip_id`, `user_id`, `role` (`owner` | `member`), and `joined_at`.
- Trip creation auto-inserts the creating user as `owner` in `trip_members`.
- `GET /api/trips/current` and `GET /api/trips` now return trips where the authenticated user is a member, not just where `trips.user_id` matches.
- New member management routes (admin/CLI use only — no in-app UI): list, add, and remove members.
- All existing trip routes validate membership before returning data; mutation routes additionally require `owner` role.

## Capabilities

### New Capabilities

- `trip-membership`: `trip_members` table schema, auto-owner-insert on trip create, member management routes (`GET/POST/DELETE /api/trips/:id/members`), and membership/role authorization on all trip routes.

### Modified Capabilities

- `trip-data`: `GET /api/trips` and `GET /api/trips/current` now filter by `trip_members` membership instead of `trips.user_id`. All routes enforce membership authorization. This is a spec-level behavior change.

## Impact

- **Backend**: `src/db.ts` (new migration), `src/repositories/sqlite/trip.repository.ts` (membership joins, new member methods), `src/routes/trips.ts` (auth checks on all routes, new `/members` sub-routes), `src/repositories/interfaces.ts` (extended `ITripRepository`)
- **No frontend changes** — membership is transparent to the existing UI; the current user is always a member of any trip they can see
- **Breaking**: any existing trips will have no `trip_members` rows after migration. A migration step must backfill the owner row (`INSERT INTO trip_members SELECT id, user_id, 'owner', created_at FROM trips`) so existing trips remain accessible.
