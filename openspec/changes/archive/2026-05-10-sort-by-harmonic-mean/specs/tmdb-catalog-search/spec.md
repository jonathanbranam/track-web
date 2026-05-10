**App**: client-watch

## MODIFIED Requirements

### Requirement: External person filmography search
The system SHALL support `GET /api/watch/external/search?type=movie|tv&q=<person name>&person=true` for authenticated users. The route SHALL call `GET /3/search/person` to find a person by name, then `GET /3/person/{id}/movie_credits` or `GET /3/person/{id}/tv_credits` to retrieve their credits. Results SHALL be filtered to `cast` and director `crew` only, deduplicated by TMDB ID, and capped at 50 items.

Results SHALL be sorted according to the active `TMDB_PERSON_SORT` mode (see Requirement: Person filmography sort modes). Items with higher scores appear first; `billing` mode sorts ascending by billing order.

#### Scenario: Person filmography returns credits in configured sort order
- **WHEN** an authenticated user calls `GET /api/watch/external/search?type=movie&q=nolan&person=true`
- **THEN** the response contains movies where that person was cast or director, sorted according to the active `TMDB_PERSON_SORT` mode, capped at 50

#### Scenario: Actor-director credits are deduplicated
- **WHEN** a person appears in both `cast` and `crew` (as director) for the same film
- **THEN** the film appears only once in results, retaining the lower effective billing value before sorting

#### Scenario: Non-cast and non-director crew credits are excluded
- **WHEN** a person has producer, editor, or other non-director crew credits
- **THEN** those credits are not included in the results

#### Scenario: Zero vote_average is floored before score computation
- **WHEN** a result has `vote_average: 0`
- **THEN** the normalized value is treated as 0.001 (not 0), preventing division by zero in harmonic mean modes

#### Scenario: Zero popularity is floored before score computation
- **WHEN** a result has `popularity: 0`
- **THEN** the normalized value is treated as 0.001, preventing division by zero in harmonic mean modes

### Requirement: Person filmography sort modes
The system SHALL support five interchangeable sort modes for person filmography results, selected by the `TMDB_PERSON_SORT` environment variable. The default mode when the variable is absent or invalid SHALL be `decay`. Changing the variable takes effect immediately without a server restart or cache clear, because the active sort mode is included in the query cache key.

The five modes are:

- **`billing`** — ascending by effective billing order (original behaviour; directors = 0, cast by `cast.order`)
- **`harmonic`** — descending by two-way harmonic mean of `norm_vote` and `norm_pop`
- **`decay`** *(default)* — descending by two-way harmonic mean multiplied by a billing decay factor `1 / (1 + 0.05 × billing)`
- **`three-way`** — descending by three-way harmonic mean of `norm_vote`, `norm_pop`, and `norm_billing` where `norm_billing = 1 / (1 + billing)`
- **`geometric`** — descending by weighted geometric mean `norm_vote^0.5 × norm_pop^0.3 × norm_billing^0.2`

Normalisation rules apply to all score-based modes:
- `norm_vote = vote_average / 10` (TMDB scale is 0–10)
- `norm_pop = popularity / max(popularity in result set)`
- `norm_billing = 1 / (1 + billing)`
- All normalised values are floored at 0.001 before use in any formula

#### Scenario: Default sort mode is decay when env var is absent
- **WHEN** `TMDB_PERSON_SORT` is not set
- **THEN** person filmography results are sorted using the `decay` algorithm

#### Scenario: Invalid sort mode falls back to decay
- **WHEN** `TMDB_PERSON_SORT` is set to an unrecognised value
- **THEN** the system falls back to `decay` and does not error

#### Scenario: Sort mode is included in query cache key
- **WHEN** `TMDB_PERSON_SORT` is changed from `decay` to `harmonic`
- **THEN** the next person search uses a different query cache key and fetches or serves a result set sorted in `harmonic` order, without requiring a cache clear

#### Scenario: Billing mode produces ascending billing order
- **WHEN** `TMDB_PERSON_SORT=billing` and a person filmography search is executed
- **THEN** results are sorted ascending by effective billing (directors first at 0, then cast by order)

#### Scenario: Decay mode penalises high billing numbers
- **WHEN** `TMDB_PERSON_SORT=decay` and two films have equal harmonic scores but different billing orders
- **THEN** the film with the lower billing order ranks higher due to a larger decay multiplier

### Requirement: External title search result shape
Each result returned by `GET /api/watch/external/search` SHALL include: `tmdbId`, `title`, `releaseYear` (4-digit integer extracted from `release_date` for movies or `first_air_date` for TV; null if absent), `runtimeMinutes` (movies only), `seasonCount` (TV only), `overview`, `genres` (array of local tag names after normalization), `isDuplicate` (boolean), `localTitle` (string, present when `isDuplicate` is true), `voteAverage` (number, optional — TMDB vote average 0–10, absent for stale cache entries), and `popularity` (number, optional — TMDB popularity score, absent for stale cache entries).

#### Scenario: Title search result includes voteAverage and popularity
- **WHEN** an authenticated user calls `GET /api/watch/external/search` and the response is fetched fresh from TMDB
- **THEN** each result includes `voteAverage` and `popularity` as numeric fields

#### Scenario: Stale cache entry omits voteAverage and popularity
- **WHEN** a cached result was written before this change was deployed and `voteAverage`/`popularity` are absent
- **THEN** the result is returned without those fields; callers treat them as optional and the system does not error
