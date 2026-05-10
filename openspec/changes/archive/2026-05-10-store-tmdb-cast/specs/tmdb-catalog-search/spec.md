**App**: watch

## MODIFIED Requirements

### Requirement: Import a TMDB result to catalog
The system SHALL expose `POST /api/watch/external/import` for authenticated users. The request body SHALL include `type` ("movie" | "tv") and a result object (matching the search result shape). The route SHALL: (1) resolve each genre name to a local tag ID, calling `createTag` for any genre not already in the `tags` table; (2) call `createMovie` or `createSeries` with all normalized fields including `releaseYear`; (3) fetch credits from TMDB (`GET /3/movie/{tmdbId}/credits` or `GET /3/tv/{tmdbId}/credits`) and store the director and top 30 cast members (by `cast.order`) via the cast repository; (4) return the created local record. Tag resolution SHALL occur once per request and reuse IDs across genres in the same import. The credits fetch SHALL be best-effort: if it fails, the title is still created and returned without cast data.

#### Scenario: Import creates a movie with release year
- **WHEN** an authenticated user calls `POST /api/watch/external/import` with `type: "movie"` and a result including `releaseYear: 2021`
- **THEN** a `movies` row is created with `release_year: 2021`, all other fields populated, genre tags resolved and associated, and the new movie is returned

#### Scenario: Import creates a TV series with release year
- **WHEN** an authenticated user calls `POST /api/watch/external/import` with `type: "tv"` and a result including `releaseYear: 2019`
- **THEN** a `tv_series` row is created with `release_year: 2019`, all fields populated, genre tags associated, and the new series is returned

#### Scenario: Unmapped genre is created as a new tag on import
- **WHEN** an import request includes a genre name not present in the local `tags` table
- **THEN** `createTag` is called for that genre and the resulting tag ID is associated with the new catalog entry

#### Scenario: Pre-existing genre tag is reused
- **WHEN** an import request includes a genre name already in the local `tags` table
- **THEN** the existing tag ID is used and no duplicate tag row is created

#### Scenario: Cast is stored after successful import
- **WHEN** an authenticated user imports a movie and the TMDB credits endpoint returns cast and crew data
- **THEN** the director (if present) and up to 30 cast members (by `cast.order`) are stored in `movie_cast`, each linked to the correct `movies.id`

#### Scenario: Credits failure does not fail the import
- **WHEN** the TMDB credits endpoint returns an error during import
- **THEN** the movie or series row is still created and returned with a 201 status; no cast rows are inserted
