## Context

The Ratings page (`RatingsPage.tsx`) loads all watchlist items via `GET /api/watch/ratings` into local state on mount. Two other existing endpoints already support free-text catalog search: `GET /api/watch/movies?q=` and `GET /api/watch/tv?q=` (both use `LIKE %q%` against the local catalog, regardless of watchlist membership). The TMDB search infrastructure (`GET /api/watch/external/search`, `POST /api/watch/external/import`) and its significance threshold logic are already implemented for the event nomination flow.

Currently the page has no way to search — the user can only filter the visible list by media type (Movies/TV pill) or seen status (Seen pill).

## Goals / Non-Goals

**Goals:**
- Add a single search input on the Ratings page that drives three tiers simultaneously: in-memory ratings filter, local catalog query, and TMDB query
- Reuse all existing search/import API endpoints — no new backend routes required
- Match the TMDB trigger behavior (debounce, significance threshold) exactly as specified in `event-search-tmdb`

**Non-Goals:**
- New backend catalog-search endpoint (existing `GET /api/watch/movies?q=` / `GET /api/watch/tv?q=` are sufficient)
- Admin CLI command (no new API operations are added)
- Persistent search state across navigation
- Searching within the My Lists sub-tab

## Decisions

### Decision: In-memory filter for ratings tier (no extra API call)
The full ratings list is already loaded on mount. Filtering it client-side against the search query is instant and requires no debounce or API call.

*Alternative considered*: adding a `q` param to `GET /api/watch/ratings`. Rejected — unnecessary network round-trip for data already in memory.

### Decision: Reuse existing catalog endpoints; two parallel calls for catalog tier
`GET /api/watch/movies?q=` and `GET /api/watch/tv?q=` are fired in parallel after a 300 ms debounce. Results are deduplicated against the current ratings list by `id + mediaType` so catalog items the user has already rated are not shown twice.

*Alternative considered*: a new combined `GET /api/watch/catalog/search?q=&type=both` endpoint. Rejected — two parallel fetches are equivalent in latency and add zero new backend code.

### Decision: Two independent debounce timers on a single input
The 300 ms catalog timer and 500 ms TMDB timer are started together on each keystroke and reset independently. This matches the two-tier timing used in the event nomination search without coupling the tiers.

### Decision: TMDB fires two parallel calls (movie + tv)
`GET /api/watch/external/search` requires a `type` param. The ratings page shows both media types, so two calls are fired in parallel and their results are merged into a single TMDB section with media-type labels per row. The significance test (strip leading articles and spaces, ≥ 3 chars remaining) is applied once and gates both calls.

*Alternative considered*: expose a `type=both` option on the external search endpoint. Rejected — out of scope; two parallel client calls achieve the same result without backend changes.

### Decision: Filter bar is hidden while search is active
When the search input is non-empty the filter bar (Movies/TV/Seen pills and add-to row) is replaced by the three-section result view. This avoids the complexity of combining pill filters with three independent result sets. Clearing the search restores the normal view instantly.

### Decision: Selecting a catalog result adds to watchlist with neutral state
Choosing a local catalog item that is not in the user's watchlist calls `PUT /api/watch/movies/watchlist/:id` or `PUT /api/watch/tv/watchlist/:id` with a neutral default state (`{ state: 'unseen', rating: null }`). The item is then appended to the in-memory `items` list and the search is cleared, returning to the normal view where the newly-added item is visible.

### Decision: Selecting a TMDB result imports then adds to watchlist
Same two-step flow as event nomination: `POST /api/watch/external/import` followed by the watchlist upsert above. `isDuplicate: true` results are excluded from the TMDB section — they are already in the catalog and will appear in the "In Catalog" tier.

## Risks / Trade-offs

- **Two TMDB calls per search** — doubles TMDB API usage relative to a single-type search. The server-side query cache (7-day TTL) limits the blast radius; only cold queries hit the TMDB API. Acceptable given the infrequency of ratings-page searches.
- **Catalog results include all local titles** — a popular query could return a long list. The existing catalog endpoints have no limit param; the frontend should cap display at 10–15 results per section and show a "showing top N" note if truncated.
- **Stale in-memory ratings after watchlist add** — when a catalog item is added to the watchlist, the local `items` array is updated optimistically. If the API call fails, the UI will show the item but the server won't have it. Mitigation: on failure, remove the optimistically-added item and show an inline error.
- **TMDB significance test duplication** — the strip-articles-and-spaces logic already exists in `EventDetailPage`. It should be extracted to a shared utility (`client-watch/src/utils/search.ts`) to avoid drift.

## Migration Plan

Frontend-only change. No database migrations, no new routes, no server restart required. Deploy as a normal client build.
