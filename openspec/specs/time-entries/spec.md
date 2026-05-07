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

### Requirement: Delete a time entry
The system SHALL allow the user to delete any time entry (running or completed) via `DELETE /api/entries/:id`. The repository interface SHALL expose a `delete(id: number): boolean` method. The method returns false if the entry is not found.

#### Scenario: Delete running entry
- **WHEN** the user confirms deletion of the currently running entry
- **THEN** the entry is removed, the API returns 204, and the UI resets to the empty/no-running-task state using the previously-ended entry's time as context

#### Scenario: Delete non-existent entry
- **WHEN** `DELETE /api/entries/:id` is called with an id that does not exist or is not owned by the current user
- **THEN** the API returns 404

#### Scenario: Successful delete returns 204
- **WHEN** `DELETE /api/entries/:id` is called with a valid owned entry id
- **THEN** the entry is removed from the database and the API returns 204 No Content

### Requirement: Update a time entry
The system SHALL allow the user to update an existing entry's description, startedAt, and/or endedAt via `PATCH /api/entries/:id`. When description is provided the server SHALL re-derive and overwrite the tags column using the same tag-parsing logic as entry creation. The endpoint SHALL enforce ordering constraints against adjacent entries.

#### Scenario: Update description re-derives tags
- **WHEN** PATCH /api/entries/:id is called with a new description containing tag tokens
- **THEN** the tags column is overwritten with the re-derived tags and the updated entry is returned

#### Scenario: Update startedAt enforces lower bound
- **WHEN** PATCH is called with a startedAt earlier than the previous entry's endedAt
- **THEN** the API returns 422 with an error identifying the constraint and the previous entry's endedAt

#### Scenario: Update endedAt enforces upper bound
- **WHEN** PATCH is called with an endedAt later than the next entry's startedAt
- **THEN** the API returns 422 with an error identifying the constraint and the next entry's startedAt

#### Scenario: Update endedAt enforces start-before-end
- **WHEN** PATCH is called with an endedAt that is before or equal to the entry's startedAt (after applying any startedAt update in the same request)
- **THEN** the API returns 422

#### Scenario: Partial update preserves unmentioned fields
- **WHEN** PATCH is called with only description (no startedAt or endedAt)
- **THEN** only description and tags are updated; startedAt and endedAt are unchanged

#### Scenario: Entry not found returns 404
- **WHEN** PATCH /api/entries/:id is called with an id that does not exist or belongs to another user
- **THEN** the API returns 404

### Requirement: Adjacent entry neighbor lookup
The system SHALL expose `getPreviousEntry(userId, entryId)` and `getNextEntry(userId, entryId)` methods on `IEntryRepository`. These return the nearest completed entry before or after the given entry (by startedAt), excluding the entry itself, or null if none exists.

#### Scenario: Returns the adjacent entry when one exists
- **WHEN** `getPreviousEntry` or `getNextEntry` is called for an entry that has a neighbor
- **THEN** the nearest entry strictly before (for previous) or after (for next) the subject entry's startedAt is returned

#### Scenario: Returns null at dataset boundary
- **WHEN** `getPreviousEntry` is called for the earliest entry, or `getNextEntry` for the most recent entry
- **THEN** null is returned
