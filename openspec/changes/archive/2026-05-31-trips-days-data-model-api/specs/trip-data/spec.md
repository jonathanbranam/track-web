**App**: trips

## MODIFIED Requirements

### Requirement: Create trip
`POST /api/trips` SHALL create a new trip for the authenticated user. `name` is required; `destination`, `departure_notes`, `return_notes`, `nights`, `full_days`, `start_date`, `end_date`, and `info_markdown` are optional. The new trip SHALL NOT be set as current. When both `start_date` and `end_date` are provided, `generateDays` SHALL be called after the trip row is inserted.

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

#### Scenario: Day records generated when both dates provided
- **WHEN** a POST request includes both `start_date: "2026-07-01"` and `end_date: "2026-07-03"`
- **THEN** `trip_days` rows exist for `2026-07-01`, `2026-07-02`, and `2026-07-03` after the request completes

#### Scenario: No day records generated when dates omitted
- **WHEN** a POST request omits `start_date` and `end_date`
- **THEN** no `trip_days` rows are created for the new trip

### Requirement: Update trip
`PUT /api/trips/:id` SHALL update any combination of `name`, `destination`, `departure_notes`, `return_notes`, `nights`, `full_days`, `start_date`, `end_date`, and `info_markdown`. Only fields present in the request body SHALL be updated. When the update results in both `start_date` and `end_date` being non-null on the trip, `generateDays` SHALL be called after the row is updated. Requires `role = 'owner'` (enforced by membership authorization).

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

#### Scenario: Day records generated when date range becomes complete
- **WHEN** a PUT request sets `end_date: "2026-07-05"` on a trip that already has `start_date: "2026-07-01"` (both are now non-null)
- **THEN** `trip_days` rows are generated for `2026-07-01` through `2026-07-05` (INSERT OR IGNORE; existing rows are untouched)

#### Scenario: Existing day records preserved when dates are extended
- **WHEN** a day record for `2026-07-03` has an authored body and a PUT request extends `end_date` to `2026-07-10`
- **THEN** the existing `2026-07-03` row is unchanged and new rows are added for `2026-07-04` through `2026-07-10`

#### Scenario: No generateDays call when only one date is set
- **WHEN** a PUT request sets `start_date: "2026-07-01"` on a trip with no `end_date`
- **THEN** no `trip_days` rows are created (one date is still null)
