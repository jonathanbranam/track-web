## Purpose

Covers external catalog search and import via the TMDB API: API key configuration, title and person filmography search, server-side response caching, fuzzy duplicate detection, genre normalization, catalog import, and admin CLI tooling. All routes require authentication.

## Requirements

### Requirement: TMDB API key configuration
The system SHALL validate `TMDB_API_KEY` (the TMDB API Read Access Token / JWT) as an optional env var at startup. When absent, `GET /api/watch/external/search` and `POST /api/watch/external/import` SHALL return 503 with a descriptive error message. All other application routes SHALL continue to function normally. The token SHALL be sent as `Authorization: Bearer <token>` and SHALL NOT appear in URLs or server logs.

#### Scenario: Search returns 503 when API key is absent
- **WHEN** `TMDB_API_KEY` is not set and an authenticated user calls `GET /api/watch/external/search`
- **THEN** the server returns 503 with an error message indicating the API key is not configured

#### Scenario: App starts normally without API key
- **WHEN** `TMDB_API_KEY` is not set
- **THEN** the server starts successfully and all non-TMDB routes continue to function

### Requirement: External title search
The system SHALL expose `GET /api/watch/external/search?type=movie|tv&q=<title>` for authenticated users. The route SHALL query TMDB's title search endpoint (`/3/search/movie` or `/3/search/tv`), normalize results to the local schema, run fuzzy duplicate detection against the local catalog, and return up to 50 results.

Each result SHALL include: `tmdbId`, `title`, `releaseYear` (4-digit integer extracted from `release_date` for movies or `first_air_date` for TV; null if absent), `runtimeMinutes` (movies only), `seasonCount` (TV only), `overview`, `genres` (array of local tag names after normalization), `isDuplicate` (boolean), `localTitle` (string, present when `isDuplicate` is true), `voteAverage` (number, optional — TMDB vote average 0–10, absent for stale cache entries), and `popularity` (number, optional — TMDB popularity score, absent for stale cache entries).

#### Scenario: Title search returns normalized results
- **WHEN** an authenticated user calls `GET /api/watch/external/search?type=movie&q=dune`
- **THEN** the response contains up to 50 results each with `tmdbId`, `title`, `releaseYear`, `runtimeMinutes`, `genres`, and `isDuplicate`

#### Scenario: Release year is extracted from TMDB date field
- **WHEN** a TMDB result has `release_date: "2021-09-03"` (movie) or `first_air_date: "2019-04-14"` (TV)
- **THEN** the normalized result includes `releaseYear: 2021` or `releaseYear: 2019` respectively

#### Scenario: Missing TMDB date field yields null release year
- **WHEN** a TMDB result has no `release_date` or `first_air_date`
- **THEN** the normalized result includes `releaseYear: null`

### Requirement: External title search result shape
Each result returned by `GET /api/watch/external/search` SHALL include: `tmdbId`, `title`, `releaseYear` (4-digit integer extracted from `release_date` for movies or `first_air_date` for TV; null if absent), `runtimeMinutes` (movies only), `seasonCount` (TV only), `overview`, `genres` (array of local tag names after normalization), `isDuplicate` (boolean), `localTitle` (string, present when `isDuplicate` is true), `voteAverage` (number, optional — TMDB vote average 0–10, absent for stale cache entries), and `popularity` (number, optional — TMDB popularity score, absent for stale cache entries).

#### Scenario: Title search result includes voteAverage and popularity
- **WHEN** an authenticated user calls `GET /api/watch/external/search` and the response is fetched fresh from TMDB
- **THEN** each result includes `voteAverage` and `popularity` as numeric fields

#### Scenario: Stale cache entry omits voteAverage and popularity
- **WHEN** a cached result was written before this change was deployed and `voteAverage`/`popularity` are absent
- **THEN** the result is returned without those fields; callers treat them as optional and the system does not error

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

### Requirement: Two-level server-side file cache for TMDB responses
The system SHALL cache TMDB API responses using two separate file stores under `data/cache/external/`:

**Query cache** (`data/cache/external/queries/`): One file per unique query, named `{sha1}.json` where SHA1 is computed from `{type}:{mode}:{normalized_query}` (normalized = trimmed, lowercased). Each file is a JSON object with `cachedAt` (ISO 8601 UTC) and `ids` (array of TMDB integer IDs in result order). TTL is 7 days.

**Title cache** (`data/cache/external/titles/`): One file per TMDB title, named `{tmdbId}.json`. Each file is a JSON object with `updatedAt` (ISO 8601 UTC) and `data` (the full normalized result object for that title). Title cache entries have no independent TTL — they are created or overwritten whenever fresh TMDB data is received for that ID via any query.

On a cache **hit** (query file present, `cachedAt` within 7 days): read the `ids` array, load each corresponding title file from `titles/`, and return the assembled results in `ids` order. The TMDB API SHALL NOT be called.

On a cache **miss** (query file absent or `cachedAt` older than 7 days): fetch fresh results from TMDB, upsert each result's normalized data into `titles/{tmdbId}.json` (write or overwrite), write a new query file containing the ordered array of IDs, and return the results.

#### Scenario: Repeated search uses cached response
- **WHEN** an authenticated user calls `GET /api/watch/external/search` with a query already cached within 7 days
- **THEN** the server reads the query cache for the ID list, loads each title from the title cache, and returns assembled results without calling the TMDB API

#### Scenario: Expired query cache triggers re-fetch and title cache update
- **WHEN** a query cache file's `cachedAt` is more than 7 days ago
- **THEN** the server fetches fresh results from TMDB, overwrites each title's entry in `titles/`, writes a new query cache file, and returns the new results

#### Scenario: Title cache is shared across queries
- **WHEN** the same TMDB title appears in two different query results
- **THEN** both queries reference the same `titles/{tmdbId}.json` file; re-fetching either query updates that shared entry

#### Scenario: Cache key is case-insensitive
- **WHEN** an authenticated user searches for "Dune" and later for "dune"
- **THEN** both searches resolve to the same query cache file

### Requirement: Fuzzy duplicate detection
Before returning search results, the system SHALL compare each external title against all local catalog titles of the matching type (movies vs TV). A result with a normalized Levenshtein distance ≤ 0.15 from any local title SHALL be marked `isDuplicate: true` with `localTitle` set to the matching local title. Normalization SHALL: (1) lowercase, (2) strip leading "the ", "a ", or "an ", (3) strip non-alphanumeric characters.

#### Scenario: Exact local title match is flagged as duplicate
- **WHEN** a TMDB result title exactly matches a local catalog title (after normalization)
- **THEN** the result has `isDuplicate: true` and `localTitle` set to the matching local title

#### Scenario: Dissimilar title is not flagged
- **WHEN** a TMDB result title has a normalized Levenshtein distance > 0.15 from all local titles
- **THEN** the result has `isDuplicate: false`

#### Scenario: Duplicate detection is type-scoped
- **WHEN** searching with `type=movie`
- **THEN** only local movie titles are compared; TV series titles are excluded from duplicate detection

### Requirement: Genre normalization
The system SHALL map TMDB genre names to local tag names via a static lookup table in `src/utils/tmdb.ts`. Required mappings: "Science Fiction" → "Sci-Fi", "History" → "Historical", "Music" → "Musical", "Action & Adventure" → "Action", "Sci-Fi & Fantasy" → "Sci-Fi". Genre names without a mapping SHALL be included in results unchanged.

#### Scenario: Known TMDB genre name is mapped to local tag name
- **WHEN** a TMDB result includes genre "Science Fiction"
- **THEN** the normalized result's `genres` array contains "Sci-Fi"

#### Scenario: Unmapped TMDB genre is passed through unchanged
- **WHEN** a TMDB result includes a genre with no entry in the lookup table
- **THEN** the genre name is included in `genres` as-is

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

### Requirement: Admin CLI external search command
The system SHALL provide an admin CLI subcommand `watch external search` accepting `--q <query>` (required), `--type movie|tv` (required), `--person` flag (person filmography mode), and `--json` flag (output raw JSON). Default output SHALL be a formatted table including title, year, runtime or season count, and duplicate status.

#### Scenario: Admin table output
- **WHEN** `npm run admin watch external search --q "dune" --type movie` is run
- **THEN** results are printed as a formatted table with title, year, runtime, and duplicate status columns

#### Scenario: Admin JSON output
- **WHEN** `npm run admin watch external search --q "dune" --type movie --json` is run
- **THEN** results are printed as raw JSON

#### Scenario: Admin person filmography search
- **WHEN** `npm run admin watch external search --q "nolan" --type movie --person` is run
- **THEN** that person's movie credits (cast + director) are returned sorted by effective billing
