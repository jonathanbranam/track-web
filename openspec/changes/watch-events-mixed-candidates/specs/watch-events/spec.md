**App**: watch

## MODIFIED Requirements

### Requirement: Create a watch event
Any authenticated user SHALL be able to create a watch event with a title, scheduled date, and an initial invite list. No content type is specified at creation — events are type-agnostic and may receive candidates of any type. Invitees may be specified as individual connected users (`{ userId }`) or groups (`{ groupId }`).

#### Scenario: Create an event
- **WHEN** an authenticated user calls `POST /api/watch/events` with a title, a date, and an `invitees` list
- **THEN** a `watch_events` row is created and `watch_event_invites` rows are inserted for each resolved invitee

#### Scenario: Group invite expanded at creation
- **WHEN** `invitees` contains a `{ groupId }` entry
- **THEN** the backend expands the group to its members at creation time and inserts individual `watch_event_invites` rows; later group membership changes do not affect the invite list

#### Scenario: Invalid individual invitee rejected
- **WHEN** `invitees` contains a `{ userId }` for a user not connected to the creator
- **THEN** the server returns 403 and no event is created

### Requirement: Host confirms selection
The event creator SHALL be able to write the winning candidate as the confirmed selection. For TV candidates, the host SHALL specify an `episodeMode` (`latest` or `specific`). When `episodeMode` is `specific`, the host SHALL also provide `seasonFrom`, `episodeFrom`, `seasonTo`, and `episodeTo`.

#### Scenario: Host confirms a movie candidate selection
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a valid `candidateId` referencing a movie candidate
- **THEN** a `watch_event_selection` row is created for the event with the given candidate

#### Scenario: Host confirms a TV candidate selection with specific episode range
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a `candidateId` referencing a TV candidate, `episodeMode: 'specific'`, and from/to season and episode values
- **THEN** a `watch_event_selection` row is created with all TV episode fields populated

#### Scenario: Host confirms a TV candidate selection with latest episode mode
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a `candidateId` referencing a TV candidate and `episodeMode: 'latest'`
- **THEN** a `watch_event_selection` row is created with `episode_mode = 'latest'` and all from/to fields null

#### Scenario: Non-host cannot confirm selection
- **WHEN** a user who is not the event creator calls `PUT /api/watch/events/:id/selection`
- **THEN** the server returns 403
