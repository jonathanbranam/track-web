## Purpose

Covers group watch events: creation with invite lists (individual users or groups), RSVP, candidate suggestions, voting, host-confirmed selection, and host-triggered completion with watchlist state transitions.

## ADDED Requirements

### Requirement: Create a watch event
Any authenticated user SHALL be able to create a watch event with a title, type (`movie` or `tv`), scheduled date, and an initial invite list. Invitees may be specified as individual connected users (`{ userId }`) or groups (`{ groupId }`).

#### Scenario: Create a movie event
- **WHEN** an authenticated user calls `POST /api/watch/events` with `type: 'movie'`, a title, a date, and an `invitees` list
- **THEN** a `watch_events` row is created with `type = 'movie'` and `watch_event_invites` rows are inserted for each resolved invitee

#### Scenario: Create a TV event
- **WHEN** an authenticated user calls `POST /api/watch/events` with `type: 'tv'`
- **THEN** a `watch_events` row is created with `type = 'tv'`

#### Scenario: Group invite expanded at creation
- **WHEN** `invitees` contains a `{ groupId }` entry
- **THEN** the backend expands the group to its members at creation time and inserts individual `watch_event_invites` rows; later group membership changes do not affect the invite list

#### Scenario: Invalid individual invitee rejected
- **WHEN** `invitees` contains a `{ userId }` for a user not connected to the creator
- **THEN** the server returns 403 and no event is created

### Requirement: List and view watch events
The system SHALL allow a user to list events they created or were invited to, and to view full event details including invitees, candidates, votes, and the confirmed selection.

#### Scenario: List events
- **WHEN** an authenticated user calls `GET /api/watch/events`
- **THEN** the response contains all events where the user is the creator or has a `watch_event_invites` row

#### Scenario: Get event detail
- **WHEN** an authenticated user calls `GET /api/watch/events/:id`
- **THEN** the response includes the event metadata, each invitee with their RSVP status, each candidate with per-user votes, and the confirmed selection if present

### Requirement: RSVP to a watch event
An invited user SHALL be able to set their attendance to `yes`, `no`, or `maybe`. Only invited users may RSVP.

#### Scenario: RSVP sets attendance
- **WHEN** an invited user calls `PUT /api/watch/events/:id/attendance` with `{ attendance: 'yes' }`
- **THEN** `watch_event_invites.attendance` for that user is updated to `'yes'`

#### Scenario: Non-invitee RSVP rejected
- **WHEN** a user not in `watch_event_invites` calls `PUT /api/watch/events/:id/attendance`
- **THEN** the server returns 403

### Requirement: Suggest a candidate for a watch event
Any invitee SHALL be able to nominate a movie or TV series from the catalog as a candidate. A given title SHALL appear at most once per event.

#### Scenario: Suggest a movie candidate
- **WHEN** an invitee calls `POST /api/watch/events/:id/candidates` with a `movieId`
- **THEN** a `watch_event_candidates` row is created with `item_type = 'movie'`

#### Scenario: Suggest a TV candidate
- **WHEN** an invitee calls `POST /api/watch/events/:id/candidates` with a `seriesId`
- **THEN** a `watch_event_candidates` row is created with `item_type = 'tv'`

#### Scenario: Duplicate nomination rejected
- **WHEN** an invitee suggests a movie or TV series that already has a candidate row for the same event
- **THEN** the server returns 409

#### Scenario: Non-invitee cannot suggest a candidate
- **WHEN** a user not in `watch_event_invites` calls `POST /api/watch/events/:id/candidates`
- **THEN** the server returns 403

### Requirement: Vote on watch event candidates
Any invitee SHALL be able to cast or update a vote on a candidate using a 5-level scale from −2 to 2. Aggregate score is computed client-side as the sum of all votes cast; unvoted candidates contribute 0.

#### Scenario: Cast a vote
- **WHEN** an invitee calls `POST /api/watch/events/:id/candidates/:candidateId/vote` with `{ vote: 1 }`
- **THEN** a `watch_event_votes` row is created or updated with `vote = 1`

#### Scenario: Update an existing vote
- **WHEN** an invitee calls the vote endpoint again with a different value
- **THEN** the existing `watch_event_votes` row is updated to the new value

#### Scenario: Vote out of range rejected
- **WHEN** the `vote` field is outside −2 to 2
- **THEN** the server returns 400

#### Scenario: Non-invitee cannot vote
- **WHEN** a user not in `watch_event_invites` calls the vote endpoint
- **THEN** the server returns 403

### Requirement: Host confirms selection
The event creator SHALL be able to write the winning candidate as the confirmed selection. For TV events, the host SHALL specify an `episodeMode` (`latest` or `specific`). When `episodeMode` is `specific`, the host SHALL also provide `seasonFrom`, `episodeFrom`, `seasonTo`, and `episodeTo`.

#### Scenario: Host confirms a movie selection
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a valid `candidateId`
- **THEN** a `watch_event_selection` row is created for the event with the given candidate

#### Scenario: Host confirms a TV selection with specific episode range
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a `candidateId`, `episodeMode: 'specific'`, and from/to season and episode values
- **THEN** a `watch_event_selection` row is created with all TV episode fields populated

#### Scenario: Host confirms a TV selection with latest episode mode
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with `episodeMode: 'latest'`
- **THEN** a `watch_event_selection` row is created with `episode_mode = 'latest'` and all from/to fields null

#### Scenario: Non-host cannot confirm selection
- **WHEN** a user who is not the event creator calls `PUT /api/watch/events/:id/selection`
- **THEN** the server returns 403

### Requirement: Host marks event as complete
The event creator SHALL be able to mark an event as complete after it occurs. The event MUST have a confirmed selection before it can be completed. Marking an event complete triggers watchlist state transitions for all invitees who RSVP'd `yes`.

#### Scenario: Mark event complete
- **WHEN** the event creator calls `POST /api/watch/events/:id/complete` on an event with a confirmed selection
- **THEN** `watch_events.completed_at` is set to the current timestamp and watchlist transitions are applied for all yes-RSVP invitees

#### Scenario: Cannot complete event without confirmed selection
- **WHEN** `POST /api/watch/events/:id/complete` is called and no `watch_event_selection` row exists for the event
- **THEN** the server returns 409

#### Scenario: Cannot complete already-completed event
- **WHEN** `POST /api/watch/events/:id/complete` is called on an event with `completed_at` already set
- **THEN** the server returns 409

#### Scenario: Non-host cannot complete event
- **WHEN** a user who is not the event creator calls `POST /api/watch/events/:id/complete`
- **THEN** the server returns 403
