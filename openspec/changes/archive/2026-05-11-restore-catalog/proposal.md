## Why

The ratings redesign replaced the separate Movies and TV watchlist pages with a unified Ratings page, but inadvertently removed the "Browse →" link that gave users access to the Movie Catalog search. The catalog route still exists but is now unreachable from the UI.

## What Changes

- Add a "Browse →" link at the top of the Ratings page, linking to `/movies/catalog`, matching the pattern from the old MoviesWatchlistPage

## Capabilities

### New Capabilities
<!-- none — this restores removed UI, not a new capability -->

### Modified Capabilities
- `unified-ratings`: Restore Browse link at the top of the Ratings page (requirement: catalog must be reachable from the ratings view)

## Impact

- `client-watch/src/pages/RatingsPage.tsx` — add Browse link in the page header
- No backend, API, or route changes needed; `/movies/catalog` route is already registered in `App.tsx`
