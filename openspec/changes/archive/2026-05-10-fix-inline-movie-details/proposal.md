## Why

Two visual issues in the client-watch expanded card UI: director/cast data is fetched for event candidates but never rendered in the expanded panel on the event detail page, and a small chevron icon on all movie and TV cards adds visual noise without aiding comprehension — the tap target on the title itself makes the expand affordance clear.

## What Changes

- Render director and cast preview in the expanded inline panel on the event detail page, matching the behavior already present on catalog and watchlist cards
- Remove the chevron icon (▾/▴) from the title row of all movie and TV cards (MovieCard, TvSeriesCard, and the inline candidate expansion in EventDetailPage)

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `inline-movie-details`: Remove the "Chevron indicates expand state" scenario; the chevron is no longer required
- `cast-preview-in-detail-panel`: Extend coverage to explicitly include the event candidate expanded panel (currently the spec covers catalog/watchlist cards but the implementation on EventDetailPage uses a separate rendering path that omits cast)

## Impact

- `client-watch/src/components/MovieCard.tsx` — remove chevron span
- `client-watch/src/components/TvSeriesCard.tsx` — remove chevron span
- `client-watch/src/pages/EventDetailPage.tsx` — remove chevron span from candidate card title row; add director + cast preview to the expanded candidate panel (same data already fetched via the lazy-detail endpoint)
