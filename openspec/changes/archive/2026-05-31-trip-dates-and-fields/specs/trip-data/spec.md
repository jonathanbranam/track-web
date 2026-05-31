**App**: trips

## MODIFIED Requirements

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
