## Context

The trips app has `start_date` and `end_date` columns on the `trips` table (added in Spec 1), but no day-level records exist yet. The Days tab (Spec 5) needs one `trip_days` row per calendar date between those dates. This change adds that table, the auto-generation logic, and the two API routes the frontend will consume.

Existing pattern: all data access goes through repository interfaces (`src/repositories/interfaces.ts`) with SQLite implementations in `src/repositories/sqlite/`. Trip routes use a router mounted in `app.ts`. Authorization checks membership (`isMember`) and role (`getMemberRole`) from `ITripRepository`.

## Goals / Non-Goals

**Goals:**
- Add `trip_days` table with inline migration in `db.ts`
- Auto-generate day records when a trip is created or updated with a complete date range
- Expose `GET /api/trips/:id/days` and `PUT /api/trips/:id/days/:date`
- Add admin CLI commands for day listing and editing

**Non-Goals:**
- Frontend Days tab UI (Spec 5)
- Deleting day records when the date range shrinks
- Bulk day creation outside of trip create/update
- Pagination (trips are bounded in length; full list is fine)

## Decisions

### Separate `ITripDayRepository` (not merged into `ITripRepository`)
Keeps each interface small and cohesive. `ITripRepository` already covers trip CRUD and membership; mixing in day operations would make it unwieldy. The existing pattern uses one interface per domain entity.

### `generateDays` called from repository, not route handler
Placing the call inside `SqliteTripRepository.create()` and `update()` ensures the invariant is maintained regardless of how trips are written (direct repo calls, CLI, tests). If it lived in the route handler, CLI scripts that bypass routes would silently skip generation.

### INSERT OR IGNORE — never delete rows on date range shrink
Intentional: prevents data loss when dates are accidentally edited via API. A day with authored content that falls outside a narrowed range is preserved in the DB and harmless (the frontend only renders days in the current range). Reversing the date change restores visibility instantly.

### Iteration strategy for `generateDays`
Simple in-process JavaScript date loop: start at `startDate`, increment by one day, stop after `endDate` (inclusive). Each iteration fires an `INSERT OR IGNORE`. For typical trip lengths (≤ 30 days) this is negligible. No need for a recursive CTE or bulk insert beyond the simple loop.

### Route file: `src/routes/trips/days.ts`
A dedicated file keeps the days logic isolated. Mounted in `app.ts` at `/api/trips`. Uses the same `authMiddleware` and trip-membership authorization pattern as `src/routes/trips.ts`.

### Date parameter format in PUT route
The `:date` path param is `YYYY-MM-DD`. Validation: reject anything that doesn't match that pattern (Zod regex). This is the canonical format already used in `trip_days.date`.

## Risks / Trade-offs

- **Large date ranges**: A trip with a very long range (e.g., 365 days) generates 365 INSERT OR IGNORE statements. Not a real concern for family trips, but worth noting. Mitigation: no action needed; loop is fast enough for any realistic trip length.
- **generateDays called on every update**: Even if only `name` changes, the update method checks whether `startDate` and `endDate` are both non-null after the update and calls `generateDays` only then. The check is O(1) and `INSERT OR IGNORE` on already-existing rows is a no-op.
- **No delete**: Day records outside the current date range are invisible to the API consumer (GET returns all rows for the trip, not just those in range) — wait, actually design decision: `GET /days` returns ALL rows for the trip ordered by date. If a date range shrinks, old days are still returned. The frontend (Spec 5) filters to the range. This is fine and is documented.

**Correction to above**: `GET /api/trips/:id/days` returns all `trip_days` rows for the trip ordered by date. The client renders based on what's returned; it does not filter. This keeps the API simple and lets the frontend display any authored content. If the range shrinks, extra rows are visible but harmless; restoring the range makes them part of the trip again.

## Migration Plan

1. Add `trip_days` migration to `src/db.ts` (inline `ALTER`-style `CREATE TABLE IF NOT EXISTS` block, same as existing migrations)
2. Add `trip_days` to `TABLE_NAMES` in `src/db.ts`
3. No data migration needed — existing trips with null dates generate no rows (generateDays is a no-op when either date is null)
4. Rollback: drop `trip_days` table; remove routes and repository

## Open Questions

- None — design is fully specified in the Spec 4 authoring guide in `docs/trips/design.md`
