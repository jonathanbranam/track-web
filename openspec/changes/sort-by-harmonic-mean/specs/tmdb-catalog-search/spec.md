**App**: client-watch

## MODIFIED Requirements

### Requirement: External person filmography search
The system SHALL support `GET /api/watch/external/search?type=movie|tv&q=<person name>&person=true` for authenticated users. The route SHALL call `GET /3/search/person` to find a person by name, then `GET /3/person/{id}/movie_credits` or `GET /3/person/{id}/tv_credits` to retrieve their credits. Results SHALL be filtered to `cast` and director `crew` only, deduplicated by TMDB ID, and capped at 50 items.

Results SHALL be sorted descending by a harmonic mean score computed from two normalized TMDB signals:
- `vote_average` (0–10) normalized to [0, 1] by dividing by 10
- `popularity` (unbounded float) normalized to [0, 1] by dividing by the maximum `popularity` value in the result set

Each normalized value SHALL be floored at 0.001 before computing the harmonic mean to prevent division by zero. The harmonic mean score is `2 / (1/norm_vote + 1/norm_pop)`. Items with higher scores appear first.

#### Scenario: Person filmography returns credits sorted by harmonic mean
- **WHEN** an authenticated user calls `GET /api/watch/external/search?type=movie&q=nolan&person=true`
- **THEN** the response contains movies where that person was cast or director, sorted descending by harmonic mean of normalized vote_average and popularity, capped at 50

#### Scenario: Actor-director credits are deduplicated
- **WHEN** a person appears in both `cast` and `crew` (as director) for the same film
- **THEN** the film appears only once in results, retaining the lower effective billing value before sorting

#### Scenario: Non-cast and non-director crew credits are excluded
- **WHEN** a person has producer, editor, or other non-director crew credits
- **THEN** those credits are not included in the results

#### Scenario: Zero vote_average is floored before harmonic mean computation
- **WHEN** a result has `vote_average: 0`
- **THEN** the normalized value is treated as 0.001 (not 0), so the harmonic mean computation does not produce NaN or Infinity

#### Scenario: Zero popularity is floored before harmonic mean computation
- **WHEN** a result has `popularity: 0`
- **THEN** the normalized value is treated as 0.001, so the harmonic mean computation does not produce NaN or Infinity

### Requirement: External title search result shape
Each result returned by `GET /api/watch/external/search` SHALL include: `tmdbId`, `title`, `releaseYear` (4-digit integer extracted from `release_date` for movies or `first_air_date` for TV; null if absent), `runtimeMinutes` (movies only), `seasonCount` (TV only), `overview`, `genres` (array of local tag names after normalization), `isDuplicate` (boolean), `localTitle` (string, present when `isDuplicate` is true), `voteAverage` (number, optional — TMDB vote average 0–10, absent for stale cache entries), and `popularity` (number, optional — TMDB popularity score, absent for stale cache entries).

#### Scenario: Title search result includes voteAverage and popularity
- **WHEN** an authenticated user calls `GET /api/watch/external/search` and the response is fetched fresh from TMDB
- **THEN** each result includes `voteAverage` and `popularity` as numeric fields

#### Scenario: Stale cache entry omits voteAverage and popularity
- **WHEN** a cached result was written before this change was deployed and `voteAverage`/`popularity` are absent
- **THEN** the result is returned without those fields; callers treat them as optional and the system does not error
