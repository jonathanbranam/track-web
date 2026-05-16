## Why

The event detail page search only surfaces titles already in the local catalog, so users can't nominate movies or TV shows they haven't imported yet. Adding TMDB lookup as a second tier lets users find anything in the TMDB database and add it to an event in one step, without a separate import workflow.

## What Changes

- The search input on the event detail page gains TMDB-backed results as a second tier below local results.
- After the user pauses typing (≥ 3 non-space characters), the frontend calls the existing TMDB search API endpoint.
- Pressing Enter or clicking a new search-icon button to the right of the input triggers an immediate TMDB search.
- Local catalog results continue to appear at the top of the dropdown.
- TMDB results appear below a horizontal rule separator.
- Clicking a TMDB result calls the existing import endpoint, then immediately adds the newly imported title as an event candidate. It is not added to the want-to-watch list.

## Capabilities

### New Capabilities
- `event-search-tmdb`: UI behavior for the two-tier search in the event detail page — local results on top, TMDB results below a separator, debounce/enter/button triggers, and the import-then-nominate action on TMDB result selection.

### Modified Capabilities
- `watch-events`: The candidate nomination flow gains a new code path where the item does not yet exist locally. The requirement that adding a candidate uses `POST /api/watch/events/:id/candidates` is unchanged, but a new scenario is needed: importing a TMDB result and immediately nominating it without adding it to the watchlist.

## Impact

- `client-watch/src/pages/EventDetailPage.tsx` — primary change: state, debounce logic, search-icon button, two-tier result list with HR separator, import-then-nominate handler
- `client-watch/src/api.ts` — may need a combined helper or the existing `external.search` and `external.import` calls are used directly
- `src/routes/watch/external.ts` — no changes expected; existing `/api/watch/external/search` and `/api/watch/external/import` endpoints are sufficient
- No new dependencies
