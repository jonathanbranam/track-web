# track-web — LLM Agent Context

## What This Is

A self-hosted, single-user personal tracking suite. One backend (Hono + SQLite) serves several apps under the `branam.us` domain:

- **time** (`time.branam.us`) — time tracking: start/stop tasks with tags, review daily logs
- **watch** (`watch.branam.us`) — movie and TV tracking: watchlists, ratings, watch events with friends
- **trips** (`trips.branam.us`) — family trip log: current trip with Overview, Days, Info, and Packing tabs; departure/return notes, per-day plans, trip info, and structured packing list rendered as markdown or read-only UI
- **games** (`games.branam.us`) — casual games platform (`client-games`, dev port 6035): Phaser 3 + React, a client-side game registry catalog; first game is **Ball Merge**, a single-player physics ball-merging game (client-only, local best score, no API)
- **proto** (`proto.branam.us`) — prototype/experimental app

All apps share one backend and one SQLite database. There is one user account.

## Authentication

Two auth methods are accepted by most protected endpoints:

**Session cookie** — obtained by `POST /api/auth/login` with `{ email, password }`. Sets a `sid` cookie (HttpOnly, 30-day max-age). Use this for browser-based access.

**Bearer token** — long-lived API tokens created via `POST /api/auth/tokens` (session required to create). Pass as `Authorization: Bearer <token>` header. Tokens have a label and an expiry (1–180 days). Use this for programmatic/agent access.

**Session-only endpoints** — token management (`/api/auth/tokens`) and the manual deploy trigger (`/api/deploy/trigger`) accept session cookies only; bearer tokens are rejected.

**Unauthenticated endpoints** — `POST /api/auth/login`, `POST /api/auth/forgot`, `GET /api/openapi.json`, `GET /api/llm-context.md`, and the GitHub deploy webhook (`POST /api/deploy`).

To authenticate as an agent: call `GET /api/auth/me` to check if you have a valid session or token. If 401, you need credentials.

## Key Conventions

- **Timestamps** — always ISO 8601 UTC (e.g. `2025-06-01T14:30:00.000Z`). Display layer converts to US/Eastern.
- **"Today" boundary** — 4 AM ET to 4 AM ET the next day, not midnight.
- **Tags** — accept `#tag` or `:tag` prefix in descriptions. Stored as bare lowercase words, comma-separated (e.g. `work,deep-focus`). Hyphens allowed.
- **Running entry** — at most one time entry can be running (no `endedAt`) at a time. Stop it by PATCHing `endedAt` before starting a new one.

## Feature Areas

### Time Tracking (`/api/time/entries`)
CRUD for time entries. Each entry has a `description`, `startedAt`, optional `endedAt`, and parsed `tags`. `GET /api/time/entries/running` returns the active entry (or null). `GET /api/time/entries?date=YYYY-MM-DD` returns completed entries for a day.

### Trips (`/api/trips`)
A trip has a name, optional destination, departure/return notes, night/day counts, optional `startDate` / `endDate` (YYYY-MM-DD), and optional `infoMarkdown`. One trip can be marked "current" via `PUT /api/trips/:id/set-current`. `GET /api/trips/current` returns it (404 if none set). All trip fields are nullable except `name`; `startDate` and `endDate` drive Days-tab day-record generation.

**Access model:** trips use membership-based authorization via the `trip_members` table. Creating a trip auto-inserts the creator as `owner`. All `/api/trips/:id` routes require the authenticated user to be a member (403 otherwise; 404 if the trip doesn't exist). Mutation routes (`PUT`, `DELETE`, set-current) additionally require `role = 'owner'`. `GET /api/trips` and `GET /api/trips/current` filter by membership — users only see trips they are members of.

**Member management:** `GET/POST /api/trips/:id/members` and `DELETE /api/trips/:id/members/:userId` — list, add (`role=member`), and remove members. All require membership; POST and DELETE require owner role. POST returns 409 on duplicate, 404 if the userId doesn't exist. DELETE returns 400 if the owner tries to remove themselves. Use the `trips:members:*` admin CLI commands for scripted management.

**Trip days:** The `trip_days` table stores one record per calendar date between a trip's `startDate` and `endDate`. Records are auto-generated (via `INSERT OR IGNORE`) whenever a trip is created or updated with both dates set — existing rows are never deleted, so authored content survives date-range edits. Each day has a `date` (YYYY-MM-DD), `title` (defaults to `''`), `body` (markdown, defaults to `''`), and optional `weather` (freeform text).
- `GET /api/trips/:id/days` → `{ days: TripDay[] }` ordered by date ASC; requires membership
- `PUT /api/trips/:id/days/:date` body `{ title?, body?, weather? }` → updated `TripDay`; requires owner role; returns 400 if `:date` is not YYYY-MM-DD, 404 if no day record exists for that date
- CLI: `trips:days:list <tripId>` and `trips:days:update <tripId> <date>` with `--title`, `--body`, `--weather` flags (both support `--json`)

**Packing items:** The `packing_items` table stores structured checklist items per trip. Items have `section` (group heading, defaults to `''`), `text`, `position` (display order within section), and `user_id` (nullable — `NULL` = shared/visible to all; non-null = personal item visible only to that user and the owner). There is no in-app create/edit/delete UI — members use the API directly, and the owner uses the API or CLI.
- `GET /api/trips/:id/packing/items` → `{ items: PackingItem[] }` ordered by section ASC, position ASC; returns shared + requester's personal items (owner sees all items)
- `POST /api/trips/:id/packing/items` body `{ section?, text, position?, userId? }` → `{ item }` (201); requires membership; non-owners always create personal items (stored with their own userId); owner can pass `userId` to assign to a user, or omit for shared
- `PUT /api/trips/:id/packing/items/bulk` body `{ items: [{ section?, text, position?, userId? }] }` → atomically replaces all items; new IDs assigned; requires owner
- `PUT /api/trips/:id/packing/items/:itemId` body `{ section?, text?, position?, userId? }` → `{ item }`; requires owner; `userId` can be set/cleared to reassign; 404 if not found
- `DELETE /api/trips/:id/packing/items/:itemId` → 204; owner can delete any item; members can delete their own personal items (`user_id = requester.id`); 403 for shared or other members' personal items
- CLI: `trips:packing:list <tripId>`, `trips:packing:add <tripId> --text <text> [--user <userId>]`, `trips:packing:update <itemId> [--text] [--section] [--position] [--user <userId|0>]`, `trips:packing:bulk <tripId> --file <path>`, `trips:packing:delete <itemId>` (list and bulk support `--json`)

**Packing state:** Per-user checked state is stored in `packing_state` (`packing_item_id`, `user_id`, `checked`). Rows cascade-delete when items are deleted. Each user tracks their own checked state independently.
- `GET /api/trips/:id/packing/state` → `{ state: Record<itemId, boolean> }` for the authenticated user (absent keys are unchecked); requires membership
- `PUT /api/trips/:id/packing/state` body `{ itemId, checked }` → `{ ok: true }`; validates itemId belongs to the trip (404 if missing, 403 if wrong trip); requires membership
- `GET /api/trips/:id/packing/summary` → `{ members: [{ userId, checked, total }] }`; requires owner role; returns per-member completion counts
- CLI: `trips:packing:state:get <tripId> <userId>`, `trips:packing:state:set <tripId> <userId> <itemId> <true|false>`, `trips:packing:summary <tripId>` (state:get and summary support `--json`)

### Watch Tracking (`/api/watch/*`)
- **Movies** — searchable list with tags, streaming info, runtime, cast. Watchlist per user with state (`unseen` / `watched` / `would_watch_again`) and a rating (-2 to +2).
- **TV** — same structure; watchlist state adds `watching` and tracks current season/episode.
- **Tags** — shared genre/category tags used by both movies and TV.
- **Series** — ordered movie collections (e.g. a franchise).
- **Ratings** — `GET /api/watch/ratings` returns merged movie+TV ratings sorted by score.
- **External search/import** — `GET /api/watch/external/search?type=movie|tv&q=...` searches TMDB; `POST /api/watch/external/import` imports a result into the local database (requires `TMDB_API_KEY` env var).
- **Watch events** — collaborative watch sessions. Create an event with a title and scheduled date, invite connections (users or groups), nominate candidates (movies/TV), vote, select a winner, and complete the event. Completing triggers watchlist and rating updates for attendees.

### Social (`/api/social/*`)
Connect with other users via invite codes or connection requests (requires a shared group). Organize connections into groups. Groups are used to invite users to watch events.

### API Tokens (`/api/auth/tokens`)
Create, list, and delete bearer tokens. Tokens are scoped to the authenticated user. The raw token value is only returned at creation time.

## Machine-Readable API Reference

Full endpoint documentation with request/response schemas is available at:

```
GET /api/openapi.json
```

Returns the OpenAPI 3.0.3 spec as JSON. No authentication required.
