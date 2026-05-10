## Context

The watch catalog currently requires fully manual entry — title, runtime, description, streaming, and tags all typed by hand. Users building a watchlist or seeding candidates for a watch event have to look up metadata elsewhere and transcribe it. TMDB provides a free, comprehensive REST API covering movies and TV series with the metadata fields already in our schema.

The backend already has `IMovieRepository.createMovie` and `ITvRepository.createSeries`; this change adds a search layer on top of them, not a new write path.

## Goals / Non-Goals

**Goals:**
- Query TMDB by title or by person (actor/director filmography) from within the watch UI
- Cache TMDB responses on disk to avoid redundant API calls
- Flag results already present in the local catalog (fuzzy duplicate detection)
- Map TMDB genres to local tags, creating new tags as needed
- Add an admin CLI command for the search operation

**Non-Goals:**
- Auto-import (user always selects via checkboxes)
- Streaming platform detection (TMDB watch-provider data is region-specific and changes often; field left blank on import)
- Combined title + person filter in one query (deferred)
- Image/poster import
- Syncing or updating existing catalog entries from TMDB

## Decisions

### D1: TMDB as the external API

TMDB has a free tier (40 req/10s), covers both movies and TV, supports title search and person filmography lookups, and returns runtime, overview, genres, season count — all fields in the local schema. No viable alternative has the same breadth for free.

**TMDB endpoints used:**
- `GET /3/search/movie?query=...` — title search, movies
- `GET /3/search/tv?query=...` — title search, TV series
- `GET /3/search/person?query=...` — find person by name
- `GET /3/person/{id}/movie_credits` — person's filmography (movies)
- `GET /3/person/{id}/tv_credits` — person's filmography (TV)

API credentials stored in `TMDB_API_KEY` env var, validated in `src/env.ts` (optional — if absent, the search route returns 503 with a clear error message so the app still starts). The value is the **API Read Access Token** (the long JWT from TMDB's API settings, not the short API Key). It is sent as an `Authorization: Bearer <token>` header, not as a query parameter, so it does not appear in URLs or server logs.

### D2: Server-side file cache, one file per query

```
data/cache/external/
  movie_title_3b4c5d6e.json      ← SHA1 of normalized query params
  tv_title_a1b2c3d4.json
  movie_person_7f8a9b0c.json
  tv_person_2d3e4f5a.json
```

Each file is a JSON object:
```json
{
  "cachedAt": "2026-05-09T14:30:00.000Z",
  "results": [ ... ]
}
```

Cache key: SHA1 of `{type}:{mode}:{normalized_query}` where normalization = trim + lowercase.  
TTL: 7 days, checked on read. Expired files are re-fetched and overwritten; no background sweep needed at this usage scale.

**Alternatives considered:**
- Single manifest JSON: simpler but requires reading/parsing the whole file for each lookup; grows unboundedly.
- SQLite cache table: overkill, contradicts the "not in database" intent.
- In-memory only: lost on restart, cold cache on every server restart.

### D3: Fuzzy duplicate detection using Levenshtein distance

Before returning results to the client, compare each external title against all local catalog titles. Mark as duplicate if normalized Levenshtein distance ≤ 0.15 (i.e., ≤ 15% of the longer title's length).

Normalization before comparison:
1. Lowercase
2. Strip leading `the `, `a `, `an `
3. Strip non-alphanumeric characters (punctuation, colons, etc.)

Library: `fastest-levenshtein` — tiny (~1KB), zero dependencies, returns integer distance in O(min(m,n)) space.

Local catalog is fetched from `listMovies()` / `listSeries()` at search time (not cached separately — the local DB is fast enough and needs to be current).

Duplicate results are returned with `{ isDuplicate: true, localTitle: "..." }` so the client can display them grayed-out with a label.

### D4: Genre normalization via static lookup table

A ~20-entry lookup table in `src/utils/tmdb.ts` maps TMDB genre names to local tag names:

```
"Science Fiction" → "Sci-Fi"
"History"         → "Historical"
"Music"           → "Musical"
"Action & Adventure" → "Action"   (TMDB TV genre)
"Sci-Fi & Fantasy"   → "Sci-Fi"   (TMDB TV genre)
```

For unmapped TMDB genres, the server calls `createTag(name)` at import time (using the existing `IMovieRepository.createTag`). Tags are created only when the user actually imports a result, not during search.

### D5: No dedicated import endpoint

The client calls `POST /api/watch/movies` or `POST /api/watch/tv` directly for each selected result, one at a time. Results are capped at 20–50 per search so sequential calls are imperceptible. This reuses the existing validated write path and avoids a new `/import` route.

Genre tags are resolved/created on the client's behalf by the search results already including tag names; the client then fetches tag IDs via the existing `GET /api/watch/tags` before posting.

Actually: genre resolution (create-if-missing + return IDs) should happen server-side at import time to avoid a race and extra round trips. A single endpoint `POST /api/watch/external/import` that accepts a TMDB item and returns the created local record handles this cleanly without adding a new write pattern — it delegates to the existing repo methods after resolving tags.

`releaseYear` is extracted server-side from TMDB's `release_date` field (movies, format `"YYYY-MM-DD"`) and `first_air_date` field (TV) by taking the first 4 characters and parsing as an integer. It is included in both the search result payload (for display) and the import POST body (to populate the `release_year` column, which already exists on both tables).

### D6: UI placement — slide-in panel, not modal

The import panel slides in below the page header on the catalog page, above the existing list. It does not use a modal overlay so it remains usable on small screens without covering content. The "+ Search" button sits in the same row as the existing Add button.

Panel contains:
- Toggle: [Title ●] [Person ○]
- Text input + Search button
- Result list (max 20–50): checkbox, title, year, runtime or season count, duplicate badge
- "Add N Selected" button (disabled at 0)

### D8: Person credits — role filter and billing sort

`GET /3/person/{id}/movie_credits` (and `tv_credits`) returns two arrays:
- `cast` — roles where the person acted. Each item has `order` (0-based billing position; 0 = top-billed).
- `crew` — all other roles. Each item has `job` and `department`.

**Filtering:** Keep only `cast` items and `crew` items where `job === "Director"`. Producer, editor, and all other crew credits are discarded. This is applied server-side when processing the TMDB response; the API has no server-side role filter.

**Deduplication:** A person can appear in both arrays for the same film (actor-director). Deduplicate by TMDB `id`, keeping the lower effective billing value.

**Sort order:** Assign an `effectiveBilling` to each filtered credit:
- Director credits → `effectiveBilling = 0`
- Cast credits → `effectiveBilling = cast.order`

Sort ascending by `effectiveBilling` so films where the person had the most prominent role surface first. Cap results at 50 after filtering and sorting.

### D7: Admin CLI command

Per project convention, every API operation needs an admin CLI command:

```bash
npm run admin watch external search --q "dune" --type movie
npm run admin watch external search --q "nolan" --type movie --person
npm run admin watch external search --q "dune" --type movie --json
```

Outputs a table (or JSON with `--json`) of results including duplicate status.

## Risks / Trade-offs

**TMDB API key not configured** → Server returns 503 on search; existing catalog features unaffected. Clear error in response body.

**Cache files accumulate** → At typical usage (a few searches per day), even 365 days of caching produces <500 files. No eviction needed in v1. Worst case: delete `data/cache/external/`.

**Fuzzy threshold false positives** → "Dune" (2021) and "Dune: Part Two" (2024) have a normalized distance of ~0.44 — not flagged as duplicates. "Arrival" vs "Arrival" (same) = 0 — flagged. Threshold of 0.15 is conservative enough to avoid false positives while catching exact matches and minor variants.

**Person filmography size** → Some actors have 300+ credits. After filtering to actor/director roles only and sorting by effective billing (see D8), cap at 50 results before returning to client.

**Tag creation on import** → If the user imports 10 items with the same new genre, `createTag` is called 10 times. The existing tag creation uses a unique constraint; subsequent calls will fail gracefully (or we check before inserting). The import endpoint should resolve tags once and reuse IDs across items in the same batch.

## Open Questions

- **Year display**: ~~Resolved.~~ The `add-release-year-to-movies-tv` change added `releaseYear` to `Movie` and `TvSeries` interfaces and to the DB schema. The result list shows release year (e.g., "Dune (1984)" vs "Dune (2021)") and import passes it through to the write endpoint. See D5 for extraction details.
- **TMDB original language filter**: Should non-English results be shown by default, or opt-in? TMDB returns all languages; `language=en-US` on the request limits results but excludes foreign films the user might want. Assume no filter for now.
- **Person search — credits scope**: ~~Resolved in D8.~~ Filter to actor (cast) and director crew only; sort by effective billing (directors = 0, actors by `cast.order`); cap at 50.
