## Why

The personal rating field exists in the data model but is never surfaced in the UI, leaving the core "what should we watch tonight?" use case underserved. The current watchlist organizes content by state (Want/Watching/Watched/Again), which forces users through an arbitrary filter before seeing their preferences — and gives no way to express a negative preference, see ratings across a group, or feed personal ratings into watch event suggestions.

## What Changes

- Replace the separate Movies and TV watchlist pages with a unified "My List" view sorted by personal rating
- Expose and enable editing of the personal rating field (currently stored but never shown)
- Add a filter bar: toggle content type (Movies / TV / both) and visibility of seen-but-not-again items; include all ratings including negative by default
- Replace the 4-item nav bar (Events / Movies / TV / People) with 3 items (Events / My List / People)
- Two sub-tabs within My List: "Ratings" (main view) and "My Lists" (placeholder, coming soon)
- TV series currently being watched are included in the default view
- When a candidate is added to a watch event, seed all invitees' event votes from their existing personal ratings (one-time copy at add time; later rating changes do not affect the vote)
- **BREAKING**: Remove real-time vote-to-rating seeding (currently voting in an event immediately seeds the watchlist rating); replace with post-completion backfill instead
- After event completion, copy event votes to personal ratings for invitees who have no existing rating for that item
- Add a "From My List" panel in the event detail page for quickly adding candidates from your rated content
- Add a "Best Picks" view in event detail: rank candidates by summed personal ratings across Yes/Maybe attendees, excluding No RSVPs

## Capabilities

### New Capabilities
- `unified-my-list`: Unified Movies + TV personal ratings page — filter bar, rating-first sort, MediaCard component replacing separate MovieCard/TvSeriesCard, two sub-tabs (Ratings | My Lists), and "Add to Event" integration from the ratings list
- `event-best-picks`: Group rating aggregation view within event detail, ranking candidates by summed personal ratings of Yes/Maybe attendees, with per-user rating breakdown visible on expand

### Modified Capabilities
- `watch-watchlist`: Rating sync rules change — remove real-time vote-to-rating seeding; add (a) personal-rating-to-vote seeding at candidate-add time for all invitees, and (b) event-vote-to-personal-rating backfill at event completion for previously unrated items
- `watch-mobile-ui`: Navigation reduces from 4 tabs to 3 — Movies and TV merge into "My List"; routes `/movies` and `/tv` redirect to `/list`
- `watch-events`: Adding a candidate now triggers personal-rating-to-vote seeding for all invitees; event detail gains "From My List" panel for candidate suggestions

## Impact

**Frontend:**
- `client-watch/src/pages/MoviesWatchlistPage.tsx` — replaced by new unified My List page
- `client-watch/src/pages/TvWatchlistPage.tsx` — replaced by new unified My List page
- `client-watch/src/components/MovieCard.tsx` + `TvSeriesCard.tsx` — merged into a shared `MediaCard` component
- `client-watch/src/pages/EventDetailPage.tsx` — adds From My List panel and Best Picks drawer
- `client-watch/src/App.tsx` — routing and nav changes; old `/movies` and `/tv` routes redirect to `/list`

**Backend:**
- `src/repositories/sqlite/watch-event.repository.ts` — `addCandidate` seeds votes from personal ratings for all invitees; `completeEvent` backfills personal ratings from votes
- Vote endpoint: remove the real-time vote-to-rating seeding behavior
- New endpoint: `GET /api/watch/events/:id/best-picks` — returns candidates ranked by summed invitee personal ratings, filtered by RSVP status
