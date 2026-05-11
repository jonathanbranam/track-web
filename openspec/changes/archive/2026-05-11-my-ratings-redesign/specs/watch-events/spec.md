**App**: client-watch

## MODIFIED Requirements

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

## ADDED Requirements

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
