## Purpose

Covers group watch events: creation with invite lists (individual users or groups), RSVP, suggestions, voting, host-confirmed selection, and host-triggered completion with watchlist state transitions.

## Requirements

### Requirement: Create a watch event
Any authenticated user SHALL be able to create a watch event with a title, scheduled date, and an initial invite list. No content type is specified at creation — events are type-agnostic and may receive suggestions of any type. Invitees may be specified as individual connected users (`{ userId }`) or groups (`{ groupId }`). The creator SHALL be automatically added to `watch_event_invites` with attendance `yes`. To invite a group, the creator MUST be a member of that group.

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
The system SHALL allow a user to list events they created or were invited to, and to view full event details including invitees, suggestions, votes, and the confirmed selection. `GET /api/watch/events` SHALL accept an optional `filter` query parameter to scope results server-side.

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
- **THEN** the response includes the event metadata, each invitee with their RSVP status, each suggestion with per-user votes, and the confirmed selection if present

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

### Requirement: Add a suggestion to a watch event
Any invitee SHALL be able to add a movie or TV series from the catalog as a suggestion. A given title SHALL appear at most once per event. When a candidate is added the system SHALL trigger personal-rating-to-vote seeding for all invitees.

#### Scenario: Add a movie suggestion
- **WHEN** an invitee calls `POST /api/watch/events/:id/candidates` with a `movieId`
- **THEN** a `watch_event_candidates` row is created with `item_type = 'movie'` and vote seeding is triggered for all invitees

#### Scenario: Add a TV suggestion
- **WHEN** an invitee calls `POST /api/watch/events/:id/candidates` with a `seriesId`
- **THEN** a `watch_event_candidates` row is created with `item_type = 'tv'` and vote seeding is triggered for all invitees

#### Scenario: Duplicate suggestion rejected
- **WHEN** an invitee adds a movie or TV series that is already suggested for the same event
- **THEN** the server returns 409

#### Scenario: Non-invitee cannot add a suggestion
- **WHEN** a user not in `watch_event_invites` calls `POST /api/watch/events/:id/candidates`
- **THEN** the server returns 403

### Requirement: Suggestion search excludes already-added titles
The suggestion search UI in the event detail view SHALL filter out any movie or TV series that is already present in the event's suggestion list, so that users cannot attempt to add a duplicate. This filtering applies to both the local catalog results and the TMDB results sections.

#### Scenario: Already-added movie hidden from search results
- **WHEN** a user types a search query in the suggestion search field and a movie in the results is already added as a suggestion for the event
- **THEN** that movie SHALL NOT appear in the search dropdown

#### Scenario: Already-added TV series hidden from search results
- **WHEN** a user types a search query in the suggestion search field and a TV series in the results is already added as a suggestion for the event
- **THEN** that TV series SHALL NOT appear in the search dropdown

#### Scenario: Titles not yet suggested still appear
- **WHEN** a user types a search query and matching titles are not yet suggested for the event
- **THEN** those titles SHALL appear in the search dropdown as normal

#### Scenario: Already-added title suppressed from TMDB results
- **WHEN** a TMDB search returns a result for a title that has `isDuplicate: true` (already in local catalog) and that local title is already added as a suggestion for the event
- **THEN** that result SHALL NOT appear in the TMDB section of the dropdown

### Requirement: Vote on watch event suggestions
Any invitee SHALL be able to cast or update a vote on a suggestion using a 5-level scale from −2 to 2. Aggregate score is computed client-side as the sum of all votes cast; unvoted suggestions contribute 0.

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
The event creator SHALL be able to write the winning suggestion as the confirmed selection. For TV suggestions, the host SHALL specify an `episodeMode` (`latest` or `specific`). When `episodeMode` is `specific`, the host SHALL also provide `seasonFrom`, `episodeFrom`, `seasonTo`, and `episodeTo`.

#### Scenario: Host confirms a movie suggestion as the selection
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a valid `candidateId` referencing a movie suggestion
- **THEN** a `watch_event_selection` row is created for the event with the given suggestion

#### Scenario: Host confirms a TV suggestion as the selection with specific episode range
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a `candidateId` referencing a TV suggestion, `episodeMode: 'specific'`, and from/to season and episode values
- **THEN** a `watch_event_selection` row is created with all TV episode fields populated

#### Scenario: Host confirms a TV suggestion as the selection with latest episode mode
- **WHEN** the event creator calls `PUT /api/watch/events/:id/selection` with a `candidateId` referencing a TV suggestion and `episodeMode: 'latest'`
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

### Requirement: Remove a suggestion from a watch event
Any invitee SHALL be able to remove any suggestion from a watch event that has not yet been completed. Removing a suggestion SHALL atomically delete all associated votes and, if the suggestion is the currently confirmed selection, clear that selection as well. Removal SHALL be blocked if the event is already completed.

#### Scenario: Invitee removes a suggestion
- **WHEN** an invitee calls `DELETE /api/watch/events/:id/candidates/:candidateId`
- **THEN** the `watch_event_candidates` row is deleted, all `watch_event_votes` rows for that suggestion are deleted, and the server returns 204

#### Scenario: Selection cleared when selected suggestion is removed
- **WHEN** an invitee removes a suggestion that is the current confirmed selection
- **THEN** the `watch_event_selection` row for the event is also deleted in the same transaction

#### Scenario: Non-invitee cannot remove a suggestion
- **WHEN** a user not in `watch_event_invites` calls `DELETE /api/watch/events/:id/candidates/:candidateId`
- **THEN** the server returns 403

#### Scenario: Remove on completed event rejected
- **WHEN** any user calls `DELETE /api/watch/events/:id/candidates/:candidateId` and the event has `completed_at` set
- **THEN** the server returns 409

#### Scenario: Remove non-existent suggestion returns 404
- **WHEN** an invitee calls `DELETE /api/watch/events/:id/candidates/:candidateId` for a suggestion ID that does not exist
- **THEN** the server returns 404

### Requirement: Two-tap inline confirmation before removing a suggestion
The UI SHALL require a two-tap confirmation before removing a suggestion to prevent accidental deletion. The first tap SHALL transform the remove affordance in-place into a confirmation state showing a "Confirm" action and a "Cancel" action. The second tap on "Confirm" SHALL call the remove endpoint. Tapping "Cancel" SHALL restore the original remove affordance without making any API call.

#### Scenario: First tap enters confirmation state
- **WHEN** a participant taps the remove affordance on a suggestion card
- **THEN** the affordance is replaced in-place with "Confirm" and "Cancel" controls; no other suggestion cards are affected

#### Scenario: Confirm tap removes the suggestion
- **WHEN** the participant taps "Confirm" in the confirmation state
- **THEN** `DELETE /api/watch/events/:id/candidates/:candidateId` is called and the suggestion is removed from the list

#### Scenario: Cancel tap restores remove affordance
- **WHEN** the participant taps "Cancel" in the confirmation state
- **THEN** the card reverts to its normal state and no API call is made

#### Scenario: Remove affordance only shown on active events
- **WHEN** the event detail page is loaded for a completed event
- **THEN** no remove affordance is shown on any suggestion card

### Requirement: Delete a watch event
Any event participant SHALL be able to delete a watch event. Deletion SHALL cascade to all associated invites, suggestions, votes, and selection in a single transaction. The UI SHALL require a two-tap confirmation before calling the delete endpoint, consistent with the suggestion removal pattern. After successful deletion the client SHALL navigate to the events list.

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
Any event participant SHALL be able to reopen a completed event by clearing its `completed_at` timestamp. Reopening does not affect the confirmed selection or suggestions; the participant may use the clear-selection flow separately if needed. Calling reopen on a non-completed event SHALL be rejected.

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

### Requirement: Selected suggestion displayed with title
When a confirmed selection exists, the event detail page SHALL display "Selected: \<title\>" using the suggestion's movie or series title, rather than a generic suggestion ID reference.

#### Scenario: Selection displays movie title
- **WHEN** the confirmed selection references a movie suggestion
- **THEN** the event detail page displays "Selected: \<movieTitle\>"

#### Scenario: Selection displays series title
- **WHEN** the confirmed selection references a TV series suggestion
- **THEN** the event detail page displays "Selected: \<seriesTitle\>"

### Requirement: Event suggestions sorted by summed attendee personal ratings
The `GET /api/watch/events/:id` response SHALL return the suggestions list sorted server-side by the sum of personal ratings across all invitees with RSVP `yes` or `maybe`. Invitees with RSVP `no` SHALL be excluded from the sum. Candidates with no attendee ratings sort to the bottom.

#### Scenario: Suggestions ordered by summed yes/maybe personal ratings
- **WHEN** an authenticated user calls `GET /api/watch/events/:id`
- **THEN** the suggestions list is sorted descending by the sum of personal ratings from yes and maybe RSVPs; candidates with no ratings sort to the bottom

#### Scenario: No RSVPs excluded from rating sum
- **WHEN** computing the suggestion sort order
- **THEN** personal ratings from invitees with RSVP `no` are not included in the sum

### Requirement: From My Ratings quick-add panel on event detail
The event detail page SHALL include an expandable panel at the bottom of the Suggestions section, toggled by a text link ("▼ Add From My Ratings" when collapsed, "▲ Hide" when expanded). The panel SHALL render a compact list of the calling user's rated items not already in the event. Each row SHALL show a type badge (M / TV), title, personal rating badge, and an Add button. Tapping Add SHALL call `POST /api/watch/events/:id/candidates` and display a transient checkmark for ~2 seconds before removing the row from the panel.

#### Scenario: Panel is collapsed by default
- **WHEN** the event detail page is loaded
- **THEN** the From My Ratings panel is collapsed showing the "▼ Add From My Ratings" toggle link

#### Scenario: Expand toggle shows compact ratings list
- **WHEN** the user taps "▼ Add From My Ratings"
- **THEN** the panel expands to show a compact list of the user's rated items not already in the event, and the toggle link changes to "▲ Hide"

#### Scenario: Already-added items excluded from panel
- **WHEN** the From My Ratings panel is expanded
- **THEN** items already present as suggestions in the event are not shown in the panel

#### Scenario: Add button adds candidate and shows transient checkmark
- **WHEN** the user taps Add on a row in the panel
- **THEN** `POST /api/watch/events/:id/candidates` is called, the Add button shows a checkmark for ~2 seconds, and the row is removed from the panel

#### Scenario: Items with no rating or negative rating are still addable
- **WHEN** the panel shows an item with no rating or a negative rating
- **THEN** the Add button is visible and functional for that item
