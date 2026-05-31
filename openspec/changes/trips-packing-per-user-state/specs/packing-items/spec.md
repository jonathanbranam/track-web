**App**: trips

## MODIFIED Requirements

### Requirement: Read-only PackingPage
The system SHALL render a `PackingPage` at the `/packing` route in the trips client. On mount it SHALL fetch `GET /api/trips/:id/packing/items` and `GET /api/trips/:id/packing/state` in parallel. It SHALL render items grouped by section: section name as a styled heading, each item as a list row with a checkbox reflecting the current user's checked state for that item. Tapping a checkbox SHALL optimistically toggle the local state and fire `PUT /api/trips/:id/packing/state`; on error it SHALL revert the toggle. For the trip owner (user_id 1), the page SHALL additionally fetch `GET /api/trips/:id/packing/summary` in parallel and render a per-member completion summary section above the item list. A NavBar tab SHALL link to `/packing`.

#### Scenario: Items rendered with user state
- **WHEN** the PackingPage mounts and both items and state are fetched
- **THEN** items are displayed under their section headings in position order, with checked checkboxes for items the current user has checked and unchecked checkboxes for the rest

#### Scenario: Tap to check an item
- **WHEN** the user taps an unchecked checkbox
- **THEN** the checkbox immediately shows as checked (optimistic), and a PUT request is sent to persist the state

#### Scenario: Tap to uncheck an item
- **WHEN** the user taps a checked checkbox
- **THEN** the checkbox immediately shows as unchecked (optimistic), and a PUT request is sent to persist the state

#### Scenario: Toggle reverts on error
- **WHEN** the PUT request for a toggle fails
- **THEN** the checkbox reverts to its prior state

#### Scenario: Owner sees completion summary
- **WHEN** the owner (user_id 1) views the PackingPage
- **THEN** a summary section above the list shows one row per member with their `checked/total` count

#### Scenario: Non-owner does not see summary
- **WHEN** a non-owner member views the PackingPage
- **THEN** no summary section is rendered

#### Scenario: Empty state
- **WHEN** no items exist for the trip
- **THEN** the page displays "No packing list yet."

#### Scenario: NavBar tab present
- **WHEN** the user views any page in the trips app
- **THEN** a Packing tab is visible in the NavBar and navigates to `/packing`
