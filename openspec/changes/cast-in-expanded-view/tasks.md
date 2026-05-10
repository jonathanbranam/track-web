## 1. Backend — Extend cast repository query

- [ ] 1.1 Confirm `ICastRepository.listCast` returns `CastMember[]` with `role` and `billingOrder` fields (already defined; verify against `store-tmdb-cast` implementation)
- [ ] 1.2 Pass `castRepo` as an additional parameter to `createMoviesRouter` in `src/routes/watch/movies.ts`
- [ ] 1.3 Pass `castRepo` as an additional parameter to `createTvRouter` in `src/routes/watch/tv.ts`
- [ ] 1.4 Update call sites in `src/app.ts` to pass `castRepo` to both routers

## 2. Backend — Extend detail endpoints

- [ ] 2.1 In `GET /api/watch/movies/:id`, call `castRepo.listCast('movie', id)` and append `director` (name string | null) and `cast` (sorted array of `{ name, billingOrder }`) to the response
- [ ] 2.2 In `GET /api/watch/tv/:id`, call `castRepo.listCast('tv', id)` and append `director` and `cast` to the response

## 3. Backend — Admin CLI command

- [ ] 3.1 Add `watch cast <movie|tv> <id>` command to the admin CLI that calls `castRepo.listCast` and prints director + cast members
- [ ] 3.2 Add `--json` flag to the cast command for script-friendly output
- [ ] 3.3 Update `README.md` with the new `watch cast` CLI command

## 4. Frontend — Shared cast fetch hook

- [ ] 4.1 Create a `useCastDetail` hook (or inline fetch logic) that lazy-fetches `GET /api/watch/movies/:id` (or TV equivalent) on first expand and caches the result for the card's lifetime; mirrors the existing event-candidate fetch pattern

## 5. Frontend — MovieCard cast preview

- [ ] 5.1 Update `MovieCard` to accept cast fields (`director`, `cast`) — either via props or from the lazy-fetch result
- [ ] 5.2 Render "Director: Name" row in the detail panel when `director` is non-null
- [ ] 5.3 Render up to 3 actor names (in billing order) below the director row when `cast` is non-empty
- [ ] 5.4 Add "Full cast" toggle button below the preview; on tap, expand an inline list of all `cast` members in billing order; second tap collapses it
- [ ] 5.5 Reset full-cast expanded state when the card collapses (card-level state)
- [ ] 5.6 Omit the entire cast section when both `director` is null and `cast` is empty

## 6. Frontend — TvSeriesCard cast preview

- [ ] 6.1 Apply the same cast preview and full-cast toggle to `TvSeriesCard` (mirror tasks 5.1–5.6 for TV)

## 7. Frontend — Catalog and watchlist lazy fetch

- [ ] 7.1 Update movie catalog page (`MoviesCatalogPage`) so that expanding a card triggers a detail fetch if cast data is not already present, with the result cached for subsequent expands
- [ ] 7.2 Update TV catalog page (`TvCatalogPage`) with the same lazy-fetch behavior
- [ ] 7.3 Update movie watchlist page (`MoviesWatchlistPage`) with the same lazy-fetch behavior
- [ ] 7.4 Update TV watchlist page (`TvWatchlistPage`) with the same lazy-fetch behavior
- [ ] 7.5 Confirm edit / watchlist / remove affordances remain independently tappable while a card is in loading or expanded state

## 8. Verification

- [ ] 8.1 Manually test cast preview on a movie card in catalog, watchlist, and event candidates — confirm director and top 3 actors appear
- [ ] 8.2 Manually test "Full cast" toggle expands and collapses the full list
- [ ] 8.3 Confirm a card without cast data (pre-migration import) shows no cast section and no "Full cast" affordance
- [ ] 8.4 Build client-watch (`npm run build:watch`) and confirm zero TypeScript errors
- [ ] 8.5 Confirm existing tests pass (if test suite covers watch routes)
