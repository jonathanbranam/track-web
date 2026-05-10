## Why

Movie and TV cards across the app display only summary information, and the only way to see full catalog details (description, streaming, runtime, genres, release year) currently requires entering edit mode — conflating reading with editing. Users need read-only access to full details when deciding how to vote on an event candidate or whether to add a title to their watchlist.

## What Changes

- Movie and TV cards in the catalog (movies page, TV page), event candidate list, and watchlist views gain a tappable area (the title) that expands the card inline to reveal all available catalog details
- The expanded state is read-only — description, streaming platform, runtime/episode runtime, season count, release year, and genre tags
- Tapping the title again collapses the expanded panel
- At most one card is expanded at a time; opening a second card collapses any open one
- The existing Edit affordance remains separate and unchanged on catalog cards
- No new API endpoints are needed; detail data is already returned by existing list endpoints

## Capabilities

### New Capabilities
- `inline-movie-details`: Tap-to-expand read-only detail panel on movie/TV cards, available across catalog, event candidate, and watchlist views

### Modified Capabilities

(none)

## Impact

- `client-watch/src/` — catalog pages (`MoviesPage`, `TvPage`), event detail candidate list, watchlist pages (`MovieWatchlistPage`, `TvWatchlistPage`)
- No backend or schema changes required
- No new API endpoints
