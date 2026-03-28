## ADDED Requirements

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
