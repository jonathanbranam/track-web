**App**: trips

## Requirements

### Requirement: Trip data model
The system SHALL store trips in a `trips` SQLite table with the following columns: `id` (integer primary key), `user_id` (FK to users), `name` (text, required), `destination` (text, nullable), `departure_notes` (text, nullable), `return_notes` (text, nullable), `nights` (integer, nullable), `full_days` (integer, nullable), `is_current` (integer, 0 or 1, default 0), `created_at` (ISO 8601 UTC). `TABLE_NAMES` in `src/db.ts` SHALL be updated to include `trips`.

#### Scenario: Migration runs on startup
- **WHEN** the server starts and the `trips` table does not exist
- **THEN** the migration creates the table and the app starts successfully

### Requirement: Create trip
`POST /api/trips` SHALL create a new trip for the authenticated user. `name` is required; `destination`, `departure_notes`, `return_notes`, `nights`, and `full_days` are optional. The new trip SHALL NOT be set as current.

#### Scenario: Create with name only
- **WHEN** a POST request is made with `{ "name": "Summer Vacation" }`
- **THEN** the trip is created with `is_current = 0` and the trip object is returned

#### Scenario: Create with all fields
- **WHEN** a POST request includes name, destination, departure_notes, return_notes, nights, and full_days
- **THEN** all fields are persisted and returned in the response

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
`PUT /api/trips/:id` SHALL update any combination of `name`, `destination`, `departure_notes`, `return_notes`, `nights`, and `full_days`. Only fields present in the request body SHALL be updated.

#### Scenario: Partial update
- **WHEN** a PUT request includes only `departure_notes`
- **THEN** only `departure_notes` is updated; other fields are unchanged

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
`scripts/admin.ts` SHALL include `trips:list`, `trips:create`, `trips:set-current`, `trips:update`, and `trips:delete` commands. All commands that return data SHALL support a `--json` flag.

#### Scenario: List trips as JSON
- **WHEN** `trips:list --json` is run
- **THEN** a JSON array of trips is printed to stdout

#### Scenario: Set current via CLI
- **WHEN** `trips:set-current <id>` is run
- **THEN** the specified trip is marked as current

#### Scenario: Create via CLI
- **WHEN** `trips:create <name>` is run with optional flags for other fields
- **THEN** the trip is created and its details are printed
