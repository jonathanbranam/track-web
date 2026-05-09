**App**: all

This spec documents the behavioral contract that MUST be preserved through the Commander.js refactor. All requirements below reflect existing behavior; none are new.

## ADDED Requirements

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
