## Why

The trips data model currently stores only night/day counts with no calendar dates, and has no field for a general-purpose info page. Adding `start_date`, `end_date`, and `info_markdown` unblocks all subsequent phases (Days tab auto-generation, "Today" card, Info tab) without further schema migrations.

## What Changes

- Add three nullable columns to the `trips` table: `start_date TEXT` (YYYY-MM-DD), `end_date TEXT` (YYYY-MM-DD), `info_markdown TEXT`
- Extend `CreateTripInput` / `UpdateTripInput` types and Zod schemas to accept the new fields
- Update the SQLite repository (`create`, `update`, `rowToTrip`) and the `Trip` type in the trips client
- Display `startDate` / `endDate` on the Overview page when present, formatted as "Mon, Jun 3"
- Existing `nights` and `full_days` columns are retained; the new date fields are additive and nullable

## Capabilities

### New Capabilities

_(none — all changes extend existing trip-data and trip-plan capabilities)_

### Modified Capabilities

- `trip-data`: add `start_date`, `end_date`, and `info_markdown` columns; extend create/update inputs and repository to persist and return these fields
- `trip-plan`: display `startDate` / `endDate` on the Overview page when present (formatted dates)

## Impact

- **Backend**: `src/db.ts` (inline migration), `src/repositories/interfaces.ts` (input types), `src/repositories/sqlite/trip.repository.ts`, `src/routes/trips.ts` (Zod schemas)
- **Frontend**: `client-trips/src/types.ts` (Trip type), `client-trips/src/pages/OverviewPage.tsx` (date display)
- **No breaking changes**: new columns are nullable; existing trips return `null` for the new fields
