**App**: all

## ADDED Requirements

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

### Requirement: Admin CLI scores:clear command with all-modes and all-levels flags
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
