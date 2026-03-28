## Purpose

Defines the core time entry lifecycle: starting, stopping, and retrieving the running entry via a repository-abstracted API that enforces ordering and uniqueness constraints.

## Requirements

### Requirement: Start a new time entry
The system SHALL allow the user to start a new time entry with a description and a start time. When a new entry is started, it becomes the running entry (ended_at IS NULL). Only one running entry may exist at a time.

#### Scenario: Start first entry of the day
- **WHEN** no entries exist for the current day and the user submits a new entry
- **THEN** the entry is created with started_at set to the user-provided time (defaulting to now) and ended_at NULL

#### Scenario: Start entry after stopping previous
- **WHEN** the most recent entry has been stopped and the user submits a new entry
- **THEN** the entry is created with started_at equal to the ended_at of the previous entry (unless the user overrides it)

#### Scenario: Reject start before previous end
- **WHEN** the user attempts to start an entry with a started_at before the ended_at of the most recent entry
- **THEN** the API returns a 422 error and the entry is not created

#### Scenario: Reject duplicate running entry
- **WHEN** a running entry already exists (ended_at IS NULL) and the user attempts to start another
- **THEN** the API returns a 409 error

### Requirement: Stop the running time entry
The system SHALL allow the user to stop the currently running entry by setting its ended_at to a provided time.

#### Scenario: Stop with current time
- **WHEN** the user stops the running entry without specifying an end time
- **THEN** ended_at is set to the current server time (UTC)

#### Scenario: Stop with adjusted time
- **WHEN** the user stops the running entry with a specific ended_at time
- **THEN** ended_at is set to that time, provided it is not before started_at

#### Scenario: Stop with invalid end time
- **WHEN** the user provides an ended_at that is before the entry's started_at
- **THEN** the API returns a 422 error and the entry is not updated

#### Scenario: Stop when no running entry
- **WHEN** there is no running entry and the user attempts to stop
- **THEN** the API returns a 404 error

### Requirement: Retrieve the running entry
The system SHALL expose an endpoint to retrieve the currently running time entry.

#### Scenario: Running entry exists
- **WHEN** a GET request is made to /api/entries/running
- **THEN** the response contains the running entry with id, description, tags, started_at, and null ended_at

#### Scenario: No running entry
- **WHEN** a GET request is made to /api/entries/running and no entry has ended_at IS NULL
- **THEN** the response returns a 200 with a null body or an empty result

### Requirement: Persist entries with repository abstraction
The system SHALL store time entries via an IEntryRepository interface. The concrete implementation SHALL use better-sqlite3 for MVP but MUST be swappable without modifying route handlers.

#### Scenario: Repository interface is the only dependency for routes
- **WHEN** an entry route handler needs to read or write entries
- **THEN** it uses only IEntryRepository methods, not direct SQLite calls

#### Scenario: SQLite implementation fulfills interface
- **WHEN** the application starts with the SQLite implementation injected
- **THEN** all CRUD operations on entries succeed without interface changes
