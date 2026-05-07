## Purpose

Covers the `scripts/admin.ts` CLI tool for administrative management of users, connections, and groups without requiring HTTP session authentication.

## Requirements

### Requirement: Admin CLI for user, connection, and group management
The system SHALL provide a `scripts/admin.ts` CLI tool, registered as `npm run admin`, that requires no HTTP session or authentication. It SHALL use `better-sqlite3` directly. It SHALL support the following subcommands for full administrative control over users, connections, and groups.

#### Scenario: Create a user
- **WHEN** the admin runs `npm run admin -- users:create <email> <password> [--name "<display name>"]`
- **THEN** a new record is inserted into `users` with the bcrypt-hashed password; duplicate email exits with an error and inserts nothing

#### Scenario: Update a user's password
- **WHEN** the admin runs `npm run admin -- users:update-password <email> <password>`
- **THEN** the bcrypt hash for that user is updated in `users`; unknown email exits with an error

#### Scenario: List all users
- **WHEN** the admin runs `npm run admin -- users:list`
- **THEN** a table of all users is printed: `id`, `email`, `display_name`, `created_at`

#### Scenario: Set a user's display name
- **WHEN** the admin runs `npm run admin -- users:set-name <userId> "<name>"`
- **THEN** `users.display_name` is updated for that user and a confirmation is printed

#### Scenario: Force-create a connection
- **WHEN** the admin runs `npm run admin -- connections:create <userIdA> <userIdB>`
- **THEN** a `user_connections` row is inserted for the normalized `(min, max)` pair, bypassing invite and request flows; if a connection already exists a message is printed and no row is inserted

#### Scenario: Delete a connection
- **WHEN** the admin runs `npm run admin -- connections:delete <userIdA> <userIdB>`
- **THEN** the `user_connections` row for that pair is deleted; if none exists a message is printed

#### Scenario: List connections for a user
- **WHEN** the admin runs `npm run admin -- connections:list <userId>`
- **THEN** all users connected to `userId` are printed with `id`, `email`, `display_name`, and `connected_at`

#### Scenario: Create an invite code on behalf of a user
- **WHEN** the admin runs `npm run admin -- codes:create <userId>`
- **THEN** a new invite code is inserted with `created_by_user_id = userId` and `expires_at = now + 7 days`; the code token is printed

#### Scenario: Create a group
- **WHEN** the admin runs `npm run admin -- groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3]`
- **THEN** a `groups` row is inserted and the listed user IDs are inserted into `group_members`; connection checks are skipped for admin-created groups

#### Scenario: List all groups
- **WHEN** the admin runs `npm run admin -- groups:list`
- **THEN** all groups are printed with `id`, `name`, `description`, `created_by_user_id`, and member count

#### Scenario: Add a member to a group
- **WHEN** the admin runs `npm run admin -- groups:add-member <groupId> <userId>`
- **THEN** a `group_members` row is inserted; connection check is skipped; if the user is already a member a message is printed

#### Scenario: Remove a member from a group
- **WHEN** the admin runs `npm run admin -- groups:remove-member <groupId> <userId>`
- **THEN** the `group_members` row is deleted; if not a member a message is printed

#### Scenario: Delete a group
- **WHEN** the admin runs `npm run admin -- groups:delete <groupId>`
- **THEN** the `groups` row and all associated `group_members` rows are deleted

#### Scenario: Unknown subcommand prints usage
- **WHEN** the admin runs `npm run admin` with an unrecognized subcommand or no arguments
- **THEN** a usage summary listing all available subcommands is printed and the process exits with a non-zero code
