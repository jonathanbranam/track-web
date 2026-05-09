## Purpose

Covers group watch events: creation with invite lists (individual users or groups), RSVP, candidate suggestions, voting, host-confirmed selection, and host-triggered completion with watchlist state transitions.

## Requirements

### Requirement: Create a watch event
Any authenticated user SHALL be able to create a watch event with a title, scheduled date, and an initial invite list. No content type is specified at creation — events are type-agnostic and may receive candidates of any type. Invitees may be specified as individual connected users (`{ userId }`) or groups (`{ groupId }`). The creator SHALL be automatically added to `watch_event_invites` with attendance `yes`. To invite a group, the creator MUST be a member of that group.

#### Scenario: Create an event
- **WHEN** an authenticated user calls `POST /api/watch/events` with a title, a date, and an `invitees` list
- **THEN** a `watch_events` row is created, the creator is inserted into `watch_event_invites` with `attendance = 'yes'`, and `watch_event_invites` rows are inserted for each resolved invitee

#### Scenario: Creator is automatically an invitee
- **WHEN** a user creates a watch event
- **THEN** a `watch_event_invites` row exists for the creator with `attendance = 'yes'`, regardless of whether the creator was listed in `invitees`

#### Scenario: Group invite expanded at creation
- **WHEN** `invitees` contains a `{ groupId }` entry and the creator is a member of that group
- **THEN** the backend expands the group to its members at creation time and inserts individual `watch_event_invites` rows; later group membership changes do not affect the invite list

#### Scenario: Group invite rejected if creator is not a member
- **WHEN** `invitees` contains a `{ groupId }` for a group the creator is not a member of
- **THEN** the server returns 403 and no event is created

#### Scenario: Invalid individual invitee rejected
- **WHEN** `invitees` contains a `{ userId }` for a user not connected to the creator
- **THEN** the server returns 403 and no event is created

### Requirement: Add invitees to an existing watch event
Any current event participant (host or invitee) SHALL be able to add invitees to an existing watch event. No permission tiers exist among participants — all have equal rights to invite, mirroring the social-groups model. To invite an individual user, the requester MUST be connected to that user. To invite a group, the requester MUST be a member of that group. Duplicate invites SHALL be silently skipped. Adding invitees to a completed event SHALL be rejected.

#### Scenario: Participant adds a connected user
- **WHEN** a current participant calls `POST /api/watch/events/:id/invitees` with `{ type: 'user', userId }` and is connected to that user
- **THEN** a `watch_event_invites` row is inserted for the new user

#### Scenario: Participant adds a group they belong to
- **WHEN** a current participant calls `POST /api/watch/events/:id/invitees` with `{ type: 'group', groupId }` and is a member of that group
- **THEN** the group is expanded to its current members and individual `watch_event_invites` rows are inserted for each; later group membership changes do not affect the invite list

#### Scenario: Adding a group requires group membership
- **WHEN** a current participant calls `POST /api/watch/events/:id/invitees` with a `{ groupId }` for a group they are not a member of
- **THEN** the server returns 403 and no rows are inserted

#### Scenario: Adding an unconnected user rejected
- **WHEN** a current participant calls `POST /api/watch/events/:id/invitees` with a `{ userId }` for a user not connected to the requester
- **THEN** the server returns 403 and no row is inserted

#### Scenario: Duplicate invite silently skipped
- **WHEN** a current participant calls `POST /api/watch/events/:id/invitees` with a user who is already invited
- **THEN** the server returns a success response and no duplicate row is inserted

#### Scenario: Non-participant cannot add invitees
- **WHEN** a user who is neither the host nor an invitee calls `POST /api/watch/events/:id/invitees`
- **THEN** the server returns 403

#### Scenario: Cannot add invitees to a completed event
- **WHEN** `POST /api/watch/events/:id/invitees` is called on an event where `completed_at` is set
- **THEN** the server returns 409

### Requirement: Remove an invitee from a watch event
Any current event participant (host or invitee) SHALL be able to remove any invitee from an existing watch event. The creator's invite row SHALL be protected and cannot be removed by anyone. A non-creator participant MAY remove themselves (leave the event). Removing an invitee from a completed event SHALL be rejected.

#### Scenario: Participant removes another invitee
- **WHEN** a current participant calls `DELETE /api/watch/events/:id/invitees/:userId` where `userId` is not the creator
- **THEN** the `watch_event_invites` row for that user is deleted

#### Scenario: Participant removes themselves (leave event)
- **WHEN** a non-creator participant calls `DELETE /api/watch/events/:id/invitees/:userId` where `userId` is their own user ID
- **THEN** their `watch_event_invites` row is deleted and they no longer have access to the event

#### Scenario: Creator cannot be removed
- **WHEN** any participant calls `DELETE /api/watch/events/:id/invitees/:userId` where `userId` equals `event.createdByUserId`
- **THEN** the server returns 403 and no row is deleted

#### Scenario: Non-participant cannot remove invitees
- **WHEN** a user who is neither the host nor an invitee calls `DELETE /api/watch/events/:id/invitees/:userId`
- **THEN** the server returns 403

#### Scenario: Removing a non-existent invitee returns 404
- **WHEN** a current participant calls `DELETE /api/watch/events/:id/invitees/:userId` for a user who is not in `watch_event_invites`
- **THEN** the server returns 404

#### Scenario: Cannot remove invitees from a completed event
- **WHEN** `DELETE /api/watch/events/:id/invitees/:userId` is called on an event where `completed_at` is set
- **THEN** the server returns 409

### Requirement: List and view watch events
The system SHALL allow a user to list events they created or were invited to, and to view full event details including invitees, candidates, votes, and the confirmed selection. `GET /api/watch/events` SHALL accept an optional `filter` query parameter to scope results server-side.

#### Scenario: List all events (no filter)
- **WHEN** an authenticated user calls `GET /api/watch/events`
- **THEN** the response contains all events where the user is the creator or has a `watch_event_invites` row

#### Scenario: List active events
- **WHEN** an authenticated user calls `GET /api/watch/events?filter=active`
- **THEN** the response contains only events where `completed_at IS NULL`

#### Scenario: List recently completed events
- **WHEN** an authenticated user calls `GET /api/watch/events?filter=completed-recent`
- **THEN** the response contains the single most-recently-completed event (regardless of age) plus any events completed within the prior calendar month (the month before the current month, not a rolling 30-day window)

#### Scenario: Get event detail
- **WHEN** an authenticated user calls `GET /api/watch/events/:id`
- **THEN** the response includes the event metadata, each invitee with their RSVP status, each candidate with per-user votes, and the confirmed selection if present

### Requirement: RSVP to a watch event
Any event participant SHALL be able to set attendance for themselves or any other invitee to `yes`, `no`, or `maybe`. The `PUT /api/watch/events/:id/attendance` endpoint SHALL accept an optional `userId` field in the body; if omitted it defaults to the caller's own user ID. The caller MUST be an event participant; the target `userId` MUST also be a participant. The UI SHALL enable attendance buttons for all invitee rows, not just the current user's row, so any participant can update any invitee's attendance.

#### Scenario: Participant sets own attendance
- **WHEN** an invited user calls `PUT /api/watch/events/:id/attendance` with `{ attendance: 'yes' }`
- **THEN** `watch_event_invites.attendance` for that user is updated to `'yes'`

#### Scenario: Participant sets another invitee's attendance
- **WHEN** an invited user calls `PUT /api/watch/events/:id/attendance` with `{ userId: <otherId>, attendance: 'no' }`
- **THEN** `watch_event_invites.attendance` for the target user is updated to `'no'`

#### Scenario: Non-participant cannot update attendance
- **WHEN** a user not in `watch_event_invites` calls `PUT /api/watch/events/:id/attendance`
- **THEN** the server returns 403

#### Scenario: Target userId must be a participant
- **WHEN** an invited user calls `PUT /api/watch/events/:id/attendance` with a `userId` of a user not in `watch_event_invites`
- **THEN** the server returns 404

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

### Requirement: Candidate search excludes already-nominated titles
The candidate search UI in the event detail view SHALL filter out any movie or TV series that is already present in the event's candidate list, so that users cannot attempt to nominate a duplicate.

#### Scenario: Already-nominated movie hidden from search results
- **WHEN** a user types a search query in the candidate search field and a movie in the results is already nominated as a candidate for the event
- **THEN** that movie SHALL NOT appear in the search dropdown

#### Scenario: Already-nominated TV series hidden from search results
- **WHEN** a user types a search query in the candidate search field and a TV series in the results is already nominated as a candidate for the event
- **THEN** that TV series SHALL NOT appear in the search dropdown

#### Scenario: Un-nominated titles still appear
- **WHEN** a user types a search query and matching titles are not yet nominated as candidates for the event
- **THEN** those titles SHALL appear in the search dropdown as normal

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

### Requirement: Remove a candidate from a watch event
Any invitee SHALL be able to remove any candidate from a watch event that has not yet been completed. Removing a candidate SHALL atomically delete all associated votes and, if the candidate is the currently confirmed selection, clear that selection as well. Removal SHALL be blocked if the event is already completed.

#### Scenario: Invitee removes a candidate
- **WHEN** an invitee calls `DELETE /api/watch/events/:id/candidates/:candidateId`
- **THEN** the `watch_event_candidates` row is deleted, all `watch_event_votes` rows for that candidate are deleted, and the server returns 204

#### Scenario: Selection cleared when selected candidate is removed
- **WHEN** an invitee removes a candidate that is the current confirmed selection
- **THEN** the `watch_event_selection` row for the event is also deleted in the same transaction

#### Scenario: Non-invitee cannot remove a candidate
- **WHEN** a user not in `watch_event_invites` calls `DELETE /api/watch/events/:id/candidates/:candidateId`
- **THEN** the server returns 403

#### Scenario: Remove on completed event rejected
- **WHEN** any user calls `DELETE /api/watch/events/:id/candidates/:candidateId` and the event has `completed_at` set
- **THEN** the server returns 409

#### Scenario: Remove non-existent candidate returns 404
- **WHEN** an invitee calls `DELETE /api/watch/events/:id/candidates/:candidateId` for a candidate ID that does not exist
- **THEN** the server returns 404

### Requirement: Two-tap inline confirmation before removing a candidate
The UI SHALL require a two-tap confirmation before removing a candidate to prevent accidental deletion. The first tap SHALL transform the remove affordance in-place into a confirmation state showing a "Confirm" action and a "Cancel" action. The second tap on "Confirm" SHALL call the remove endpoint. Tapping "Cancel" SHALL restore the original remove affordance without making any API call.

#### Scenario: First tap enters confirmation state
- **WHEN** a participant taps the remove affordance on a candidate card
- **THEN** the affordance is replaced in-place with "Confirm" and "Cancel" controls; no other candidate cards are affected

#### Scenario: Confirm tap removes the candidate
- **WHEN** the participant taps "Confirm" in the confirmation state
- **THEN** `DELETE /api/watch/events/:id/candidates/:candidateId` is called and the candidate is removed from the list

#### Scenario: Cancel tap restores remove affordance
- **WHEN** the participant taps "Cancel" in the confirmation state
- **THEN** the card reverts to its normal state and no API call is made

#### Scenario: Remove affordance only shown on active events
- **WHEN** the event detail page is loaded for a completed event
- **THEN** no remove affordance is shown on any candidate card

### Requirement: Delete a watch event
Any event participant SHALL be able to delete a watch event. Deletion SHALL cascade to all associated invites, candidates, votes, and selection in a single transaction. The UI SHALL require a two-tap confirmation before calling the delete endpoint, consistent with the candidate removal pattern. After successful deletion the client SHALL navigate to the events list.

#### Scenario: Participant deletes an event
- **WHEN** an event participant calls `DELETE /api/watch/events/:id`
- **THEN** the event row and all associated `watch_event_invites`, `watch_event_candidates`, `watch_event_votes`, and `watch_event_selection` rows are deleted in a single transaction and the server returns 204

#### Scenario: Delete UI requires two-tap confirmation
- **WHEN** a participant taps the delete affordance on the event detail page
- **THEN** the affordance is replaced in-place with "Confirm" and "Cancel" controls; tapping "Confirm" calls `DELETE /api/watch/events/:id`; tapping "Cancel" restores the original affordance without making an API call

#### Scenario: After deletion, client navigates to events list
- **WHEN** `DELETE /api/watch/events/:id` succeeds
- **THEN** the client navigates to `/events`

#### Scenario: Non-participant cannot delete event
- **WHEN** a user not in `watch_event_invites` calls `DELETE /api/watch/events/:id`
- **THEN** the server returns 403

### Requirement: Clear confirmed selection
Any event participant SHALL be able to clear the confirmed selection from an active (non-completed) watch event. Clearing removes the `watch_event_selection` row. The operation SHALL be blocked on completed events. After clearing, the set-selection form SHALL reappear.

#### Scenario: Participant clears selection on active event
- **WHEN** an event participant calls `DELETE /api/watch/events/:id/selection` and the event is not completed
- **THEN** the `watch_event_selection` row for the event is deleted and the server returns 204

#### Scenario: Cannot clear selection on completed event
- **WHEN** `DELETE /api/watch/events/:id/selection` is called on an event where `completed_at` is set
- **THEN** the server returns 409

#### Scenario: Non-participant cannot clear selection
- **WHEN** a user not in `watch_event_invites` calls `DELETE /api/watch/events/:id/selection`
- **THEN** the server returns 403

### Requirement: Reopen a completed event
Any event participant SHALL be able to reopen a completed event by clearing its `completed_at` timestamp. Reopening does not affect the confirmed selection or candidates; the participant may use the clear-selection flow separately if needed. Calling reopen on a non-completed event SHALL be rejected.

#### Scenario: Participant reopens a completed event
- **WHEN** an event participant calls `POST /api/watch/events/:id/reopen` and the event has `completed_at` set
- **THEN** `watch_events.completed_at` is set to NULL and the server returns 200

#### Scenario: Reopening a non-completed event rejected
- **WHEN** `POST /api/watch/events/:id/reopen` is called on an event where `completed_at` is NULL
- **THEN** the server returns 409

#### Scenario: Non-participant cannot reopen event
- **WHEN** a user not in `watch_event_invites` calls `POST /api/watch/events/:id/reopen`
- **THEN** the server returns 403

### Requirement: Edit event title and scheduled date
Any event participant SHALL be able to update an event's title and/or scheduled date after creation via `PATCH /api/watch/events/:id`. The request body SHALL accept `{ title?: string; scheduledDate?: string }` with at least one field required. The `EventDetailPage` SHALL display both the title and scheduled date as inline editable inputs. Editing works on both active and completed events.

#### Scenario: Participant updates event title
- **WHEN** an event participant calls `PATCH /api/watch/events/:id` with `{ title: "New Title" }`
- **THEN** `watch_events.title` is updated to "New Title" and the server returns the updated event

#### Scenario: Participant updates scheduled date
- **WHEN** an event participant calls `PATCH /api/watch/events/:id` with `{ scheduledDate: "2026-06-01" }`
- **THEN** `watch_events.scheduled_date` is updated and the server returns the updated event

#### Scenario: Patch accepted on completed events
- **WHEN** `PATCH /api/watch/events/:id` is called on an event where `completed_at` is set
- **THEN** the update is applied and the server returns 200

#### Scenario: Non-participant cannot edit event
- **WHEN** a user not in `watch_event_invites` calls `PATCH /api/watch/events/:id`
- **THEN** the server returns 403

#### Scenario: Empty patch body rejected
- **WHEN** `PATCH /api/watch/events/:id` is called with a body that contains neither `title` nor `scheduledDate`
- **THEN** the server returns 400

### Requirement: Event detail back navigation
The event detail page SHALL display a back affordance that navigates the user to the events list.

#### Scenario: Back affordance navigates to events list
- **WHEN** a user taps the back affordance on the event detail page
- **THEN** the client navigates to `/events`

### Requirement: Selected candidate displayed with title
When a confirmed selection exists, the event detail page SHALL display "Selected: \<title\>" using the candidate's movie or series title, rather than a generic candidate ID reference.

#### Scenario: Selection displays movie title
- **WHEN** the confirmed selection references a movie candidate
- **THEN** the event detail page displays "Selected: \<movieTitle\>"

#### Scenario: Selection displays series title
- **WHEN** the confirmed selection references a TV series candidate
- **THEN** the event detail page displays "Selected: \<seriesTitle\>"
