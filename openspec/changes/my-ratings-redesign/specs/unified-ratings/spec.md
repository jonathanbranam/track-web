**App**: client-watch

## ADDED Requirements

### Requirement: Unified ratings API endpoint
The system SHALL expose `GET /api/watch/ratings` returning both movies and TV series from the calling user's watchlist in a single response, sorted by personal rating descending (nulls last). Each item SHALL include `id`, `mediaType` (`'movie'` or `'tv'`), `title`, `year`, `streaming`, `rating`, `seen`, `again`, `watching`, and for TV series `season` and `episode`.

#### Scenario: Returns movies and TV sorted by rating
- **WHEN** an authenticated user calls `GET /api/watch/ratings`
- **THEN** the response contains all `user_movies` and `user_tv_series` rows for that user, merged and sorted by rating descending with nulls last, including movie and TV series metadata

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated caller calls `GET /api/watch/ratings`
- **THEN** the server returns 401

### Requirement: Ratings page with filter bar
The system SHALL provide a `/ratings` route rendering a `RatingsPage` with a persistent filter bar. The filter bar SHALL include two independent pill-style toggle buttons (Movies, TV) — both active by default — and a separate Seen pill on the right. The Seen pill controls whether items with `seen = true AND again = false AND watching = false` are included; it is off by default. When the Seen pill is off its label SHALL include a count of actively hidden items in parentheses.

#### Scenario: Default view shows all non-seen content
- **WHEN** the user navigates to `/ratings`
- **THEN** both Movies and TV pills are active, the Seen pill is off, and all items not matching `seen = true AND again = false AND watching = false` are displayed

#### Scenario: Movies pill toggles movie visibility
- **WHEN** the user taps the Movies pill to deactivate it
- **THEN** no movie items appear in the list; TV items remain visible

#### Scenario: TV pill toggles TV series visibility
- **WHEN** the user taps the TV pill to deactivate it
- **THEN** no TV series appear in the list; movie items remain visible

#### Scenario: Seen pill label shows hidden count when off
- **WHEN** the Seen pill is off and at least one item has `seen = true AND again = false AND watching = false`
- **THEN** the Seen pill label shows that count in parentheses

#### Scenario: Seen pill includes all seen items when on
- **WHEN** the user activates the Seen pill
- **THEN** all items (including those with `seen = true AND again = false AND watching = false`) are shown, subject to the Movies/TV filter

#### Scenario: Currently-watching and seen-but-again always visible
- **WHEN** the Seen pill is off
- **THEN** items with `watching = true` or `again = true` are always shown regardless of the Seen filter

### Requirement: MediaCard component with inline rating editing
The system SHALL render a shared `MediaCard` component (replacing the separate `MovieCard` and `TvSeriesCard` components) for each item on the Ratings page. Each card SHALL display a compact rating button (~40×28px) in the top-right corner showing the current rating label (−−, −, 0, +, ++) with a color-coded background: red tones for negative, gray for neutral, green/lime for positive. Cards with no rating SHALL show "?" in muted gray. Tapping the rating button SHALL expand that card in-place to show a full horizontal row of five rating buttons with an ✕ dismiss button. Only one card SHALL be expanded at a time. Selecting a rating SHALL call the appropriate watchlist PUT endpoint and collapse the card.

#### Scenario: Rating button shows current rating with color
- **WHEN** a card is rendered for an item with a rating
- **THEN** the rating button displays the corresponding label (−−, −, 0, +, ++) with the appropriate color-coded background

#### Scenario: No-rating shows question mark
- **WHEN** a card is rendered for an item with no rating
- **THEN** the rating button displays "?" in muted gray

#### Scenario: Tapping rating button expands inline rating row
- **WHEN** the user taps the rating button on a card
- **THEN** the card expands in-place to show five rating buttons (−− − 0 + ++) and an ✕ button

#### Scenario: Only one card expanded at a time
- **WHEN** the user taps a rating button on a second card while another is already expanded
- **THEN** the previously expanded card collapses and the newly tapped card expands

#### Scenario: Selecting a rating persists and collapses
- **WHEN** the user taps a rating value in the expanded row
- **THEN** `PUT /api/watch/movies/watchlist/:id` or `PUT /api/watch/tv/watchlist/:id` is called with the new rating, the card collapses, and the rating button updates to reflect the new value

#### Scenario: Dismiss button cancels without saving
- **WHEN** the user taps ✕ in the expanded row without selecting a rating
- **THEN** the card collapses with no API call and the rating is unchanged

### Requirement: Add-to dropdown row on Ratings page
Above the card list the Ratings page SHALL show a persistent row reading "Add to [Event|List dropdown] [specific target dropdown]". The first dropdown selects the target type (Event or List). The second dropdown is contextual — when Event is selected it shows upcoming events each with a candidate count in "shows" units; when List is selected it shows the user's named lists each with a count in "shows" units. When Event is selected and no upcoming events exist the second dropdown SHALL be replaced with italic placeholder text "No upcoming events".

#### Scenario: Event target shows upcoming events
- **WHEN** the user selects Event in the first dropdown and at least one upcoming event exists
- **THEN** the second dropdown lists upcoming events each with a candidate count in "shows" units

#### Scenario: No upcoming events shows placeholder
- **WHEN** the user selects Event in the first dropdown and no upcoming events exist
- **THEN** the second dropdown position displays italic placeholder text "No upcoming events"

#### Scenario: List target shows named lists
- **WHEN** the user selects List in the first dropdown
- **THEN** the second dropdown lists the user's named lists each with a count in "shows" units

### Requirement: Per-card event/list membership toggle pill
Each `MediaCard` on the Ratings page SHALL display a small pill button below the title row indicating whether the item is currently in the selected event or list. The pill SHALL use a filled dot (●) and violet text when the item is included, and an open dot (○) with gray text when it is not. The pill label SHALL be the name of the selected event or list. Tapping the pill SHALL toggle membership. The pill SHALL be hidden when no valid target is selected.

#### Scenario: Included item shows filled dot in violet
- **WHEN** the selected target contains the item
- **THEN** the pill shows ● and the target name in violet text

#### Scenario: Non-included item shows open dot in gray
- **WHEN** the selected target does not contain the item
- **THEN** the pill shows ○ and the target name in gray text

#### Scenario: Tapping pill toggles membership
- **WHEN** the user taps the pill on an item
- **THEN** membership in the selected target is toggled and the pill updates to reflect the new state

#### Scenario: Pill hidden when no valid target selected
- **WHEN** Event mode is selected but no upcoming events exist, or no target type is selected
- **THEN** no toggle pill is rendered on any card

### Requirement: Ratings page sub-tabs
The Ratings page SHALL display two sub-tabs below the page title: "Ratings" (the main view, active by default) and "My Lists" (placeholder). Only one sub-tab is active at a time.

#### Scenario: Ratings sub-tab is active by default
- **WHEN** the user navigates to `/ratings`
- **THEN** the "Ratings" sub-tab is active and the ratings list is shown

#### Scenario: My Lists sub-tab shows placeholder
- **WHEN** the user taps the "My Lists" sub-tab
- **THEN** a "coming soon" placeholder is displayed

### Requirement: Admin CLI for ratings
The system SHALL expose an admin CLI command for personal ratings: `watch ratings [--userId]` — lists personal ratings for a user; supports `--json`.

#### Scenario: CLI lists personal ratings for a user
- **WHEN** `watch ratings --userId <id>` is run
- **THEN** the command outputs all personal ratings for that user (both movies and TV series)
