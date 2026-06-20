**App**: admin

## Purpose

Database backup and restore from the admin app, fully compatible with the existing `exports/` mechanism: run the scheduled backup, restore the last scheduled backup, run a timestamped backup, list the 10 most recent, and restore a selected one (confirmed).

## Requirements

### Requirement: Run a scheduled backup now
The system SHALL provide a user-1-only endpoint that runs the scheduled backup on demand, performing the same routine as the cron job (`scripts/export-push.sh`): it writes the rolling backup to `exports/backup/` and, treating `exports/` as a standalone git repository, commits and pushes `backup/` only when the data changed. The admin app SHALL surface this as a "Run scheduled backup" control that reports the outcome.

#### Scenario: Scheduled backup runs and pushes when data changed
- **WHEN** user 1 activates "Run scheduled backup" and the database differs from the last backup
- **THEN** the rolling backup is written to `exports/backup/` and committed and pushed to the `exports/` git repository

#### Scenario: Scheduled backup skips push when nothing changed
- **WHEN** user 1 activates "Run scheduled backup" and the data is unchanged since the last backup
- **THEN** the backup is written but no commit or push is made, and the app reports that there were no changes

### Requirement: Restore from the last scheduled backup
The system SHALL provide a user-1-only endpoint that restores the database from the rolling scheduled backup folder (`exports/backup/`), reusing the existing import routine including its migration-compatibility check. The restore SHALL proceed only when the request explicitly confirms the action.

#### Scenario: Confirmed restore from the scheduled backup
- **WHEN** user 1 chooses to restore from the last scheduled backup and confirms
- **THEN** the migration-compatibility check passes and the database is restored from `exports/backup/`

#### Scenario: Restore without confirmation is rejected
- **WHEN** a restore-from-scheduled-backup request is made without explicit confirmation
- **THEN** no data is changed and the request is rejected

#### Scenario: No scheduled backup present
- **WHEN** a restore is requested but `exports/backup/` does not exist
- **THEN** the request is rejected and no data is changed

### Requirement: Run a timestamped backup now
The system SHALL provide a user-1-only endpoint that creates a new timestamped backup, reusing the existing export routine (`scripts/export-db.ts`) to write a folder `exports/export-<UTC-stamp>/`, and returns the new folder's name. The admin app SHALL display the created folder name on success.

#### Scenario: Timestamped backup creates a folder and returns its name
- **WHEN** user 1 activates "Run timestamped backup"
- **THEN** a new `exports/export-<UTC-stamp>/` folder is written with the full table export and the response includes its name

#### Scenario: Created folder name shown to the user
- **WHEN** the timestamped backup succeeds
- **THEN** the admin app displays the name of the created folder

### Requirement: List recent timestamped backups
The system SHALL provide a user-1-only endpoint that lists existing timestamped backup folders, returning the **10 most recent** by timestamp, most recent first. The admin app SHALL present this list for selection.

#### Scenario: Ten most recent shown
- **WHEN** user 1 opens the timestamped restore view and more than ten timestamped backups exist
- **THEN** the ten most recent backup folders are listed, most recent first

#### Scenario: Fewer than ten backups
- **WHEN** fewer than ten timestamped backups exist
- **THEN** all of them are listed, most recent first

### Requirement: Restore from a selected timestamped backup
The system SHALL provide a user-1-only endpoint that restores the database from a selected timestamped backup folder, reusing the existing import routine and migration-compatibility check. The selected folder name SHALL be validated against the existing timestamped backups (rejecting unknown or path-like names), and the restore SHALL proceed only when the request explicitly confirms the action.

#### Scenario: Confirmed restore from a selected timestamp
- **WHEN** user 1 selects an existing timestamped backup and confirms the restore
- **THEN** the migration-compatibility check passes and the database is restored from that folder

#### Scenario: Unknown timestamp name rejected
- **WHEN** a restore is requested for a folder name that is not among the existing timestamped backups
- **THEN** the request is rejected and no data is changed

#### Scenario: Restore without confirmation is rejected
- **WHEN** a timestamped restore request is made without explicit confirmation
- **THEN** no data is changed and the request is rejected
