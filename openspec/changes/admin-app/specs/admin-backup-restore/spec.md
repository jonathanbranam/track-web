**App**: admin

## ADDED Requirements

### Requirement: Create a backup
The system SHALL provide `POST /api/admin/backups`, restricted to user 1, that creates a database backup by writing a new timestamped folder under `backup/` containing every table's data and a summary (including the latest migration id), and returns the new folder's name. The admin app SHALL surface this as a backup control that displays the created folder name on success.

#### Scenario: Backup creates a folder and returns its name
- **WHEN** user 1 activates the backup control
- **THEN** a new timestamped folder is created under `backup/`, it contains the exported table data and summary, and the response includes the new folder's name

#### Scenario: Created folder name shown to the user
- **WHEN** the backup request succeeds
- **THEN** the admin app displays the name of the created backup folder

### Requirement: List backups
The system SHALL provide `GET /api/admin/backups`, restricted to user 1, returning the existing backups under `backup/` (each with at least its folder name). The admin app SHALL display this list.

#### Scenario: Existing backups listed
- **WHEN** user 1 opens the restore view
- **THEN** the list shows each existing backup folder

#### Scenario: No backups yet
- **WHEN** no backups exist under `backup/`
- **THEN** the list is empty and the view indicates there are no backups

### Requirement: Restore from a backup with confirmation
The system SHALL provide `POST /api/admin/backups/:name/restore`, restricted to user 1, that restores the database from the named backup. The restore SHALL proceed only when the request explicitly confirms the action, SHALL validate `:name` against the set of existing backups (rejecting unknown or path-like names), and SHALL run the existing migration-compatibility check before applying data. Before overwriting current data, the system SHALL first create a safety backup.

#### Scenario: Confirmed restore replaces data
- **WHEN** user 1 selects an existing backup and confirms the restore
- **THEN** a safety backup of current data is created, the migration-compatibility check passes, and the database is restored from the selected backup

#### Scenario: Restore without confirmation is rejected
- **WHEN** a restore request is made without the explicit confirmation
- **THEN** no data is changed and the request is rejected

#### Scenario: Unknown backup name rejected
- **WHEN** a restore is requested for a `:name` that is not an existing backup folder
- **THEN** the backend rejects the request and no data is changed
