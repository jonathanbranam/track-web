## 1. Backend: Remove Legacy Vote-to-Rating Seeding

- [x] 1.1 Remove the `seedWatchlistRating` call from the vote endpoint in `src/routes/watch/events.ts` (lines 242–248)
- [x] 1.2 Delete or mark unused the `seedWatchlistRating` helper if it has no other callers

## 2. Backend: Unified Ratings Endpoint

- [x] 2.1 Add `GET /api/watch/ratings` route in `src/routes/watch/` that queries both `user_movies` and `user_tv_series` for the calling user, merges results, and sorts by rating descending (nulls last)
- [x] 2.2 Define the response shape per item: `{ id, mediaType: 'movie'|'tv', title, year, streaming, rating, seen, again, watching, season?, episode? }`
- [x] 2.3 Add repository method(s) for fetching merged ratings to the SQLite watch repository

## 3. Backend: Candidate Add Seeding

- [x] 3.1 In `src/repositories/sqlite/watch-event.repository.ts`, update `addCandidate` to read all invitees' personal ratings for the newly added item and upsert votes via `upsertVote` for each invitee with a non-null rating

## 4. Backend: Event Completion Rating Backfill

- [x] 4.1 In `completeEvent`, after existing watchlist state transitions, iterate all invitees: for each who voted on the selected candidate and has a NULL personal rating for that item, write their vote value as the personal rating

## 5. Backend: Suggestions Sort Order

- [x] 5.1 Update `GET /api/watch/events/:id` to compute per-candidate summed personal ratings from yes/maybe RSVPs and return candidates sorted descending by that sum (nulls/zeros last)

## 6. Backend: Admin CLI Commands

- [x] 6.1 Add `watch ratings [--userId] [--json]` CLI command that lists personal ratings for a user
- [x] 6.2 Update `README.md` with the new CLI command

## 7. Frontend: MediaCard Component

- [x] 7.1 Create `client-watch/src/components/MediaCard.tsx` accepting `type: 'movie' | 'tv'` and all needed item fields
- [x] 7.2 Implement the compact rating button (color-coded, "?" for no rating) in the top-right corner of MediaCard
- [x] 7.3 Implement inline rating expansion: tapping rating button expands card in-place to show five rating buttons (−− − 0 + ++) plus ✕ dismiss; only one card expanded at a time
- [x] 7.4 Wire rating selection to call `PUT /api/watch/movies/watchlist/:id` or `PUT /api/watch/tv/watchlist/:id` and collapse the card on success
- [x] 7.5 Implement per-card toggle pill (● violet / ○ gray) showing selected event/list membership; tapping toggles membership
- [x] 7.6 Delete `client-watch/src/components/MovieCard.tsx` and `TvSeriesCard.tsx`

## 8. Frontend: RatingsPage

- [x] 8.1 Create `client-watch/src/pages/RatingsPage.tsx` that fetches `GET /api/watch/ratings`
- [x] 8.2 Implement sub-tabs: "Ratings" (default, shows list) and "My Lists" (shows "coming soon" placeholder)
- [x] 8.3 Implement filter bar: Movies pill, TV pill (both independent toggles, active by default), and Seen pill (off by default showing hidden count)
- [x] 8.4 Apply filter logic: Seen pill hides items with `seen=true AND again=false AND watching=false`; watching/again items always visible
- [x] 8.5 Implement the add-to dropdown row: first dropdown (Event | List), second dropdown contextual (upcoming events or named lists with "shows" counts; "No upcoming events" italic placeholder when no events)
- [x] 8.6 Render `MediaCard` for each filtered item; pass selected event/list context for toggle pill

## 9. Frontend: Routing and Navigation

- [x] 9.1 Add `/ratings` route pointing to `RatingsPage` in `client-watch/src/App.tsx`
- [x] 9.2 Remove `/movies` and `/tv` routes from `App.tsx`
- [x] 9.3 Delete `client-watch/src/pages/MoviesWatchlistPage.tsx` and `TvWatchlistPage.tsx`
- [x] 9.4 Update bottom nav to three tabs (Events, Ratings, People); remove Movies and TV tabs; mark Ratings tab active on `/ratings`

## 10. Frontend: EventDetailPage Updates

- [x] 10.1 Remove any client-side candidate sort logic from `EventDetailPage.tsx` (server now returns sorted suggestions)
- [x] 10.2 Add From My Ratings expandable panel at the bottom of the Suggestions section: toggle link "▼ Add From My Ratings" / "▲ Hide"; fetches `GET /api/watch/ratings`; renders compact rows (type badge, title, rating badge, Add button); excludes already-added candidates
- [x] 10.3 Wire Add button in the panel to call `POST /api/watch/events/:id/candidates`, show transient checkmark (~2s), then remove the row from the panel

## 11. Build and Verify

- [x] 11.1 Run `npm run build:watch` and confirm zero TypeScript errors in the client-watch build
- [x] 11.2 Run `npm run build:server` and confirm zero TypeScript errors in the server build
