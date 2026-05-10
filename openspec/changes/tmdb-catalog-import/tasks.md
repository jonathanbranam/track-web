## 1. Setup & Dependencies

- [ ] 1.1 Install `fastest-levenshtein` package
- [ ] 1.2 Add `TMDB_API_KEY` to `src/env.ts` as an optional string env var
- [ ] 1.3 Add `data/cache/external/` to `.gitignore`

## 2. TMDB Utilities (`src/utils/tmdb.ts`)

- [ ] 2.1 Implement genre lookup table mapping TMDB genre names to local tag names (Science Fiction → Sci-Fi, History → Historical, Music → Musical, Action & Adventure → Action, Sci-Fi & Fantasy → Sci-Fi)
- [ ] 2.2 Implement `applyGenreMap(genres: string[])` — apply lookup table, pass unmapped names through unchanged
- [ ] 2.3 Implement `extractReleaseYear(dateStr: string | undefined)` — parse first 4 characters as integer; return null if absent or non-numeric
- [ ] 2.4 Implement `normalizeTitle(title: string)` — lowercase, strip leading "the "/"a "/"an ", strip non-alphanumeric characters

## 3. Server File Cache

- [ ] 3.1 Implement `getCacheKey(type, mode, query)` — SHA1 of `{type}:{mode}:{trimmed-lowercased-query}`; returns hex filename string
- [ ] 3.2 Implement `readCache(key)` — read `data/cache/external/<key>.json`; return null if file absent or `cachedAt` is older than 7 days
- [ ] 3.3 Implement `writeCache(key, results)` — write `{ cachedAt, results }` JSON file, creating `data/cache/external/` if needed

## 4. Search Route (`src/routes/watch/external.ts`)

- [ ] 4.1 Create `src/routes/watch/external.ts` exporting `createExternalRouter(movieRepo, tvRepo)` (Hono router)
- [ ] 4.2 Add `GET /api/watch/external/search` handler — validate `type` (movie|tv), `q` (non-empty string), optional `person` boolean; return 503 when `TMDB_API_KEY` is absent
- [ ] 4.3 Implement title search path — call TMDB `/3/search/movie` or `/3/search/tv` with `Authorization: Bearer` header; normalize each result (title, `extractReleaseYear`, runtimeMinutes/seasonCount, `applyGenreMap`); cap at 50
- [ ] 4.4 Implement person search path — call `/3/search/person` to resolve name to ID, then `/3/person/{id}/movie_credits` or `tv_credits`; filter to cast + director crew; assign effectiveBilling (director = 0, cast = `cast.order`); deduplicate by TMDB ID keeping lower billing; sort ascending; cap at 50; normalize results
- [ ] 4.5 Apply cache read before TMDB call and write after; keyed by `getCacheKey(type, mode, query)`
- [ ] 4.6 Run fuzzy duplicate detection — load all local titles via `listMovies()` or `listSeries()` after cache lookup; compare each result's normalized title against all local normalized titles using `fastest-levenshtein`; mark `isDuplicate: true` and set `localTitle` when distance ≤ 0.15 × longer title length

## 5. Import Route

- [ ] 5.1 Add `POST /api/watch/external/import` handler — validate body (`type`: "movie"|"tv", result object matching search result shape); return 503 when `TMDB_API_KEY` is absent
- [ ] 5.2 Resolve each genre name to a local tag ID — call `listTags()` first; for any genre not found call `createTag(name)`; build a map of name → ID to avoid repeated lookups within the same request
- [ ] 5.3 Call `createMovie` or `createSeries` with title, releaseYear, runtimeMinutes/seasonCount, description (overview), and resolved tagIds
- [ ] 5.4 Return the created local record as JSON

## 6. Route Registration

- [ ] 6.1 Import and register `createExternalRouter` in `src/app.ts` under the `/api/watch` mount point

## 7. Admin CLI Command

- [ ] 7.1 Add `watch external search` subcommand to `scripts/admin.ts` accepting `--q <query>`, `--type movie|tv`, `--person` flag, and `--json` flag
- [ ] 7.2 Call `GET /api/watch/external/search` via the local HTTP client and print results as a formatted table (title, year, runtime or season count, duplicate status) by default
- [ ] 7.3 With `--json` flag, print raw JSON response instead

## 8. Client API (`client-watch/src/api.ts`)

- [ ] 8.1 Add `searchExternal(type: 'movie' | 'tv', q: string, person?: boolean)` — `GET /api/watch/external/search` with query params; return typed result array
- [ ] 8.2 Add `importExternal(type: 'movie' | 'tv', result: ExternalResult)` — `POST /api/watch/external/import`; return created Movie or TvSeries

## 9. Import Panel Component

- [ ] 9.1 Create `client-watch/src/components/TmdbImportPanel.tsx` — accepts `type`, `onImported` callback; renders Title/Person toggle, text input + Search button, scrollable result list (checkbox, title, release year, runtime or season count, duplicate badge), and "Add N Selected" button (disabled at 0 checked)
- [ ] 9.2 Wire Search button to call `searchExternal` and populate result list; show loading state during fetch
- [ ] 9.3 Render duplicate results grayed-out with a visible badge
- [ ] 9.4 Wire "Add N Selected" to call `importExternal` for each checked result sequentially, call `onImported` on completion

## 10. Movie Catalog Page

- [ ] 10.1 Add "+ Search" button to `MoviesCatalogPage.tsx` in the same row as the existing Add button
- [ ] 10.2 Toggle `TmdbImportPanel` open/closed on button activation (type="movie"); refresh movie list after `onImported`

## 11. TV Catalog Page

- [ ] 11.1 Add "+ Search" button to `TvCatalogPage.tsx` in the same row as the existing Add button
- [ ] 11.2 Toggle `TmdbImportPanel` open/closed on button activation (type="tv"); refresh TV list after `onImported`; panel shows season count column

## 12. Build & Documentation

- [ ] 12.1 Run `npm run build:watch` and resolve any TypeScript errors
- [ ] 12.2 Document `TMDB_API_KEY` in `README.md` (what it is, where to get it, that the app starts without it but search returns 503)
