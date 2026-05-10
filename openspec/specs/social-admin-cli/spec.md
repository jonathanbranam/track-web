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

### Requirement: Subcommand names are preserved exactly
The admin CLI SHALL expose the following subcommands with their exact existing names: `users:list`, `users:create`, `users:delete`, `users:update-password`, `users:set-name`, `connections:create`, `connections:delete`, `connections:list`, `codes:create`, `groups:create`, `groups:list`, `groups:list-members`, `groups:add-member`, `groups:remove-member`, `groups:delete`, `movies:create`, `movies:list`, `tv:create`, `tv:list`.

#### Scenario: Existing subcommand name unchanged
- **WHEN** a user runs `npm run admin -- users:list`
- **THEN** the command executes without error and lists all users

#### Scenario: Unknown subcommand exits with error
- **WHEN** a user runs `npm run admin -- unknown:command`
- **THEN** the CLI prints an error and exits with a non-zero code

### Requirement: Flag names and types are preserved
Each subcommand SHALL accept the same named flags as before the refactor, with the same types (string vs integer).

#### Scenario: movies:create flags accepted
- **WHEN** a user runs `npm run admin -- movies:create --title "Dune" --runtime 156 --streaming "Max" --tags sci-fi,drama --creator 1`
- **THEN** a movie record is created with all provided field values

#### Scenario: Missing required flag exits with error
- **WHEN** a user runs `npm run admin -- movies:create` without `--title`
- **THEN** the CLI prints an error message and exits with a non-zero code

### Requirement: JSON output flag available globally
All subcommands that return tabular data SHALL support a `--json` flag that causes output to be printed as a JSON array instead of a formatted table.

#### Scenario: --json flag on users:list
- **WHEN** a user runs `npm run admin -- users:list --json`
- **THEN** output is a valid JSON array of user objects

#### Scenario: --json flag on groups:list
- **WHEN** a user runs `npm run admin -- groups:list --json`
- **THEN** output is a valid JSON array of group objects

### Requirement: Help text available without manual maintenance
The CLI SHALL generate help text automatically for the top-level program and each subcommand without requiring manual string maintenance.

#### Scenario: Top-level help
- **WHEN** a user runs `npm run admin -- --help`
- **THEN** a list of all available subcommands is printed

#### Scenario: Subcommand help
- **WHEN** a user runs `npm run admin -- users:create --help`
- **THEN** usage and flag descriptions for that subcommand are printed
