**App**: client-watch

## ADDED Requirements

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

## MODIFIED Requirements

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
