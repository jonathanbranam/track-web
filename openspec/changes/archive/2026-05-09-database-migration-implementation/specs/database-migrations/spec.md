**App**: all

## ADDED Requirements

### Requirement: Migrations run exactly once on startup
The system SHALL maintain a `schema_migrations` table that records the ID of every migration that has been applied. On each server start, `runMigrations()` SHALL apply only migrations not yet recorded in `schema_migrations`, then insert their IDs. A migration whose ID is already present SHALL be skipped entirely.

#### Scenario: Fresh database receives all migrations
- **WHEN** the server starts against a database with no `schema_migrations` table
- **THEN** all migrations in `MIGRATIONS` are applied in order and their IDs are recorded in `schema_migrations`

#### Scenario: Existing database skips applied migrations
- **WHEN** the server starts against a database that already has entries in `schema_migrations`
- **THEN** only migrations whose IDs are absent from `schema_migrations` are applied; already-recorded migrations are not re-executed

#### Scenario: No pending migrations is a no-op
- **WHEN** the server starts and all migration IDs in `MIGRATIONS` are present in `schema_migrations`
- **THEN** no DDL is executed and startup completes without error

### Requirement: Exports include migration state
The export script SHALL record the latest applied migration ID in `summary.json` as `latestMigration`. On a database that predates migration tracking, `latestMigration` SHALL be `null`.

#### Scenario: Export records current migration
- **WHEN** `npm run db:export` runs against a database with applied migrations
- **THEN** `summary.json` contains a `latestMigration` field with the ID of the most recently applied migration

#### Scenario: Pre-tracking database exports null
- **WHEN** `npm run db:export` runs against a database without a `schema_migrations` table
- **THEN** `summary.json` contains `"latestMigration": null`

### Requirement: Import validates migration compatibility
The import script SHALL compare the export's `latestMigration` against the current database's latest migration before restoring data. When the values differ, the script SHALL print a descriptive error and exit non-zero. Passing `--force` SHALL override the check and proceed with a warning.

#### Scenario: Matching migrations allow import
- **WHEN** `npm run db:import` is run with an export whose `latestMigration` matches the current database's latest migration
- **THEN** the import proceeds without any migration-related error or warning

#### Scenario: Mismatch blocks import
- **WHEN** `npm run db:import` is run and the export's `latestMigration` differs from the current database's
- **THEN** the script prints which side is ahead (and by how many migrations), does not modify the database, and exits with a non-zero code

#### Scenario: --force overrides mismatch
- **WHEN** `npm run db:import -- --force` is run with a migration-mismatched export
- **THEN** the script prints a warning about the mismatch and completes the import

#### Scenario: Pre-tracking export requires --force
- **WHEN** `npm run db:import` is run with an export that has no `latestMigration` field
- **THEN** the script treats it as a mismatch and requires `--force` to proceed
