## 1. Setup & Dependencies

- [x] 1.1 Install `fastest-levenshtein` package
- [x] 1.2 Add `TMDB_API_KEY` to `src/env.ts` as an optional string env var
- [x] 1.3 Add `data/cache/external/` to `.gitignore`

## 2. TMDB Utilities (`src/utils/tmdb.ts`)

- [x] 2.1 Implement genre lookup table mapping TMDB genre names to local tag names (Science Fiction → Sci-Fi, History → Historical, Music → Musical, Action & Adventure → Action, Sci-Fi & Fantasy → Sci-Fi)
- [x] 2.2 Implement `applyGenreMap(genres: string[])` — apply lookup table, pass unmapped names through unchanged
- [x] 2.3 Implement `extractReleaseYear(dateStr: string | undefined)` — parse first 4 characters as integer; return null if absent or non-numeric
- [x] 2.4 Implement `normalizeTitle(title: string)` — lowercase, strip leading "the "/"a "/"an ", strip non-alphanumeric characters

## 3. Server File Cache

- [x] 3.1 Implement `getCacheKey(type, mode, query)` — SHA1 of `{type}:{mode}:{trimmed-lowercased-query}`; returns hex filename string
- [x] 3.2 Implement `readCache(key)` — read `data/cache/external/<key>.json`; return null if file absent or `cachedAt` is older than 7 days
- [x] 3.3 Implement `writeCache(key, results)` — write `{ cachedAt, results }` JSON file, creating `data/cache/external/` if needed

## 4. Search Route (`src/routes/watch/external.ts`)

- [x] 4.1 Create `src/routes/watch/external.ts` exporting `createExternalRouter(movieRepo, tvRepo)` (Hono router)
- [x] 4.2 Add `GET /api/watch/external/search` handler — validate `type` (movie|tv), `q` (non-empty string), optional `person` boolean; return 503 when `TMDB_API_KEY` is absent
- [x] 4.3 Implement title search path — call TMDB `/3/search/movie` or `/3/search/tv` with `Authorization: Bearer` header; normalize each result (title, `extractReleaseYear`, runtimeMinutes/seasonCount, `applyGenreMap`); cap at 50
- [x] 4.4 Implement person search path — call `/3/search/person` to resolve name to ID, then `/3/person/{id}/movie_credits` or `tv_credits`; filter to cast + director crew; assign effectiveBilling (director = 0, cast = `cast.order`); deduplicate by TMDB ID keeping lower billing; sort ascending; cap at 50; normalize results
- [x] 4.5 Apply cache read before TMDB call and write after; keyed by `getCacheKey(type, mode, query)`
- [x] 4.6 Run fuzzy duplicate detection — load all local titles via `listMovies()` or `listSeries()` after cache lookup; compare each result's normalized title against all local normalized titles using `fastest-levenshtein`; mark `isDuplicate: true` and set `localTitle` when distance ≤ 0.15 × longer title length

## 5. Import Route

- [x] 5.1 Add `POST /api/watch/external/import` handler — validate body (`type`: "movie"|"tv", result object matching search result shape); return 503 when `TMDB_API_KEY` is absent
- [x] 5.2 Resolve each genre name to a local tag ID — call `listTags()` first; for any genre not found call `createTag(name)`; build a map of name → ID to avoid repeated lookups within the same request
- [x] 5.3 Call `createMovie` or `createSeries` with title, releaseYear, runtimeMinutes/seasonCount, description (overview), and resolved tagIds
- [x] 5.4 Return the created local record as JSON

## 6. Route Registration

- [x] 6.1 Import and register `createExternalRouter` in `src/app.ts` under the `/api/watch` mount point

## 7. Admin CLI Command

- [x] 7.1 Add `watch external search` subcommand to `scripts/admin.ts` accepting `--q <query>`, `--type movie|tv`, `--person` flag, and `--json` flag
- [x] 7.2 Call `GET /api/watch/external/search` via the local HTTP client and print results as a formatted table (title, year, runtime or season count, duplicate status) by default
- [x] 7.3 With `--json` flag, print raw JSON response instead

## 8. Client API (`client-watch/src/api.ts`)

- [x] 8.1 Add `searchExternal(type: 'movie' | 'tv', q: string, person?: boolean)` — `GET /api/watch/external/search` with query params; return typed result array
- [x] 8.2 Add `importExternal(type: 'movie' | 'tv', result: ExternalResult)` — `POST /api/watch/external/import`; return created Movie or TvSeries

## 9. Import Panel Component

- [x] 9.1 Create `client-watch/src/components/TmdbImportPanel.tsx` — accepts `type`, `onImported` callback; renders Title/Person toggle, text input + Search button, scrollable result list (checkbox, title, release year, runtime or season count, duplicate badge), and "Add N Selected" button (disabled at 0 checked)
- [x] 9.2 Wire Search button to call `searchExternal` and populate result list; show loading state during fetch
- [x] 9.3 Render duplicate results grayed-out with a visible badge
- [x] 9.4 Wire "Add N Selected" to call `importExternal` for each checked result sequentially, call `onImported` on completion

## 10. Movie Catalog Page

- [x] 10.1 Add "+ Search" button to `MoviesCatalogPage.tsx` in the same row as the existing Add button
- [x] 10.2 Toggle `TmdbImportPanel` open/closed on button activation (type="movie"); refresh movie list after `onImported`

## 11. TV Catalog Page

- [x] 11.1 Add "+ Search" button to `TvCatalogPage.tsx` in the same row as the existing Add button
- [x] 11.2 Toggle `TmdbImportPanel` open/closed on button activation (type="tv"); refresh TV list after `onImported`; panel shows season count column

## 12. Build & Documentation

- [x] 12.1 Run `npm run build:watch` and resolve any TypeScript errors
- [x] 12.2 Document `TMDB_API_KEY` in `README.md` (what it is, where to get it, that the app starts without it but search returns 503)

## 13. TMDB ID Storage

- [x] 13.1 Add `tmdb_id INTEGER` column (nullable) to both `movies` and `tv_series` tables via migration in `src/db.ts`
- [x] 13.2 Add `tmdbId: number | null` to the `Movie` and `TvSeries` TypeScript interfaces; update repository SELECT queries to include the column
- [x] 13.3 Update `createMovie` and `createSeries` repository methods to accept and persist `tmdbId`
- [x] 13.4 Update `POST /api/watch/external/import` handler to pass `tmdbId` from the request body to `createMovie` / `createSeries`

## 14. Two-Level Cache Refactor

- [x] 14.1 Update `data/cache/external/` directory structure: create `queries/` and `titles/` subdirectories (update `.gitignore` entry if needed)
- [x] 14.2 Implement `readQueryCache(key)` — read `data/cache/external/queries/{key}.json`; return null if absent or `cachedAt` older than 7 days; on hit return `ids` array
- [x] 14.3 Implement `writeQueryCache(key, ids)` — write `{ cachedAt, ids }` to `data/cache/external/queries/{key}.json`, creating the directory if needed
- [x] 14.4 Implement `upsertTitleCache(tmdbId, data)` — write `{ updatedAt, data }` to `data/cache/external/titles/{tmdbId}.json`, creating the directory if needed
- [x] 14.5 Implement `loadTitleCache(ids)` — read each `data/cache/external/titles/{id}.json` and return the assembled results array in `ids` order; skip any missing entries
- [x] 14.6 Update the search route cache logic: on query cache hit → call `loadTitleCache(ids)`; on miss → fetch TMDB, upsert each result via `upsertTitleCache`, call `writeQueryCache` with ordered IDs
- [x] 14.7 Run `npm run build:server` and resolve any TypeScript errors
