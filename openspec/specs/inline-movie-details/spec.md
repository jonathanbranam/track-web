**App**: client-watch

## Purpose

Provides inline expandable detail panels on movie and TV cards across catalog, watchlist, and event candidate pages. Tapping a card title reveals additional catalog fields (description, streaming platform, runtime, etc.) without navigating away from the current page.

## Requirements

### Requirement: Tap title to expand inline detail panel
Each movie and TV card in the catalog, watchlist, and event candidate list SHALL display the title as a tappable element. Tapping the title SHALL expand an inline detail panel below the title row within the same card, revealing all available catalog fields not already visible in the collapsed card: description, streaming platform, runtime (movies) or episode runtime and season count (TV). Tapping the title again SHALL collapse the panel.

#### Scenario: Tapping title expands detail panel
- **WHEN** the user taps the title on a collapsed movie or TV card
- **THEN** an inline detail panel appears below the title within the card, showing description, streaming platform, runtime (or episode runtime / season count for TV), and any other catalog fields not already shown

#### Scenario: Tapping title again collapses detail panel
- **WHEN** the user taps the title on a card whose detail panel is already expanded
- **THEN** the detail panel is hidden and the card returns to its collapsed state

#### Scenario: Chevron indicates expand state
- **WHEN** a movie or TV card is rendered
- **THEN** a chevron icon is displayed adjacent to the title; it points down when collapsed and up when expanded

#### Scenario: Fields with no data are omitted from the panel
- **WHEN** the detail panel is expanded for a movie or TV entry that has null values for optional fields
- **THEN** only fields with non-null values are rendered in the panel; no empty labels or blank rows are shown

### Requirement: At most one card expanded at a time per page
Within any single page, at most one movie or TV card SHALL be expanded at a time. Opening a second card's detail panel SHALL automatically collapse any currently open panel.

#### Scenario: Opening a second card collapses the first
- **WHEN** the user taps the title on card B while card A's detail panel is already open
- **THEN** card A's panel collapses and card B's panel opens

#### Scenario: Cards on different pages are independent
- **WHEN** the user navigates from a page with an expanded card to another page and returns
- **THEN** no card is expanded (expanded state is not persisted across navigation)

### Requirement: Inline detail panel in movie catalog
The movie catalog page (`/movies/catalog`) SHALL support the inline detail panel on every movie card. The panel SHALL display description, streaming platform, and runtime (in minutes) if available. The existing Edit and "+ Watchlist" affordances SHALL remain functional and independently tappable regardless of expanded state.

#### Scenario: Detail panel shown alongside catalog affordances
- **WHEN** a user expands a movie card on the catalog page
- **THEN** the detail panel appears inside the card, and the Edit and "+ Watchlist" buttons remain visible and tappable

### Requirement: Inline detail panel in TV catalog
The TV catalog page (`/tv/catalog`) SHALL support the inline detail panel on every TV series card. The panel SHALL display description, streaming platform, episode runtime, and season count if available. The existing Edit affordance SHALL remain functional and independently tappable.

#### Scenario: Detail panel shown alongside TV catalog affordances
- **WHEN** a user expands a TV series card on the TV catalog page
- **THEN** the detail panel appears inside the card, and the Edit button remains visible and tappable

### Requirement: Inline detail panel in movie watchlist
The movie watchlist page SHALL support the inline detail panel on every movie card. The panel SHALL display description, streaming platform, and runtime if available. The existing state selector and Remove affordance SHALL remain functional and independently tappable.

#### Scenario: Detail panel shown alongside watchlist affordances
- **WHEN** a user expands a movie card on the watchlist page
- **THEN** the detail panel appears inside the card, and the state selector and Remove button remain functional

### Requirement: Inline detail panel in TV watchlist
The TV watchlist page SHALL support the inline detail panel on every TV series card. The panel SHALL display description, streaming platform, episode runtime, and season count if available. The existing state selector, episode progress controls, and Remove affordance SHALL remain functional and independently tappable.

#### Scenario: Detail panel shown alongside TV watchlist affordances
- **WHEN** a user expands a TV series card on the TV watchlist page
- **THEN** the detail panel appears inside the card, and the state selector, episode progress controls, and Remove button remain functional

### Requirement: Inline detail panel on event candidates
The event detail page SHALL support the inline detail panel on every candidate card. Because candidate list responses do not embed full catalog data, the system SHALL fetch the full movie or TV series record the first time a candidate card is expanded. Subsequent expansions of the same card SHALL use the cached result without a new network request. While the fetch is in progress, an inline loading indicator SHALL be shown within the card.

#### Scenario: First expand triggers a detail fetch for movie candidate
- **WHEN** the user taps the title of a movie candidate card for the first time
- **THEN** `GET /api/watch/movies/:movieId` is called and the returned detail is displayed in the expanded panel

#### Scenario: First expand triggers a detail fetch for TV candidate
- **WHEN** the user taps the title of a TV series candidate card for the first time
- **THEN** `GET /api/watch/tv/:seriesId` is called and the returned detail is displayed in the expanded panel

#### Scenario: Subsequent expand uses cached data
- **WHEN** the user collapses and re-expands a candidate card that was already fetched
- **THEN** no new network request is made and the previously fetched detail is shown immediately

#### Scenario: Loading indicator shown while fetching candidate detail
- **WHEN** the user taps a candidate card title and the detail fetch is in progress
- **THEN** a loading indicator is shown inside the card and no partial detail is displayed

#### Scenario: Voting and remove affordances remain functional when expanded
- **WHEN** a candidate card's detail panel is expanded
- **THEN** the vote buttons and the remove affordance on that candidate remain visible and independently tappable
