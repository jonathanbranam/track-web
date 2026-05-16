## Context

The event detail page has a nominee search box that queries the local `movies` and `tv_series` tables as the user types. It already debounces at 300 ms and shows results in a dropdown. The TMDB search and import infrastructure already exists in the backend (`GET /api/watch/external/search`, `POST /api/watch/external/import`) and in the client API module (`api.external.search`, `api.external.import`). No backend changes are required.

## Goals / Non-Goals

**Goals:**
- Add TMDB as a second-tier source in the event detail nominee search
- Keep the local search response unchanged (always-on, low latency)
- Trigger TMDB search on: debounce pause with ≥ 3 non-space characters, Enter key, or clicking the new search button
- Present local results first; TMDB results below an HR separator
- Import a TMDB result into the catalog and immediately add it as an event candidate in one click
- Exclude already-catalogued titles from the TMDB section (they already appear in local results)

**Non-Goals:**
- Changing the backend search or import endpoints
- Adding items to the want-to-watch list
- Person / filmography search mode
- Showing TMDB poster images in the dropdown
- Admin CLI changes (existing `watch external search` command is sufficient)

## Decisions

### Debounce timing: 500 ms for TMDB, 300 ms for local (unchanged)

Local search is instant SQLite and stays at 300 ms. TMDB calls are network round-trips; 500 ms gives the user enough time to finish typing without firing on every keystroke. Two separate timers avoid coupling the two tiers.

### Minimum character threshold: 3 significant characters (strip articles and spaces)

Fewer characters produce too many irrelevant TMDB results and waste API quota. Before counting, strip leading articles ("a ", "an ", "the ") and all spaces. So "the g" strips to "g" (1 char, does not trigger), while "the godfather" strips to "godfather" (9 chars, triggers). This avoids firing a TMDB call when the user has only typed a common article.

### Parallel calls for movie + TV

The local search already queries both types in parallel. TMDB search requires a `type` parameter. We call `api.external.search('movie', q)` and `api.external.search('tv', q)` in parallel, then interleave results (movies first, then TV), matching the local results order.

Alternative considered: a single "multi" endpoint. Rejected — the existing API is already typed per-call and adding a backend change is out of scope.

### Filter out isDuplicate results from the TMDB section

`ExternalResult.isDuplicate` means the title already exists in the local catalog. Those items already appear in the local section, so showing them again under TMDB would create confusion and a redundant import path. They are filtered client-side before rendering the TMDB section.

Alternative considered: show duplicates with a "already in catalog" label and no click action. Rejected — adds visual noise for no benefit.

### Import-then-nominate on TMDB item click

Clicking a TMDB result calls `api.external.import(type, result)` which returns the created `Movie | TvSeries` object with its local `id`. We then set that as `pickedCandidate` (movieId or seriesId) exactly as local results do, and the existing Add button submits `api.events.addCandidate`. The import call is transparent to the user — from their perspective they just picked a result.

The import endpoint does not touch the watchlist, satisfying the "do not add to want-to-watch" requirement.

### Search icon button triggers TMDB only

The button to the right of the search input fires the TMDB search immediately (same as Enter), bypassing the debounce. It does not affect local search. Visually it uses a magnifying-glass icon (lucide `Search` or equivalent from the existing icon set).

### Loading state: spinner next to the separator

While a TMDB search is in-flight, a small spinner is shown next to the "From TMDB" label above the separator. If the search returns no results, a "No TMDB results" message is shown only after the search completes, not while loading.

### Error handling: silent suppression

If TMDB search returns a non-2xx response (e.g., 503 when `TMDB_API_KEY` is absent), the TMDB section simply shows nothing. No error toast is shown — the local results are still functional and the user can add anything already in the catalog.

If the import call fails, an inline error message is shown near the search box ("Could not import title — try again").

## Risks / Trade-offs

- [Double API call per search] Searching both movie and TV doubles TMDB API requests and cache lookup time → Mitigation: server-side file cache absorbs repeat queries; 500 ms debounce reduces call frequency.
- [Import latency on click] The import step (fetch credits, write DB) may take 1–3 s, making the UI feel slow after clicking a TMDB result → Mitigation: show a per-item loading spinner on the clicked result; disable other results during the import to prevent double-submit.
- [isDuplicate false negatives] Fuzzy matching might miss a local item with a very different spelling, causing a re-import attempt on a title already in the catalog → Mitigation: `createMovie`/`createSeries` are idempotent enough that a duplicate creates a second row rather than crashing; acceptable edge case for now.

## Migration Plan

Frontend-only change. No database migrations, no API changes. Deploy by building and restarting normally.
