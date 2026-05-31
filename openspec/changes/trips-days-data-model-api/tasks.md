## 1. Database Migration

- [ ] 1.1 Add `trip_days` table migration to `src/db.ts` (`CREATE TABLE IF NOT EXISTS trip_days` with `trip_id` FK cascade, `date`, `title`, `body`, `weather`, unique `(trip_id, date)`)
- [ ] 1.2 Add `trip_days` to `TABLE_NAMES` in `src/db.ts`

## 2. Repository Interface & Types

- [ ] 2.1 Add `TripDay` type to `src/repositories/interfaces.ts`: `{ id, tripId, date, title, body, weather }`
- [ ] 2.2 Add `ITripDayRepository` interface to `src/repositories/interfaces.ts`: `listByTrip(tripId): TripDay[]`, `upsertDay(tripId, date, data: { title?, body?, weather? }): TripDay`, `generateDays(tripId, startDate, endDate): void`

## 3. SQLite Repository Implementation

- [ ] 3.1 Create `src/repositories/sqlite/trip-day.repository.ts` implementing `ITripDayRepository`
- [ ] 3.2 Implement `listByTrip`: `SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date ASC`
- [ ] 3.3 Implement `upsertDay`: `UPDATE trip_days SET ... WHERE trip_id = ? AND date = ?`, return updated row (404 if not found)
- [ ] 3.4 Implement `generateDays`: loop from `startDate` to `endDate` inclusive, fire `INSERT OR IGNORE` for each date; no-op when either date is null

## 4. Trip Repository — Side Effects

- [ ] 4.1 Wire `ITripDayRepository` into `SqliteTripRepository` (inject via constructor or instantiate inline)
- [ ] 4.2 In `SqliteTripRepository.create()`: after inserting the trip row, call `generateDays` when both `start_date` and `end_date` are non-null
- [ ] 4.3 In `SqliteTripRepository.update()`: after updating the trip row, fetch the updated trip and call `generateDays` when both `start_date` and `end_date` are non-null on the result

## 5. API Routes

- [ ] 5.1 Create `src/routes/trips/days.ts` with a Hono router; add trip-membership authorization helper (re-use pattern from `src/routes/trips.ts`)
- [ ] 5.2 Implement `GET /api/trips/:id/days`: verify membership, call `tripDayRepo.listByTrip(tripId)`, return `{ days }`
- [ ] 5.3 Implement `PUT /api/trips/:id/days/:date`: validate `date` param is YYYY-MM-DD (Zod regex), verify owner role, call `tripDayRepo.upsertDay(tripId, date, body)`, return updated `TripDay`
- [ ] 5.4 Mount the days router in `src/app.ts` at `/api/trips`

## 6. Admin CLI

- [ ] 6.1 Add `trips:days:list <tripId>` command to `scripts/admin.ts`; support `--json` flag; print days ordered by date
- [ ] 6.2 Add `trips:days:update <tripId> <date>` command with `--title`, `--body`, `--weather` flags and `--json` flag; print updated day record

## 7. Documentation & Spec Files

- [ ] 7.1 Update `openapi.yaml`: add `GET /api/trips/{id}/days` and `PUT /api/trips/{id}/days/{date}` routes with request/response schemas
- [ ] 7.2 Update `llm-context.md`: document the `trip_days` table, auto-generation behavior, and new day routes

## 8. Build Verification

- [ ] 8.1 Run `npm run build:server` and confirm zero TypeScript errors
