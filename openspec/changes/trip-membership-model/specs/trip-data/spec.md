**App**: trips

## MODIFIED Requirements

### Requirement: List trips
`GET /api/trips` SHALL return all trips where the authenticated user is a member (has a row in `trip_members`), ordered by `created_at` descending.

#### Scenario: Multiple trips
- **WHEN** the user is a member of two trips and calls GET /api/trips
- **THEN** both trips are returned, newest first

#### Scenario: No trips
- **WHEN** the user has no trip_members rows
- **THEN** an empty array is returned

#### Scenario: Non-member trips excluded
- **WHEN** trips exist in the database but the user is not a member of any of them
- **THEN** GET /api/trips returns an empty array

### Requirement: Get current trip
`GET /api/trips/current` SHALL return the trip where `is_current = 1` and the authenticated user is a member (has a row in `trip_members`).

#### Scenario: Current trip set
- **WHEN** one trip has `is_current = 1` and the user is a member
- **THEN** that trip is returned with all fields

#### Scenario: No current trip
- **WHEN** no trip with `is_current = 1` exists for which the user is a member
- **THEN** the API returns 404

### Requirement: Set current trip
`PUT /api/trips/:id/set-current` SHALL mark the specified trip as current. All other trips where the user is a member SHALL have `is_current` cleared. The operation SHALL be atomic (wrapped in a SQLite transaction). Requires `role = 'owner'` (enforced by membership authorization).

#### Scenario: Switch current trip
- **WHEN** trip A is current and set-current is called on trip B (both trips the user owns)
- **THEN** trip B has `is_current = 1` and trip A has `is_current = 0`

#### Scenario: Trip does not exist
- **WHEN** the trip ID does not exist in the database
- **THEN** the API returns 404

### Requirement: Update trip
`PUT /api/trips/:id` SHALL update any combination of `name`, `destination`, `departure_notes`, `return_notes`, `nights`, `full_days`, `start_date`, `end_date`, and `info_markdown`. Only fields present in the request body SHALL be updated. Requires `role = 'owner'` (enforced by membership authorization).

#### Scenario: Partial update
- **WHEN** a PUT request includes only `departure_notes`
- **THEN** only `departure_notes` is updated; other fields are unchanged

#### Scenario: Set trip dates
- **WHEN** a PUT request includes `start_date: "2026-07-01"` and `end_date: "2026-07-10"`
- **THEN** both date fields are persisted and returned

#### Scenario: Clear a date field
- **WHEN** a PUT request includes `start_date: null`
- **THEN** `start_date` is set to NULL in the database

#### Scenario: Trip does not exist
- **WHEN** the trip ID does not exist in the database
- **THEN** the API returns 404

### Requirement: Delete trip
`DELETE /api/trips/:id` SHALL delete the specified trip. If the deleted trip was current, no trip becomes current. Requires `role = 'owner'` (enforced by membership authorization).

#### Scenario: Delete non-current trip
- **WHEN** a non-current trip is deleted
- **THEN** the trip is removed and the current trip is unaffected

#### Scenario: Delete current trip
- **WHEN** the current trip is deleted
- **THEN** the trip is removed and `GET /api/trips/current` subsequently returns 404

#### Scenario: Trip does not exist
- **WHEN** the trip ID does not exist in the database
- **THEN** the API returns 404
