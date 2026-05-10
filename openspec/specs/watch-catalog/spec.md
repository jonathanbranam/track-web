## Purpose

Covers the global movie and TV series catalog: genre tag management, adding titles, browsing and searching, and updating catalog metadata. All routes require authentication.

## Requirements

### Requirement: Genre tags are pre-seeded on server startup
The system SHALL insert a standard set of genre tags into the `tags` table when the server starts. The seed operation SHALL use `INSERT OR IGNORE` so it is safe to run on an existing database that already contains some or all of the tags. The following 20 tags SHALL be seeded with `category = 'genre'`: Action, Adventure, Animation, Anime, Biography, Comedy, Crime, Documentary, Drama, Fantasy, Historical, Horror, Musical, Mystery, Romance, Sci-Fi, Sport, Superhero, Thriller, Western.

#### Scenario: Fresh database is seeded on first startup
- **WHEN** the server starts against a database with an empty `tags` table
- **THEN** all 20 genre tags are present in the `tags` table with `category = 'genre'`

#### Scenario: Seed is idempotent on restart
- **WHEN** the server starts against a database that already contains all seeded tags
- **THEN** no duplicate rows are inserted and the existing tags are unchanged

#### Scenario: Seed does not overwrite user-added tags
- **WHEN** the server starts against a database that contains the seeded tags plus additional user-created genre tags
- **THEN** only the standard 20 tags are affected by the seed and the user-created tags remain

### Requirement: Genre tag management
The system SHALL provide a shared set of genre tags for categorizing movies and TV series. Any authenticated user SHALL be able to list existing genre tags and create new ones. Tags are stored in the `tags` table with `category = 'genre'`.

#### Scenario: List genre tags
- **WHEN** an authenticated user calls `GET /api/watch/tags`
- **THEN** the response contains all genre tags with their `id` and `name`

#### Scenario: Create a genre tag
- **WHEN** an authenticated user calls `POST /api/watch/tags` with a unique `name`
- **THEN** a new `tags` row is inserted with `category = 'genre'` and the tag is returned

#### Scenario: Duplicate tag name rejected
- **WHEN** `POST /api/watch/tags` is called with a `name` that already exists
- **THEN** the server returns 409

### Requirement: Add a movie to the catalog
The system SHALL allow any authenticated user to add a movie to the global catalog. A movie SHALL have a title and MAY include runtime in minutes, a description, a streaming platform, a release year, and one or more genre tag IDs.

#### Scenario: Add a movie with full metadata
- **WHEN** an authenticated user calls `POST /api/watch/movies` with a title, runtime, description, streaming, release year, and `tagIds`
- **THEN** a `movies` row is created, `movie_tags` rows are inserted for each tag ID, and the new movie (including `release_year`) is returned

#### Scenario: Add a movie with title only
- **WHEN** an authenticated user calls `POST /api/watch/movies` with only a `title`
- **THEN** a `movies` row is created with all optional fields null and no tag rows inserted

#### Scenario: Add a movie with release year
- **WHEN** an authenticated user calls `POST /api/watch/movies` with a `title` and `releaseYear` (e.g., `2024`)
- **THEN** a `movies` row is created with `release_year` set to the provided value and the new movie is returned with `releaseYear` in the response

### Requirement: Browse and search the movie catalog
The system SHALL allow any authenticated user to list all movies, with optional title search and tag filtering.

#### Scenario: List all movies
- **WHEN** an authenticated user calls `GET /api/watch/movies`
- **THEN** the response contains all movies in the catalog with their tags

#### Scenario: Search movies by title
- **WHEN** an authenticated user calls `GET /api/watch/movies?q=inception`
- **THEN** only movies whose title contains "inception" (case-insensitive) are returned

#### Scenario: Filter movies by tag
- **WHEN** an authenticated user calls `GET /api/watch/movies?tag=sci-fi`
- **THEN** only movies tagged with the sci-fi genre tag are returned

### Requirement: Get and update a movie
The system SHALL allow any authenticated user to retrieve a movie's full details and update its metadata or tags.

#### Scenario: Get a movie
- **WHEN** an authenticated user calls `GET /api/watch/movies/:id`
- **THEN** the response includes the movie's title, runtime, description, streaming, release year, tags, and series memberships

#### Scenario: Get non-existent movie returns 404
- **WHEN** an authenticated user calls `GET /api/watch/movies/:id` for an ID that does not exist
- **THEN** the server returns 404

#### Scenario: Update movie metadata
- **WHEN** an authenticated user calls `PUT /api/watch/movies/:id` with updated fields including an optional `releaseYear`
- **THEN** the `movies` row is updated and the updated movie (including `release_year`) is returned

#### Scenario: Update movie tags replaces tag set
- **WHEN** an authenticated user calls `PUT /api/watch/movies/:id` with a `tagIds` array
- **THEN** existing `movie_tags` rows are deleted and new rows are inserted for the provided tag IDs

#### Scenario: Clear movie release year
- **WHEN** an authenticated user calls `PUT /api/watch/movies/:id` with `releaseYear: null`
- **THEN** the `release_year` column is set to null and the updated movie reflects this

### Requirement: Add a TV series to the catalog
The system SHALL allow any authenticated user to add a TV series to the global catalog. A TV series SHALL have a title and MAY include a streaming platform, a typical episode runtime in minutes, a description, a season count, a release year, and one or more genre tag IDs.

#### Scenario: Add a TV series with full metadata
- **WHEN** an authenticated user calls `POST /api/watch/tv` with a title, streaming, episode runtime, description, season count, release year, and `tagIds`
- **THEN** a `tv_series` row is created, `tv_series_tags` rows are inserted, and the new series (including `release_year`) is returned

#### Scenario: Add a TV series with title only
- **WHEN** an authenticated user calls `POST /api/watch/tv` with only a `title`
- **THEN** a `tv_series` row is created with all optional fields null

#### Scenario: Add a TV series with release year
- **WHEN** an authenticated user calls `POST /api/watch/tv` with a `title` and `releaseYear` (e.g., `2019`)
- **THEN** a `tv_series` row is created with `release_year` set to the provided value and the new series is returned with `releaseYear` in the response

### Requirement: Browse and search the TV catalog
The system SHALL allow any authenticated user to list all TV series, with optional title search and tag filtering.

#### Scenario: List all TV series
- **WHEN** an authenticated user calls `GET /api/watch/tv`
- **THEN** the response contains all TV series in the catalog with their tags

#### Scenario: Search TV series by title
- **WHEN** an authenticated user calls `GET /api/watch/tv?q=breaking`
- **THEN** only TV series whose title contains "breaking" (case-insensitive) are returned

#### Scenario: Filter TV series by tag
- **WHEN** an authenticated user calls `GET /api/watch/tv?tag=drama`
- **THEN** only TV series tagged with the drama genre tag are returned

### Requirement: Get and update a TV series
The system SHALL allow any authenticated user to retrieve a TV series' full details and update its metadata or tags.

#### Scenario: Get a TV series
- **WHEN** an authenticated user calls `GET /api/watch/tv/:id`
- **THEN** the response includes the series' title, streaming, episode runtime, description, season count, release year, and tags

#### Scenario: Get non-existent TV series returns 404
- **WHEN** an authenticated user calls `GET /api/watch/tv/:id` for an ID that does not exist
- **THEN** the server returns 404

#### Scenario: Update TV series metadata
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with updated fields including an optional `releaseYear`
- **THEN** the `tv_series` row is updated and the updated series (including `release_year`) is returned

#### Scenario: Update TV series tags replaces tag set
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with a `tagIds` array
- **THEN** existing `tv_series_tags` rows are deleted and new rows are inserted for the provided tag IDs

#### Scenario: Clear TV series release year
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with `releaseYear: null`
- **THEN** the `release_year` column is set to null and the updated series reflects this

### Requirement: Add a TV series with full metadata from the UI
The system SHALL provide an inline "Add Series" form in the TV catalog UI that collects all supported fields: title (required), streaming platform, episode runtime in minutes, season count, release year, description, and one or more genre tags. The form SHALL load available genre tags from the API and display them as selectable toggles. The episode runtime, season count, and release year fields SHALL accept numeric input only and be converted to integers before submission.

#### Scenario: Add form exposes all fields
- **WHEN** the user opens the Add Series form on the TV catalog page
- **THEN** the form displays fields for title, streaming platform, episode runtime (minutes), season count, release year, description, and a set of genre tag toggles

#### Scenario: Submit with all fields populated
- **WHEN** the user fills in title, streaming, episode runtime, season count, release year, description, and selects one or more genre tags and submits
- **THEN** `POST /api/watch/tv` is called with title, streaming, episodeRuntimeMinutes (as integer), seasonCount (as integer), releaseYear (as integer), description, and tagIds
- **AND** the new series appears in the catalog list with its tags

#### Scenario: Submit with title only
- **WHEN** the user fills in only the title and submits
- **THEN** `POST /api/watch/tv` is called with only the title
- **AND** the new series appears in the catalog list without tags or metadata

#### Scenario: Numeric fields are rejected if non-numeric
- **WHEN** the user enters a non-numeric value in the episode runtime, season count, or release year field and submits
- **THEN** the form does not submit and the affected field is treated as empty (null)

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

### Requirement: Edit an existing TV series from the UI
The system SHALL allow the user to edit any TV series in the catalog from the TV catalog page. Each series card SHALL display an "Edit" affordance. Activating it SHALL replace the card in-place with an edit form pre-populated with the series' current title, streaming platform, episode runtime, season count, release year, description, and selected genre tags. Saving SHALL call `PUT /api/watch/tv/:id` and restore the card view with updated data. Cancelling SHALL restore the original card without making changes.

#### Scenario: Edit affordance is visible on each series card
- **WHEN** the TV catalog page is loaded
- **THEN** each series card displays an Edit button

#### Scenario: Edit form is pre-populated
- **WHEN** the user activates Edit on a series card
- **THEN** the card is replaced by an edit form with title, streaming, episode runtime, season count, release year, description, and genre tag toggles all pre-populated from the series' current data

#### Scenario: Save submits updated fields
- **WHEN** the user modifies one or more fields and submits the edit form
- **THEN** `PUT /api/watch/tv/:id` is called with all form values (including unchanged fields)
- **AND** the card is restored showing the updated series data

#### Scenario: Cancel discards changes
- **WHEN** the user activates Cancel on the edit form
- **THEN** the edit form is dismissed and the original series card is restored with no API call made

#### Scenario: Only one series is in edit mode at a time
- **WHEN** the user activates Edit on a second series while another is already in edit mode
- **THEN** the first edit form is dismissed and the second series' edit form opens
