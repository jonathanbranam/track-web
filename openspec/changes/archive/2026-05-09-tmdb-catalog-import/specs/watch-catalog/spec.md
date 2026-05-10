**App**: server, client-watch

## ADDED Requirements

### Requirement: TMDB ID column on catalog tables
Both the `movies` and `tv_series` tables SHALL have a nullable integer `tmdb_id` column added via a schema migration in `db.ts`. The `Movie` and `TvSeries` TypeScript interfaces SHALL expose `tmdbId` as `number | null`. When a catalog entry is imported from TMDB via `POST /api/watch/external/import`, the server SHALL write the `tmdbId` from the import payload into the `tmdb_id` column. Entries created manually (via `POST /api/watch/movies` or `POST /api/watch/tv`) SHALL leave `tmdb_id` as `null`.

#### Scenario: Import from TMDB stores TMDB ID on movie
- **WHEN** an authenticated user calls `POST /api/watch/external/import` with `type: "movie"` and a result that includes `tmdbId: 438631`
- **THEN** the created `movies` row has `tmdb_id = 438631` and the returned Movie object includes `tmdbId: 438631`

#### Scenario: Import from TMDB stores TMDB ID on TV series
- **WHEN** an authenticated user calls `POST /api/watch/external/import` with `type: "tv"` and a result that includes `tmdbId: 1399`
- **THEN** the created `tv_series` row has `tmdb_id = 1399` and the returned TvSeries object includes `tmdbId: 1399`

#### Scenario: Manual catalog entry has null TMDB ID
- **WHEN** an authenticated user creates a movie via `POST /api/watch/movies` without a `tmdbId`
- **THEN** the created `movies` row has `tmdb_id = null` and the returned Movie object has `tmdbId: null`

### Requirement: TMDB import panel on movie catalog page
The movie catalog page SHALL display a "+ Search" button in the same row as the existing Add button. Activating it SHALL open an import panel that slides in below the page header and above the catalog list (no modal overlay). The panel SHALL contain: a [Title | Person] toggle, a text input and Search button, a scrollable result list (max 50 items) where each row shows a checkbox, title, release year, runtime, and a duplicate badge; and an "Add N Selected" button that is disabled when zero results are checked. Selecting results and clicking "Add N Selected" SHALL call `POST /api/watch/external/import` with `type: "movie"` for each selected result sequentially, then refresh the catalog list.

#### Scenario: Import panel opens on movie catalog page
- **WHEN** the user activates the "+ Search" button on the movie catalog page
- **THEN** the TMDB import panel slides in below the page header, above the catalog list, without a modal overlay

#### Scenario: Title search fetches movie results
- **WHEN** the user enters a query in Title mode and clicks Search
- **THEN** `GET /api/watch/external/search?type=movie&q=<query>` is called and results are displayed with title, release year, runtime, and any duplicate badge

#### Scenario: Person search fetches movie filmography
- **WHEN** the user switches to Person mode, enters a name, and clicks Search
- **THEN** `GET /api/watch/external/search?type=movie&q=<name>&person=true` is called and credits are displayed

#### Scenario: Duplicate results are visually distinguished
- **WHEN** a search result has `isDuplicate: true`
- **THEN** the row is displayed grayed-out with a visible duplicate badge

#### Scenario: "Add N Selected" imports movies and refreshes catalog
- **WHEN** the user checks one or more results and clicks "Add N Selected"
- **THEN** `POST /api/watch/external/import` is called with `type: "movie"` for each checked result and the movie catalog list refreshes to include the new entries

#### Scenario: "Add N Selected" is disabled with no selection
- **WHEN** no result checkboxes are checked in the import panel
- **THEN** the "Add N Selected" button is disabled

### Requirement: TMDB import panel on TV catalog page
The TV catalog page SHALL display the same "+ Search" affordance as the movie catalog page. The panel SHALL use the same structure (Title/Person toggle, query input, result list, "Add N Selected") except that each result row SHALL show season count instead of runtime. Importing SHALL call `POST /api/watch/external/import` with `type: "tv"` for each selected result.

#### Scenario: Import panel opens on TV catalog page
- **WHEN** the user activates the "+ Search" button on the TV catalog page
- **THEN** the TMDB import panel opens for TV series search

#### Scenario: TV results display season count instead of runtime
- **WHEN** TV series results are shown in the import panel
- **THEN** each result row displays season count (e.g., "4 seasons") rather than runtime in minutes

#### Scenario: Importing TV results uses correct type
- **WHEN** the user selects TV results and clicks "Add N Selected"
- **THEN** `POST /api/watch/external/import` is called with `type: "tv"` for each selected result and the TV catalog list refreshes
