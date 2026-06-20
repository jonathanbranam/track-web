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
The admin CLI SHALL expose the following subcommands with their exact existing names: `users:list`, `users:create`, `users:delete`, `users:update-password`, `users:set-name`, `connections:create`, `connections:delete`, `connections:list`, `codes:create`, `groups:create`, `groups:list`, `groups:list-members`, `groups:add-member`, `groups:remove-member`, `groups:delete`, `movies:create`, `movies:list`, `tv:create`, `tv:list`, `scores:list`, `scores:clear`.

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

### Requirement: Admin CLI scores:list command
The system SHALL provide a `scores:list` subcommand that queries the `game_scores` table and prints results as a table or JSON. All filter flags SHALL be optional.

#### Scenario: List all scores
- **WHEN** the admin runs `npm run admin -- scores:list`
- **THEN** all rows from `game_scores` are printed with `id`, `email`, `game_slug`, `mode`, `level`, `score`, and `achieved_at`

#### Scenario: Filter by game
- **WHEN** the admin runs `npm run admin -- scores:list --game <slug>`
- **THEN** only scores for that game slug are printed

#### Scenario: Filter by mode
- **WHEN** the admin runs `npm run admin -- scores:list --mode <mode>`
- **THEN** only scores matching that mode are printed

#### Scenario: Filter by level
- **WHEN** the admin runs `npm run admin -- scores:list --level <level>`
- **THEN** only scores matching that level are printed

#### Scenario: JSON output
- **WHEN** the admin runs `npm run admin -- scores:list --json`
- **THEN** output is a valid JSON array of score objects

### Requirement: Admin CLI scores:clear command
The system SHALL provide a `scores:clear` subcommand that deletes scores for a game. `--game` SHALL be required. For the mode dimension, exactly one of `--mode <mode>` or `--all-modes` SHALL be provided. For the level dimension, exactly one of `--level <level>` or `--all-levels` SHALL be provided. The `--confirm` flag SHALL be required to execute the delete; without it the command SHALL print a dry-run warning describing the full scope and exit non-zero.

#### Scenario: Clear scores for a specific mode and level
- **WHEN** the admin runs `npm run admin -- scores:clear --game <slug> --mode <mode> --level <level> --confirm`
- **THEN** all scores matching that exact game/mode/level combination are deleted and a count is printed

#### Scenario: Clear all levels for a specific mode
- **WHEN** the admin runs `npm run admin -- scores:clear --game <slug> --mode <mode> --all-levels --confirm`
- **THEN** all scores for that game and mode, regardless of level, are deleted and a count is printed

#### Scenario: Clear all modes for a specific level
- **WHEN** the admin runs `npm run admin -- scores:clear --game <slug> --all-modes --level <level> --confirm`
- **THEN** all scores for that game and level, regardless of mode, are deleted and a count is printed

#### Scenario: Clear all modes and all levels
- **WHEN** the admin runs `npm run admin -- scores:clear --game <slug> --all-modes --all-levels --confirm`
- **THEN** all scores for that game are deleted and a count is printed

#### Scenario: Dry run shows scoped warning
- **WHEN** the admin runs `scores:clear` without `--confirm`
- **THEN** a warning is printed that includes the game slug and says "all modes" or "all levels" as appropriate for the flags used, and the process exits non-zero without deleting anything

#### Scenario: Missing mode dimension flag exits with error
- **WHEN** the admin runs `scores:clear` without providing either `--mode` or `--all-modes`
- **THEN** an error is printed explaining that one of the two is required and the process exits non-zero

#### Scenario: Conflicting mode flags exit with error
- **WHEN** the admin runs `scores:clear` with both `--mode` and `--all-modes`
- **THEN** an error is printed explaining they are mutually exclusive and the process exits non-zero

#### Scenario: Missing level dimension flag exits with error
- **WHEN** the admin runs `scores:clear` without providing either `--level` or `--all-levels`
- **THEN** an error is printed explaining that one of the two is required and the process exits non-zero

#### Scenario: Conflicting level flags exit with error
- **WHEN** the admin runs `scores:clear` with both `--level` and `--all-levels`
- **THEN** an error is printed explaining they are mutually exclusive and the process exits non-zero
