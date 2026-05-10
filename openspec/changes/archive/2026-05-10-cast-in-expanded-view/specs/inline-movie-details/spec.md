**App**: client-watch

## ADDED Requirements

### Requirement: Movie detail endpoint includes cast fields
`GET /api/watch/movies/:id` SHALL include a `director` field (string or null) and a `cast` array (objects with `name` and `billingOrder`, sorted by `billingOrder` ascending) in its JSON response. If no cast data is stored for the movie, `director` SHALL be null and `cast` SHALL be an empty array.

#### Scenario: Detail response includes cast when data is available
- **WHEN** `GET /api/watch/movies/:id` is called for a movie that has stored cast
- **THEN** the response includes `director` (string) and `cast` (non-empty array of `{ name, billingOrder }`)

#### Scenario: Detail response returns empty cast when no data stored
- **WHEN** `GET /api/watch/movies/:id` is called for a movie with no stored cast
- **THEN** the response includes `director: null` and `cast: []`

### Requirement: TV detail endpoint includes cast fields
`GET /api/watch/tv/:id` SHALL include a `director` field (string or null) and a `cast` array (objects with `name` and `billingOrder`, sorted by `billingOrder` ascending) in its JSON response. If no cast data is stored for the series, `director` SHALL be null and `cast` SHALL be an empty array.

#### Scenario: TV detail response includes cast when data is available
- **WHEN** `GET /api/watch/tv/:id` is called for a series that has stored cast
- **THEN** the response includes `director` (string) and `cast` (non-empty array of `{ name, billingOrder }`)

#### Scenario: TV detail response returns empty cast when no data stored
- **WHEN** `GET /api/watch/tv/:id` is called for a series with no stored cast
- **THEN** the response includes `director: null` and `cast: []`

### Requirement: Catalog and watchlist panels fetch detail on first expand for cast
Movie and TV cards on catalog and watchlist pages do not embed cast data in their list responses. The system SHALL fetch `GET /api/watch/movies/:id` (or `GET /api/watch/tv/:id`) the first time a catalog or watchlist card is expanded, using the same lazy-fetch and caching pattern already defined for event candidates. Subsequent expansions of the same card SHALL use the cached result without a new network request.

#### Scenario: First expand of catalog card triggers detail fetch
- **WHEN** the user taps the title of a movie or TV card on a catalog page for the first time
- **THEN** the system calls the appropriate detail endpoint and displays the returned data (including cast) in the expanded panel

#### Scenario: Subsequent expand of catalog card uses cached data
- **WHEN** the user collapses and re-expands a catalog card that was already fetched
- **THEN** no new network request is made and the previously fetched detail (including cast) is shown immediately

#### Scenario: Catalog affordances remain functional during and after fetch
- **WHEN** a catalog card is in an expanded state (fetching or fetched)
- **THEN** the Edit and "+ Watchlist" buttons (movies) or Edit button (TV) remain visible and independently tappable
