## Why

Adding movies and TV series to the catalog today requires manual data entry. Integrating with TMDB (The Movie Database) lets users search a comprehensive external catalog and import titles in bulk, reducing friction when building out a watchlist or seeding the catalog before a watch event.

## What Changes

- New server route `GET /api/watch/external/search` queries TMDB by title or by person (actor/director filmography), normalizes results to local schema (including `releaseYear` extracted from TMDB's `release_date`/`first_air_date` fields), and returns up to 20–50 results
- Server-side file cache (one JSON file per unique query) avoids redundant TMDB API calls; TTL-based expiry (~7 days)
- Fuzzy duplicate detection compares external results against the local catalog using normalized Levenshtein distance; matches are flagged in results so the user knows what's already present
- Genre names from TMDB are mapped to local tag names via a static lookup table; unmapped genres create new tags automatically
- New "+ Search" entry point added near the existing Add button on the movie and TV catalog pages; opens an import panel with title/person toggle, result list with checkboxes, and an "Add Selected" action
- Import calls the existing `POST /api/watch/movies` and `POST /api/watch/tv` endpoints — no new write path

## Capabilities

### New Capabilities
- `tmdb-catalog-search`: External TMDB search (by title or person filmography), server-side JSON file cache, genre normalization, and fuzzy duplicate flagging

### Modified Capabilities
- `watch-catalog`: Add UI gains a "+ Search" affordance that opens the TMDB import panel alongside the existing manual add form

## Impact

- **New dependency**: TMDB API key (env var `TMDB_API_KEY`); requires a free TMDB account
- **New dependency**: fuzzy matching library (`fastest-levenshtein` or `fuse.js`)
- **New server file**: `src/routes/watch/external.ts`
- **New cache directory**: `data/cache/external/` (gitignored)
- **Client-watch frontend**: import panel component added to movie and TV catalog pages
- **No additional database schema changes** — `release_year` column already exists on `movies` and `tv_series` (added in the `add-release-year-to-movies-tv` change)
- **No changes to existing write endpoints**
