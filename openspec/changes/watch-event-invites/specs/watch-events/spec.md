**App**: all

## MODIFIED Requirements

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

## ADDED Requirements

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
