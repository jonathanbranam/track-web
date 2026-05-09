**App**: client-watch

## ADDED Requirements

### Requirement: Invite picker on the new event form
The new event form SHALL include an invite picker section below the date field, allowing the user to select connected users and groups to invite before creating the event. The picker SHALL display connected users as a checkbox list and groups as selectable rows. Selecting a group SHALL add the group to the pending invite selection (server expands to members at creation time). The form SHALL pass all selected invitees to `POST /api/watch/events` on submit.

#### Scenario: Connected users displayed as checkboxes
- **WHEN** the user opens the new event form
- **THEN** the invite picker displays each connected user with a checkbox; unchecked by default

#### Scenario: Groups displayed as selectable rows
- **WHEN** the user opens the new event form and has groups
- **THEN** each group is displayed by name with a toggle button; tapping it adds or removes the group from the pending selection

#### Scenario: Selected invitees sent on create
- **WHEN** the user submits the new event form with one or more invitees selected
- **THEN** the selected users and groups are included in the `invitees` payload sent to `POST /api/watch/events`

#### Scenario: No invitees selected is valid
- **WHEN** the user submits the new event form with no invitees selected
- **THEN** the event is created with `invitees: []`; only the creator is in `watch_event_invites`

### Requirement: Invite management on the event detail page
The event detail page SHALL provide an invite management section visible to any current participant (host or invitee). The section SHALL allow adding new invitees via the same user and group picker and SHALL render a remove button on each existing invitee row. The creator's invitee row SHALL NOT have a remove button. Users already invited SHALL be excluded from the add picker. The section SHALL be collapsed by default and expand on demand to defer the picker's data fetch.

#### Scenario: Any participant sees the invite management section
- **WHEN** a current participant (host or invitee) views the event detail page
- **THEN** the invite management section is visible and accessible

#### Scenario: Adding invitees from the detail page
- **WHEN** a participant expands the invite management section, selects users or groups, and submits
- **THEN** `POST /api/watch/events/:id/invitees` is called with the selection and the attendee list reloads

#### Scenario: Already-invited users excluded from the picker
- **WHEN** the invite management section is expanded
- **THEN** users who already have a `watch_event_invites` row for this event are not shown in the user picker

#### Scenario: Remove button on each non-creator invitee row
- **WHEN** a participant views the attendees list on the event detail page
- **THEN** each invitee row (except the creator's) has a remove button

#### Scenario: Creator row has no remove button
- **WHEN** a participant views the attendees list on the event detail page
- **THEN** the creator's invitee row does not display a remove button

#### Scenario: Removing an invitee reloads the attendee list
- **WHEN** a participant taps the remove button on an invitee row
- **THEN** `DELETE /api/watch/events/:id/invitees/:userId` is called and the attendee list reloads to reflect the removal

#### Scenario: Self-removal navigates away
- **WHEN** a non-creator participant removes themselves and the deletion succeeds
- **THEN** the app navigates away from the event detail page (the user no longer has access)
