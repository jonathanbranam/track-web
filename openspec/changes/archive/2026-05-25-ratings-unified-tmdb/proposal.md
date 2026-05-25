## Why

The Ratings page shows the user's existing watchlist but there is no way to search for other content — finding a specific title requires scrolling or leaving the page entirely. Adding a unified search directly on the page allows the user to locate titles in their ratings, discover local catalog titles not yet on their watchlist, and surface new titles from TMDB without switching context.

## What Changes

- Add a search input field at the top of the Ratings page (below the filter bar)
- As the user types, instantly filter the currently visible ratings list
- After a 300 ms debounce, also search the local catalog for matching movies and TV series not already shown in the filtered ratings
- After a 500 ms debounce (same significance threshold as `event-search-tmdb`), fire a TMDB search and show results in a third section
- Display results in three labeled sections: "In Your Ratings", "In Catalog", and "On TMDB", separated by horizontal rules
- TMDB results use the same duplicate filtering (exclude `isDuplicate: true`), import-on-select flow, and significance test (strip leading articles and spaces; ≥ 3 significant chars) as the event nomination search
- Clearing the search field returns the page to its normal filtered view

## Capabilities

### New Capabilities
- `ratings-search`: Unified search input on the Ratings page — filters visible ratings instantly, queries the local catalog after 300 ms debounce, and queries TMDB after 500 ms debounce with significance threshold. Results displayed in three labeled sections with horizontal rule separators. Selecting a local catalog result adds it to the user's watchlist; selecting a TMDB result imports it and adds it to the watchlist.

### Modified Capabilities
- `unified-ratings`: The Ratings page gains a search input field above the existing filter bar. The filter bar and card list behavior are unchanged when no search is active; when search is active the filter bar is hidden and replaced by the three-section search result view.

## Impact

- `client-watch/src/pages/RatingsPage.tsx` — adds search input, debounced local and TMDB search logic, three-section result layout
- Existing `GET /api/watch/external/search` endpoint reused for TMDB tier
- Existing `POST /api/watch/external/import` endpoint reused for import-then-add flow
- A new backend endpoint may be needed to search the local catalog without the watchlist filter (`GET /api/watch/catalog/search?q=&type=`) unless the existing catalog endpoints already support free-text search
- No schema changes required
