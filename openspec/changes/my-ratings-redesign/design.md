## Context

`client-watch` currently has separate Movies and TV watchlist pages backed by `user_movies.rating` and `user_tv_series.rating` columns that are stored but never shown in the UI. The event voting flow (`src/routes/watch/events.ts:242–248`) seeds the watchlist rating in real time whenever a vote is cast. The bottom nav has four tabs: Events, Movies, TV, People.

The Ratings page redesign surfaces personal ratings as a first-class feature, unifies the two watchlist pages into one, and changes vote seeding to flow from personal ratings into event votes (at candidate-add time) rather than the reverse.

UI design decisions are specified in `ui-design.md`.

---

## Goals / Non-Goals

**Goals:**
- Unify `MoviesWatchlistPage` and `TvWatchlistPage` into a single `RatingsPage` sorted by personal rating
- Expose personal rating editing inline on every media card
- Seed event votes from personal ratings when a candidate is added to an event
- Backfill personal ratings from event votes at event completion (for items with no prior rating)
- Add a "From My Ratings" quick-add panel on the event detail page
- Sort the event suggestions list by summed personal ratings of Yes/Maybe attendees, excluding No RSVPs

**Non-Goals:**
- Historical backfill of personal ratings for events that already completed
- Rating import from external services (TMDB, Letterboxd, etc.)
- Sharing personal ratings with other users
- My Lists sub-tab implementation (placeholder only in this change)

---

## Decisions

### 1. Vote seeding direction reverses

**Current behavior** (`events.ts:242–248`): casting a vote immediately writes back to `user_movies.rating` / `user_tv_series.rating` via `seedWatchlistRating`.

**New behavior**:
- Remove the real-time vote→rating seeding entirely.
- On `addCandidate`: read each invitee's personal rating for the item and call `upsertVote` for any invitee who has a rating. This is a one-time copy — later rating changes do not propagate.
- On `completeEvent`: for each candidate, copy vote values to personal ratings for any invitee whose rating is currently `NULL`.

**Rationale:** Real-time seeding conflates "what I voted in tonight's specific context" with "my general preference." Seeding at add-time initializes the vote from stated preference; post-completion backfill captures revealed preference for things the user hasn't rated yet.

### 2. MediaCard replaces MovieCard + TvSeriesCard

A new `MediaCard` component accepts a `type: 'movie' | 'tv'` prop and renders both content types. `MovieCard.tsx` and `TvSeriesCard.tsx` are deleted. The rating button, inline rating expansion, and toggle pill are all part of `MediaCard`.

**Rationale:** The two cards are nearly identical in the new design. A unified component avoids forking every future change.

### 3. Unified `GET /api/watch/ratings` endpoint

A new endpoint returns both movies and TV series from the user's watchlist in a single response, sorted by rating descending (nulls last). The client filters and re-sorts for the focused target membership, but the full sorted list comes from the server.

**Rationale:** The Ratings page and the "From My Ratings" panel in event detail both need the same data. A unified endpoint avoids two round-trips and keeps sort logic server-side.

Response shape (per item):
```
{ id, mediaType: 'movie'|'tv', title, year, streaming, rating, seen, again, watching, season?, episode? }
```

### 4. Suggestions list sort order

Candidates in the event detail suggestions list are sorted by the sum of personal ratings (`user_movies.rating` / `user_tv_series.rating`) across all Yes and Maybe attendees. No RSVPs are excluded from the sum. The sort is computed server-side and returned with the event detail response.

**Rationale:** Sorting by group personal ratings surfaces consensus picks without requiring attendees to vote first. Excluding No RSVPs removes signal from people who aren't attending. This replaces any previous implicit ordering (insertion order).

### 5. Ratings page sort order

Default sort: rating descending (++, +, 0, −, −−, unrated). When a target (event or list) is selected, items in that target float to the top of the list within the same rating tier — they are not sorted separately, just pinned above non-members at equal rating. Client-side sort matches the prototype behavior.

### 6. Seen filter default and edge cases

The Seen pill is off by default. Items are "hidden by Seen" only when `seen = true AND again = false AND watching = false`. Currently-watching items and seen-but-again items are always visible regardless of the pill. The pill label shows the count of actively hidden items when off.

### 7. Routing changes

- `/movies` and `/tv` routes are removed
- New route: `/ratings` → `RatingsPage`

There is no backward compatibility requirement for the old routes — this is a single-user self-hosted app with no external consumers.

### 8. Admin CLI coverage

Per project rules, every new API operation gets a CLI command:
- `watch ratings [--userId]` — list personal ratings for a user
- `watch seed-votes <eventId> <candidateId>` — manually trigger vote seeding from personal ratings
- `watch backfill-ratings <eventId>` — manually trigger post-completion rating backfill

All commands support `--json`.

---

## Risks / Trade-offs

**Breaking: vote-to-rating seeding removed.** Any user who relied on voting to populate their personal ratings will no longer get that behavior going forward. Ratings set by the old seeding path are preserved in the DB (not reverted); only future writes stop.
→ *Mitigation:* Document the behavior change. Post-completion backfill partially covers the gap for previously unrated items.

**One-time vote seeding may be stale at vote time.** If a user updates their personal rating after a candidate is added to an event, the event vote is not updated. The vote at add-time may not reflect the user's current preference.
→ *Mitigation:* Users can always override their event vote manually. The seeded value is a convenience default, not an authoritative preference.

**Suggestions sort requires attendees to have personal ratings.** If no attendees have rated a candidate, its score is 0 and sort order among unrated candidates is arbitrary.
→ *Mitigation:* Unrated candidates still appear in the list; they just sort to the bottom. Users can still vote on them.

**Unified endpoint returns potentially large lists.** Users with large watchlists will transfer more data than the event detail panel needs.
→ *Mitigation:* The endpoint is used by two surfaces that already need the full list. If performance becomes an issue, add pagination or a `?limit` param — but this is not anticipated for single-user self-hosted scale.

---

## Migration Plan

1. Deploy backend changes first:
   - Add `GET /api/watch/ratings` endpoint
   - Modify event detail response to include suggestions sorted by summed attendee personal ratings
   - Modify `addCandidate` to seed votes from personal ratings
   - Modify `completeEvent` to backfill personal ratings
   - Remove vote→rating seeding from the vote endpoint
2. Deploy frontend changes:
   - Add `/ratings` route with `RatingsPage`; remove `/movies` and `/tv` routes
   - Update nav from 4 tabs to 3
   - Update `EventDetailPage` with From My Ratings panel; remove any existing candidate sort
   - Delete `MoviesWatchlistPage.tsx`, `TvWatchlistPage.tsx`, `MovieCard.tsx`, `TvSeriesCard.tsx`

Rollback: revert backend changes; the old watchlist pages and routes are still in git history. No schema migration is required — all new behavior uses existing `rating` columns.

---

## Open Questions

- **My Lists sub-tab** — The "My Lists" tab shows a "coming soon" placeholder. Should it be hidden entirely (tab not shown) or shown as a stub? The prototype shows a stub; leaving it visible signals the roadmap but adds a dead tap target. Decision deferred to implementation; either approach is a one-line change.
