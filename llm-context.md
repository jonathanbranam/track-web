# track-web — LLM Agent Context

## What This Is

A self-hosted, single-user personal tracking suite. One backend (Hono + SQLite) serves four apps under the `branam.us` domain:

- **time** (`time.branam.us`) — time tracking: start/stop tasks with tags, review daily logs
- **watch** (`watch.branam.us`) — movie and TV tracking: watchlists, ratings, watch events with friends
- **trips** (`trips.branam.us`) — trip log: record travel with departure/return notes and a "current trip" concept
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
A trip has a name, optional destination, departure/return notes, and night/day counts. One trip can be marked "current" via `PUT /api/trips/:id/set-current`. `GET /api/trips/current` returns it (404 if none set).

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
