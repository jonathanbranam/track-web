## 1. Shared significance utility

- [ ] 1.1 Create `client-watch/src/utils/search.ts` exporting an `isSignificant(query: string): boolean` that strips leading articles ("a ", "an ", "the ") and all spaces, returning `true` when the remaining length is ≥ 3
- [ ] 1.2 Refactor `client-watch/src/pages/EventDetailPage.tsx` to import `isSignificant` from the shared util and remove its local copy (lines ~25–27)

## 2. Search input and state scaffolding on RatingsPage

- [ ] 2.1 Add a controlled search input to `client-watch/src/pages/RatingsPage.tsx`, rendered below the page header and above the filter bar, with a clear/empty affordance
- [ ] 2.2 Add component state for the query, debounced catalog results, debounced TMDB results, and per-tier loading/error flags
- [ ] 2.3 Wire two independent debounce timers off the single input — 300 ms for the catalog tier and 500 ms for the TMDB tier — reset on each keystroke and cleaned up on unmount

## 3. In-memory ratings filter tier

- [ ] 3.1 Derive an "In Your Ratings" list by case-insensitively filtering the already-loaded `items` by title against the query, with no API call
- [ ] 3.2 Recompute the filtered list synchronously on each keystroke so results update instantly

## 4. Local catalog tier

- [ ] 4.1 After the 300 ms debounce, fire `api.movies.list(q)` and `api.tv.list(q)` in parallel and merge into an "In Catalog" result set tagged by `mediaType`
- [ ] 4.2 Exclude catalog results already present in the loaded ratings by matching `id` + `mediaType`
- [ ] 4.3 Cap the displayed catalog results at a fixed limit (10–15) and show a "showing top N" note when more match
- [ ] 4.4 Show a per-tier loading state while in-flight and fail gracefully (empty section) on a non-2xx response

## 5. TMDB tier

- [ ] 5.1 After the 500 ms debounce, gate on `isSignificant(query)`; when it fails, fire no TMDB call and render no TMDB section
- [ ] 5.2 When significant, fire `api.external.search('movie', q)` and `api.external.search('tv', q)` in parallel and merge into one "On TMDB" set with a per-row media-type label
- [ ] 5.3 Exclude results where `isDuplicate: true`
- [ ] 5.4 Show a loading indicator while in-flight and hide the section on empty results or a non-2xx response

## 6. Three-section layout and filter-bar visibility

- [ ] 6.1 When the query is non-empty, render the three sections in order — "In Your Ratings", "In Catalog", "On TMDB" — each with its label and separated by horizontal rules
- [ ] 6.2 Hide the Movies/TV/Seen filter bar and the add-to dropdown row while the search is active, and restore them instantly when the input is cleared

## 7. Selection flows

- [ ] 7.1 Selecting an "In Catalog" result calls `api.movies.watchlist.set` / `api.tv.watchlist.set` with `{ state: 'want', rating: null }`, optimistically appends the item to the in-memory `items`, and clears the search
- [ ] 7.2 On a failed catalog add, remove the optimistically-added item and show an inline error
- [ ] 7.3 Selecting an "On TMDB" result calls `api.external.import(type, result)`, then adds the returned local record to the watchlist with `{ state: 'want', rating: null }`, then clears the search
- [ ] 7.4 On a failed TMDB import, show an inline error near the result, preserve the query, and do not add to the watchlist

## 8. Verification

- [ ] 8.1 Add/extend tests in `client-watch` for `isSignificant`, the ratings filter, catalog dedup/cap, and TMDB `isDuplicate` filtering; confirm `npm test` passes
- [ ] 8.2 Run `npm run build:watch` and confirm zero TypeScript errors before marking implementation complete
