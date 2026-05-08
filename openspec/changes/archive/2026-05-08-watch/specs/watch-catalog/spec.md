## Purpose

Covers the global movie and TV series catalog: genre tag management, adding titles, browsing and searching, and updating catalog metadata. All routes require authentication.

## ADDED Requirements

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
The system SHALL allow any authenticated user to add a movie to the global catalog. A movie SHALL have a title and MAY include runtime in minutes, a description, a streaming platform, and one or more genre tag IDs.

#### Scenario: Add a movie with full metadata
- **WHEN** an authenticated user calls `POST /api/watch/movies` with a title, runtime, description, streaming, and `tagIds`
- **THEN** a `movies` row is created, `movie_tags` rows are inserted for each tag ID, and the new movie is returned

#### Scenario: Add a movie with title only
- **WHEN** an authenticated user calls `POST /api/watch/movies` with only a `title`
- **THEN** a `movies` row is created with all optional fields null and no tag rows inserted

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
- **THEN** the response includes the movie's title, runtime, description, streaming, tags, and series memberships

#### Scenario: Get non-existent movie returns 404
- **WHEN** an authenticated user calls `GET /api/watch/movies/:id` for an ID that does not exist
- **THEN** the server returns 404

#### Scenario: Update movie metadata
- **WHEN** an authenticated user calls `PUT /api/watch/movies/:id` with updated fields
- **THEN** the `movies` row is updated and the updated movie is returned

#### Scenario: Update movie tags replaces tag set
- **WHEN** an authenticated user calls `PUT /api/watch/movies/:id` with a `tagIds` array
- **THEN** existing `movie_tags` rows are deleted and new rows are inserted for the provided tag IDs

### Requirement: Add a TV series to the catalog
The system SHALL allow any authenticated user to add a TV series to the global catalog. A TV series SHALL have a title and MAY include a streaming platform, a typical episode runtime in minutes, and one or more genre tag IDs.

#### Scenario: Add a TV series with full metadata
- **WHEN** an authenticated user calls `POST /api/watch/tv` with a title, streaming, episode runtime, and `tagIds`
- **THEN** a `tv_series` row is created, `tv_series_tags` rows are inserted, and the new series is returned

#### Scenario: Add a TV series with title only
- **WHEN** an authenticated user calls `POST /api/watch/tv` with only a `title`
- **THEN** a `tv_series` row is created with all optional fields null

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
- **THEN** the response includes the series' title, streaming, episode runtime, and tags

#### Scenario: Get non-existent TV series returns 404
- **WHEN** an authenticated user calls `GET /api/watch/tv/:id` for an ID that does not exist
- **THEN** the server returns 404

#### Scenario: Update TV series metadata
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with updated fields
- **THEN** the `tv_series` row is updated and the updated series is returned

#### Scenario: Update TV series tags replaces tag set
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with a `tagIds` array
- **THEN** existing `tv_series_tags` rows are deleted and new rows are inserted for the provided tag IDs
