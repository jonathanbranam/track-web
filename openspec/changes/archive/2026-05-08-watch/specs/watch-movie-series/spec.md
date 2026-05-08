## Purpose

Covers named movie series groupings (e.g., MCU) with defined watch-order positions. A movie can belong to multiple series. All routes require authentication.

## ADDED Requirements

### Requirement: Create and list named movie series
The system SHALL allow any authenticated user to create a named movie series and list all series with their ordered movie entries.

#### Scenario: Create a series
- **WHEN** an authenticated user calls `POST /api/watch/movies/series` with a `name`
- **THEN** a new `movie_series` row is created and the series is returned

#### Scenario: List all movie series
- **WHEN** an authenticated user calls `GET /api/watch/movies/series`
- **THEN** the response contains all movie series, each with its name and ordered list of movie entries

### Requirement: Assign movies to a series with watch-order positions
The system SHALL allow any authenticated user to assign movies to a series with integer watch-order positions. A movie MAY belong to multiple series simultaneously. A movie SHALL appear at most once per series.

#### Scenario: Assign movies to a series
- **WHEN** an authenticated user calls `PUT /api/watch/movies/series/:id` with an `entries` array of `{ movieId, position }` objects
- **THEN** `movie_series_entries` rows are upserted to match the provided entries

#### Scenario: Movie belongs to multiple series
- **WHEN** a movie is assigned to two different series
- **THEN** a `movie_series_entries` row exists for each series independently

#### Scenario: Duplicate movie in same series rejected
- **WHEN** the `entries` array contains the same `movieId` more than once
- **THEN** the server returns 400

### Requirement: Update series name or entry order
The system SHALL allow updating a series name and reordering or removing its movie entries.

#### Scenario: Rename a series
- **WHEN** an authenticated user calls `PUT /api/watch/movies/series/:id` with a new `name`
- **THEN** `movie_series.name` is updated

#### Scenario: Reorder movies in a series
- **WHEN** an authenticated user calls `PUT /api/watch/movies/series/:id` with a reordered `entries` array
- **THEN** the `position` values in `movie_series_entries` are updated to match and the series is returned in the new order
