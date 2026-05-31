**App**: trips

## Requirements

### Requirement: Trip data model
The system SHALL store trips in a `trips` SQLite table with the following columns: `id` (integer primary key), `user_id` (FK to users), `name` (text, required), `destination` (text, nullable), `departure_notes` (text, nullable), `return_notes` (text, nullable), `nights` (integer, nullable), `full_days` (integer, nullable), `is_current` (integer, 0 or 1, default 0), `created_at` (ISO 8601 UTC), `start_date` (text YYYY-MM-DD, nullable), `end_date` (text YYYY-MM-DD, nullable), `info_markdown` (text, nullable). `TABLE_NAMES` in `src/db.ts` SHALL include `trips`.

#### Scenario: Migration runs on startup
- **WHEN** the server starts and the new columns do not yet exist on the `trips` table
- **THEN** the migration adds `start_date`, `end_date`, and `info_markdown` via `ALTER TABLE` and the app starts successfully

#### Scenario: Existing trips unaffected
- **WHEN** the migration runs on a database with existing trip rows
- **THEN** all existing rows have `NULL` for the three new columns and continue to be returned correctly

### Requirement: Create trip
`POST /api/trips` SHALL create a new trip for the authenticated user. `name` is required; `destination`, `departure_notes`, `return_notes`, `nights`, `full_days`, `start_date`, `end_date`, and `info_markdown` are optional. The new trip SHALL NOT be set as current.

#### Scenario: Create with name only
- **WHEN** a POST request is made with `{ "name": "Summer Vacation" }`
- **THEN** the trip is created with `is_current = 0` and the trip object is returned with null date and info fields

#### Scenario: Create with all fields
- **WHEN** a POST request includes name, destination, departure_notes, return_notes, nights, full_days, start_date, end_date, and info_markdown
- **THEN** all fields are persisted and returned in the response

#### Scenario: Invalid date format rejected
- **WHEN** a POST request includes `start_date: "June 3"` (not YYYY-MM-DD)
- **THEN** the API returns 400

#### Scenario: Missing name
- **WHEN** a POST request omits `name`
- **THEN** the API returns 400

### Requirement: List trips
`GET /api/trips` SHALL return all trips belonging to the authenticated user, ordered by `created_at` descending.

#### Scenario: Multiple trips
- **WHEN** the user has two trips and calls GET /api/trips
- **THEN** both trips are returned, newest first

#### Scenario: No trips
- **WHEN** the user has no trips
- **THEN** an empty array is returned

### Requirement: Get current trip
`GET /api/trips/current` SHALL return the trip where `is_current = 1` for the authenticated user.

#### Scenario: Current trip set
- **WHEN** one trip has `is_current = 1`
- **THEN** that trip is returned with all fields

#### Scenario: No current trip
- **WHEN** no trip has `is_current = 1`
- **THEN** the API returns 404

### Requirement: Set current trip
`PUT /api/trips/:id/set-current` SHALL mark the specified trip as current. All other trips for the user SHALL have `is_current` cleared. The operation SHALL be atomic (wrapped in a SQLite transaction).

#### Scenario: Switch current trip
- **WHEN** trip A is current and set-current is called on trip B
- **THEN** trip B has `is_current = 1` and trip A has `is_current = 0`

#### Scenario: Trip not found
- **WHEN** the trip ID does not belong to the authenticated user
- **THEN** the API returns 404

### Requirement: Update trip
`PUT /api/trips/:id` SHALL update any combination of `name`, `destination`, `departure_notes`, `return_notes`, `nights`, `full_days`, `start_date`, `end_date`, and `info_markdown`. Only fields present in the request body SHALL be updated.

#### Scenario: Partial update
- **WHEN** a PUT request includes only `departure_notes`
- **THEN** only `departure_notes` is updated; other fields including date fields are unchanged

#### Scenario: Set trip dates
- **WHEN** a PUT request includes `start_date: "2026-07-01"` and `end_date: "2026-07-10"`
- **THEN** both date fields are persisted and returned

#### Scenario: Clear a date field
- **WHEN** a PUT request includes `start_date: null`
- **THEN** `start_date` is set to NULL in the database

#### Scenario: Trip not found
- **WHEN** the trip ID does not belong to the authenticated user
- **THEN** the API returns 404

### Requirement: Delete trip
`DELETE /api/trips/:id` SHALL delete the specified trip. If the deleted trip was current, no trip becomes current (the current state is cleared).

#### Scenario: Delete non-current trip
- **WHEN** a non-current trip is deleted
- **THEN** the trip is removed and the current trip is unaffected

#### Scenario: Delete current trip
- **WHEN** the current trip is deleted
- **THEN** the trip is removed and `GET /api/trips/current` subsequently returns 404

### Requirement: Admin CLI for trips
`scripts/admin.ts` SHALL include `trips:list`, `trips:create`, `trips:set-current`, `trips:update`, and `trips:delete` commands. All commands that return data SHALL support a `--json` flag. `trips:create` and `trips:update` SHALL accept `--start-date`, `--end-date`, and `--info-markdown` flags.

#### Scenario: List trips as JSON
- **WHEN** `trips:list --json` is run
- **THEN** a JSON array of trips including `startDate`, `endDate`, and `infoMarkdown` is printed to stdout

#### Scenario: Set current via CLI
- **WHEN** `trips:set-current <id>` is run
- **THEN** the specified trip is marked as current

#### Scenario: Create via CLI
- **WHEN** `trips:create <name>` is run with optional flags for other fields
- **THEN** the trip is created and its details are printed

#### Scenario: Set dates via CLI
- **WHEN** `trips:update <id> --start-date 2026-07-01 --end-date 2026-07-10` is run
- **THEN** the trip's date fields are updated and the updated trip is printed
