**App**: trips

## Requirements

### Requirement: Trip days data model
The system SHALL store day-level records in a `trip_days` SQLite table with the following columns: `id` (integer primary key), `trip_id` (integer, FK to `trips.id` ON DELETE CASCADE), `date` (text YYYY-MM-DD, not null), `title` (text, not null, default `''`), `body` (text, not null, default `''`), `weather` (text, nullable). A unique constraint SHALL exist on `(trip_id, date)`. `TABLE_NAMES` in `src/db.ts` SHALL include `trip_days`.

#### Scenario: Migration runs on startup
- **WHEN** the server starts and the `trip_days` table does not yet exist
- **THEN** the migration creates it and the app starts successfully

#### Scenario: Cascade delete on trip removal
- **WHEN** a trip is deleted
- **THEN** all `trip_days` rows for that trip are also deleted

### Requirement: Auto-generate day records
`generateDays(tripId, startDate, endDate)` SHALL insert one `trip_days` row per calendar date from `startDate` through `endDate` inclusive using `INSERT OR IGNORE`. It SHALL never delete existing rows. It SHALL be a no-op if either date is null.

#### Scenario: Generate for a 3-day trip
- **WHEN** `generateDays` is called with `startDate = "2026-07-01"` and `endDate = "2026-07-03"`
- **THEN** rows exist for `2026-07-01`, `2026-07-02`, and `2026-07-03` with empty title/body and null weather

#### Scenario: Idempotent on repeated call
- **WHEN** `generateDays` is called twice with the same arguments
- **THEN** no duplicate rows are created and no error is thrown

#### Scenario: Existing authored rows preserved on range overlap
- **WHEN** a row for `2026-07-02` already has a non-empty body and `generateDays` is called again covering that date
- **THEN** the existing row is unchanged (INSERT OR IGNORE leaves it intact)

#### Scenario: No rows generated when dates are null
- **WHEN** `generateDays` is called with a null `startDate` or null `endDate`
- **THEN** no rows are inserted and no error is thrown

### Requirement: List trip days
`GET /api/trips/:id/days` SHALL return `{ days: TripDay[] }` ordered by `date ASC` for all `trip_days` rows belonging to the specified trip. The authenticated user SHALL be a member of the trip to call this route.

#### Scenario: Trip with generated days
- **WHEN** a trip has 3 generated day records and the authenticated user is a member
- **THEN** all 3 records are returned ordered by date ascending

#### Scenario: Trip with no days
- **WHEN** a trip has no `trip_days` rows
- **THEN** `{ days: [] }` is returned

#### Scenario: Non-member rejected
- **WHEN** the authenticated user is not a member of the trip
- **THEN** the API returns 403

#### Scenario: Trip not found
- **WHEN** the trip ID does not exist
- **THEN** the API returns 404

### Requirement: Update trip day
`PUT /api/trips/:id/days/:date` SHALL accept a body of `{ title?, body?, weather? }` and update the matching `trip_days` row. Only fields present in the request body SHALL be updated. The `:date` parameter SHALL be in `YYYY-MM-DD` format. Requires `role = 'owner'`.

#### Scenario: Update title and body
- **WHEN** a PUT request is made with `{ "title": "Beach Day", "body": "## Morning\nSwimming." }` for an existing day
- **THEN** the day's `title` and `body` are updated and the full updated `TripDay` is returned

#### Scenario: Update weather only
- **WHEN** a PUT request is made with `{ "weather": "⛅ 84°F, partly cloudy" }` for an existing day
- **THEN** only `weather` is updated; `title` and `body` are unchanged

#### Scenario: Clear weather
- **WHEN** a PUT request is made with `{ "weather": null }` for an existing day
- **THEN** `weather` is set to NULL in the database

#### Scenario: Invalid date format rejected
- **WHEN** the `:date` parameter is not in `YYYY-MM-DD` format (e.g., `"July 1"`)
- **THEN** the API returns 400

#### Scenario: Day not found
- **WHEN** the specified `(trip_id, date)` combination does not exist in `trip_days`
- **THEN** the API returns 404

#### Scenario: Non-owner rejected
- **WHEN** the authenticated user is a member but not the owner
- **THEN** the API returns 403

### Requirement: Admin CLI for trip days
`scripts/admin.ts` SHALL include `trips:days:list <tripId>` and `trips:days:update <tripId> <date>` commands. Both commands SHALL support a `--json` flag. `trips:days:update` SHALL accept `--title`, `--body`, and `--weather` flags.

#### Scenario: List days as JSON
- **WHEN** `trips:days:list <id> --json` is run for a trip with generated days
- **THEN** a JSON array of `TripDay` objects is printed to stdout

#### Scenario: Update a day via CLI
- **WHEN** `trips:days:update <id> 2026-07-01 --title "Arrival Day" --weather "☀️ 90°F"` is run
- **THEN** the day record is updated and the updated record is printed
