## Why

The Days tab requires day-level records for each calendar date of a trip, but no such data model or API exists yet. This change adds the `trip_days` table, auto-generation logic, and the two API routes that the Days frontend (Spec 5) will consume.

## What Changes

- Add `trip_days` SQLite table (id, trip_id, date, title, body, weather) with a `(trip_id, date)` unique constraint
- Add `ITripDayRepository` interface and `SqliteTripDayRepository` implementation
- `generateDays(tripId, startDate, endDate)` inserts one row per calendar date using `INSERT OR IGNORE` — existing rows are never deleted, preventing data loss on accidental date edits
- `tripRepo.create()` calls `generateDays` when `start_date` and `end_date` are both set
- `tripRepo.update()` calls `generateDays` when `start_date` or `end_date` is included in the update and both values are non-null after the update
- New route: `GET /api/trips/:id/days` → `{ days: TripDay[] }` ordered by `date ASC`; requires membership
- New route: `PUT /api/trips/:id/days/:date` body `{ title?, body?, weather? }` → updated `TripDay`; requires owner role
- Admin CLI: add `trips:days:list <tripId>` and `trips:days:update <tripId> <date>` commands with `--title`, `--body`, `--weather` flags

## Capabilities

### New Capabilities
- `trip-days`: `trip_days` table, `ITripDayRepository` interface, `SqliteTripDayRepository`, `generateDays` hook on trip create/update, and the `GET /days` + `PUT /days/:date` API routes

### Modified Capabilities
- `trip-data`: Create and update trip operations gain a side-effect — when both `start_date` and `end_date` are present after the write, `generateDays` is called to populate any missing day records for the date range

## Impact

- **`src/db.ts`** — new `trip_days` table migration and `TABLE_NAMES` entry
- **`src/repositories/interfaces.ts`** — `TripDay` type, `ITripDayRepository` interface; `ITripRepository.create` and `update` signatures unchanged but behavior extended
- **`src/repositories/sqlite/trip-day.repository.ts`** — new file
- **`src/repositories/sqlite/trip.repository.ts`** — call `generateDays` inside `create` and `update`
- **`src/routes/trips/days.ts`** — new router file mounted at `/api/trips/:id/days`
- **`src/app.ts`** — mount the days router
- **`scripts/admin.ts`** — new `trips:days:list` and `trips:days:update` commands
- **No frontend changes** in this spec (Days UI is Spec 5)
