## Context

Watch events currently store a `type` column (`'movie' | 'tv'`) in `watch_events` that locks every event to one content type. The route validates this at creation, the nominate UI shows only one ID field based on it, and the completion handler checks `event.type` to decide which watchlist transition to apply.

The candidate table (`watch_event_candidates`) already has separate `movie_id` and `series_id` columns with an `item_type` discriminator — so mixed-type support exists at the data layer but is blocked by the event-level type constraint.

## Goals / Non-Goals

**Goals:**
- Remove `type` from event creation — both the API field and the database column
- Allow movie and TV series candidates to coexist on the same event
- Drive `episodeMode` selection from the winning candidate's type, not the event's type
- Replace the raw ID nominate input with a search-and-pick UI

**Non-Goals:**
- Adding a unified search API endpoint (client will query movies and TV in parallel)
- Changing the voting or RSVP flow
- Supporting episode ranges (specific from/to) — `episodeMode` stays `latest | specific` as-is

## Decisions

### 1. Drop `watch_events.type` via inline migration

The `db.ts` migration system uses `IF NOT EXISTS` table creation, so column removal requires a recreate-table migration step. SQLite supports `ALTER TABLE RENAME`; we recreate `watch_events` without the `type` column using the standard rename-create-copy-drop pattern, wrapped in a transaction.

**Alternative considered:** Make the column nullable. Rejected — it leaves dead weight and keeps the CHECK constraint logic alive, creating confusion.

### 2. Completion handler uses `candidate.itemType`, not `event.type`

The route handler in `src/routes/watch/events.ts` already fetches the winning candidate before applying watchlist transitions. The two conditions `event.type === 'movie'` and `event.type === 'tv'` are replaced with `candidate.itemType === 'movie'` and `candidate.itemType === 'tv'`. No repository changes needed.

**Implication:** The `type` field is removed from the `WatchEvent` interface in `repositories/interfaces.ts` and the API client type in `client-watch/src/api.ts`.

### 3. No type filter on candidate nomination

Currently the route at `POST /api/watch/events/:id/candidates` does not enforce type matching (the check is UI-only). After removing `event.type`, the endpoint needs no logic change — it already accepts either `movieId` or `seriesId`.

### 4. Episode mode is candidate-driven in the selection UI

The selection form in `EventDetailPage` currently gates the `episodeMode` toggle on `event.type === 'tv'`. After this change, when the host picks a candidate from the dropdown, the UI looks up that candidate's `itemType` from the local candidates list and shows the episode mode toggle only when `itemType === 'tv'`.

### 5. Nominate UI: parallel search, merged results

Rather than adding a new combined-search endpoint, the nominate form sends concurrent requests to `GET /api/watch/movies?q=<query>` and `GET /api/watch/tv?q=<query>` on each keystroke (debounced), merges the results with a type label, and presents a pick list. The user selects an item; the form submits `{ movieId }` or `{ seriesId }` accordingly.

**Alternative considered:** A new `/api/watch/search?q=` endpoint that returns both. Rejected — adds backend surface area for a purely client-side convenience; parallel fetch is fast enough for local SQLite.

## Risks / Trade-offs

- **Migration destructiveness** → The recreate-table pattern is safe for SQLite but loses any existing `type` data permanently. Acceptable for a single-user self-hosted app with no rollback requirement.
- **Search latency** → Two parallel fetches on each keystroke adds marginal overhead. Mitigated by debounce (300ms) and the fact that both queries hit local SQLite.
- **Existing events in production** → Any events created before this migration have a `type` value that will be silently discarded. The candidate rows already have `item_type`, so completion logic is unaffected.

## Migration Plan

1. Add a new migration block in `src/db.ts` after the existing watch tables migration:
   - BEGIN TRANSACTION
   - CREATE TABLE `watch_events_new` (same schema minus `type`)
   - INSERT INTO `watch_events_new` SELECT all columns except `type` FROM `watch_events`
   - DROP TABLE `watch_events`
   - ALTER TABLE `watch_events_new` RENAME TO `watch_events`
   - COMMIT
2. Remove `type` from route validation schema and repository types
3. Update completion handler to use `candidate.itemType`
4. Deploy backend, then deploy frontend

Rollback: restore previous `db.ts` and redeploy. Existing candidate rows are unaffected; event rows lose their `type` but that field is no longer read.
