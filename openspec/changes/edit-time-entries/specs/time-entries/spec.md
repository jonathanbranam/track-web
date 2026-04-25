## ADDED Requirements

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

#### Scenario: getPreviousEntry returns the immediately preceding entry
- **WHEN** getPreviousEntry is called for an entry that has a completed entry before it
- **THEN** the entry with the largest startedAt strictly less than the subject entry's startedAt is returned

#### Scenario: getPreviousEntry returns null for the first entry
- **WHEN** getPreviousEntry is called for the earliest entry in the dataset
- **THEN** null is returned

#### Scenario: getNextEntry returns the immediately following entry
- **WHEN** getNextEntry is called for an entry that has a subsequent entry
- **THEN** the entry with the smallest startedAt strictly greater than the subject entry's startedAt is returned

#### Scenario: getNextEntry returns null for the last entry
- **WHEN** getNextEntry is called for the most recent entry (running or completed)
- **THEN** null is returned
