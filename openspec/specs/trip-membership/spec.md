**App**: trips

## Requirements

### Requirement: Trip members table
The system SHALL store trip membership in a `trip_members` SQLite table with columns: `id` (integer primary key), `trip_id` (integer, FK to trips ON DELETE CASCADE), `user_id` (integer, FK to users), `role` (text, `owner` | `member`, default `owner`), `joined_at` (ISO 8601 UTC). A unique constraint SHALL be enforced on `(trip_id, user_id)`. `TABLE_NAMES` in `src/db.ts` SHALL include `trip_members`.

#### Scenario: Table created on startup
- **WHEN** the server starts and `trip_members` does not exist
- **THEN** the migration creates the table with the schema above and the app starts successfully

#### Scenario: Duplicate membership rejected
- **WHEN** a user is already a member of a trip and a second INSERT is attempted for the same `(trip_id, user_id)` pair
- **THEN** the database rejects it with a UNIQUE constraint violation

#### Scenario: Member rows cascade on trip delete
- **WHEN** a trip is deleted
- **THEN** all `trip_members` rows for that trip are also deleted

### Requirement: Owner backfill migration
On first startup after the migration, all existing trips in the `trips` table SHALL have an `owner` row inserted into `trip_members` (using `trips.user_id` and `trips.created_at`). The table creation and backfill SHALL run atomically in a single SQLite transaction.

#### Scenario: Existing trips remain accessible
- **WHEN** the migration runs on a database with existing trip rows
- **THEN** each existing trip has exactly one `trip_members` row with `role = 'owner'` and `user_id` matching `trips.user_id`

#### Scenario: Migration is idempotent
- **WHEN** the server restarts after the migration has already run
- **THEN** no error occurs and no duplicate rows are inserted (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`)

### Requirement: Auto-owner-insert on trip create
When a new trip is created via `POST /api/trips`, the creating user SHALL be automatically inserted into `trip_members` with `role = 'owner'`. This SHALL occur in the same repository operation as the trip insert (within a transaction).

#### Scenario: New trip creator becomes owner
- **WHEN** user A creates a trip via POST /api/trips
- **THEN** a `trip_members` row exists for that trip with `user_id = A`, `role = 'owner'`, and `joined_at` set to the creation time

### Requirement: Membership-based authorization
All routes under `/api/trips/:id` SHALL verify that the authenticated user is a member of the specified trip before returning data or performing mutations. Non-members SHALL receive 403. Routes that mutate trip state (`PUT /api/trips/:id`, `DELETE /api/trips/:id`, `PUT /api/trips/:id/set-current`) SHALL additionally require `role = 'owner'`; non-owners SHALL receive 403.

#### Scenario: Non-member denied read
- **WHEN** a user who has no row in `trip_members` for a trip requests `GET /api/trips/:id`
- **THEN** the API returns 403

#### Scenario: Member can read
- **WHEN** a user with `role = 'member'` requests `GET /api/trips/:id`
- **THEN** the trip is returned with 200

#### Scenario: Member cannot mutate
- **WHEN** a user with `role = 'member'` requests `PUT /api/trips/:id`
- **THEN** the API returns 403

#### Scenario: Owner can mutate
- **WHEN** a user with `role = 'owner'` requests `PUT /api/trips/:id`
- **THEN** the update is applied and the updated trip is returned with 200

### Requirement: List members
`GET /api/trips/:id/members` SHALL return all members of the specified trip. The authenticated user must be a member. Response: `{ members: Array<{ userId, role, joinedAt }> }`.

#### Scenario: Members returned for owner
- **WHEN** the owner calls GET /api/trips/:id/members
- **THEN** all members including the owner are returned with their role and joinedAt

#### Scenario: Members returned for member
- **WHEN** a non-owner member calls GET /api/trips/:id/members
- **THEN** all members are returned (read access for all members)

#### Scenario: Non-member denied
- **WHEN** a user with no membership calls GET /api/trips/:id/members
- **THEN** the API returns 403

### Requirement: Add member
`POST /api/trips/:id/members` SHALL add a user to the trip with `role = 'member'`. Body: `{ userId: number }`. Requires `role = 'owner'`. The `userId` must refer to an existing user.

#### Scenario: Owner adds member
- **WHEN** the owner POSTs `{ userId: 2 }` to /api/trips/:id/members
- **THEN** user 2 is added with `role = 'member'` and the new member row is returned with 201

#### Scenario: Non-owner cannot add member
- **WHEN** a user with `role = 'member'` attempts POST /api/trips/:id/members
- **THEN** the API returns 403

#### Scenario: Duplicate member rejected
- **WHEN** the owner attempts to add a user who is already a member
- **THEN** the API returns 409

#### Scenario: Unknown user rejected
- **WHEN** the owner POSTs a `userId` that does not exist in the users table
- **THEN** the API returns 404

### Requirement: Remove member
`DELETE /api/trips/:id/members/:userId` SHALL remove the specified user from `trip_members`. Requires `role = 'owner'`. The owner SHALL NOT be able to remove themselves.

#### Scenario: Owner removes a member
- **WHEN** the owner calls DELETE /api/trips/:id/members/2 and user 2 is a member
- **THEN** user 2 is removed from trip_members and the API returns 204

#### Scenario: Non-owner cannot remove member
- **WHEN** a user with `role = 'member'` calls DELETE /api/trips/:id/members/:userId
- **THEN** the API returns 403

#### Scenario: Owner cannot remove themselves
- **WHEN** the owner calls DELETE /api/trips/:id/members/:ownerId where ownerId is their own userId
- **THEN** the API returns 400

#### Scenario: Member not found
- **WHEN** the owner attempts to remove a userId not in trip_members for this trip
- **THEN** the API returns 404

### Requirement: Admin CLI for member management
`scripts/admin.ts` SHALL include `trips:members:list <tripId>`, `trips:members:add <tripId> <userId>`, and `trips:members:remove <tripId> <userId>` commands. `trips:members:list` SHALL support a `--json` flag for script-friendly output.

#### Scenario: List members as JSON
- **WHEN** `trips:members:list <id> --json` is run
- **THEN** a JSON array of member objects with `userId`, `role`, and `joinedAt` is printed to stdout

#### Scenario: Add member via CLI
- **WHEN** `trips:members:add <tripId> <userId>` is run
- **THEN** the user is added as a member and a confirmation message is printed

#### Scenario: Remove member via CLI
- **WHEN** `trips:members:remove <tripId> <userId>` is run
- **THEN** the user is removed and a confirmation message is printed
