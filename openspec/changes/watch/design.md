## Context

The monorepo has a shared Hono backend, a SQLite database with `users`, `groups`, and `group_members` tables already in place, and a `client-movies` frontend that is fully auth-gated but shows only a placeholder `<h1>Movies</h1>`. The backend follows a repository pattern (`src/repositories/sqlite/`) with interfaces in `src/repositories/interfaces.ts`. Routes live in `src/routes/` and are registered in `src/app.ts`.

This change delivers the full **watch** app — movies, TV series, and group watch events — superseding the earlier movies-only scope.

## Goals / Non-Goals

**Goals:**
- Global catalog for movies (title, runtime, description, streaming, genre tags, optional series membership) and TV series (title, streaming, per-season episode counts, genre tags)
- Named movie series with defined watch-order positions
- Per-user states: movies (unseen / watched / would_watch_again), TV (unseen / watching / watched / would_watch_again)
- Per-episode TV progress with bulk "mark watched up to S/E" operation
- Group watch events: invite, RSVP, candidate suggestions, 5-level voting, host-confirmed selection; TV events specify episode mode

**Non-Goals:**
- External catalog APIs (TMDb, TVDB) — manual entry only
- No tracking of episode releases or current season/episode
- Comments or discussion threads
- Rich recommendation algorithms

## Decisions

### 1. Unified Tag System

A `tags` table stores genre (and, in the future, cuisine) tags with a `category` discriminator. `movie_tags` and `tv_series_tags` are join tables. The food change's cuisine preferences will reference the same tag rows.

**Alternative considered**: String arrays stored directly on each row. Rejected because it prevents joining tags to content and makes tag enumeration require a full scan.

### 2. Movie Series as a Separate Table

`movie_series` + `movie_series_entries` links movies to a named series with an integer position. A movie can belong to multiple series (e.g., a film that appears in both a director's filmography series and a franchise series). The composite primary key `(series_id, movie_id)` prevents duplicate entries within a single series.

**Alternative considered**: `series_id` + `series_position` columns directly on `movies`. Rejected because it conflates catalog metadata with grouping structure, makes reordering harder, and would limit a movie to one series.

### 3. State Model and Rating

`user_movies.state` and `user_tv_series.state` track where a user is with a title: `unseen` (added but not yet watched), `watched`, or `would_watch_again`. TV series additionally have `watching` for in-progress shows. Per-user tracking of`rating`: a −2 to 2 value that expresses desire to watch. A negative rating signals disinterest; positive signals interest.

### 4. TV Episode Tracking via Season Metadata

`tv_series_seasons` stores the episode count per season, entered manually when a series is added or updated. This enables the bulk "mark all watched up to S3E3" operation: enumerate S1E1–S1E{count}, S2E1–S2E{count}, S3E1–S3E3, and upsert into `user_tv_progress`.

`user_tv_progress` stores one row per watched episode `(user_id, series_id, season, episode)`. Individual episodes can be marked watched or unwatched independently of the bulk operation.

**Alternative considered**: Single high-water-mark column on `user_tv_series`. Rejected because it cannot represent gaps (watched S1, skipped S2E5, resumed S2E6).

### 5. Shared Rating Scale Across Catalog and Events

`user_movies.rating` and `user_tv_series.rating` store a per-user rating using the same −2 to 2 integer scale as event votes. A user can set a rating directly from the catalog or their watchlist at any time, independent of any event.

When a user casts a vote on a watch event candidate, the backend upserts a row in `user_movies` / `user_tv_series` for that item: if no row exists, one is created with `state = 'unseen'` and `rating` set to the vote value; if a row exists with `rating IS NULL`, the vote value is written to `rating`; if a row exists with a rating already set, it is left unchanged — an explicit rating is never overwritten by an event vote.

This means voting in an event automatically adds the item to the user's watchlist (as unseen) and seeds their rating, without any extra effort, while ratings set independently are never clobbered.

### 6. Watch Events

`watch_events` supports both movie and TV types. `watch_event_candidates` is a polymorphic item reference (`movie_id` XOR `series_id`). After voting, the host writes `watch_event_selection` with the winning candidate and, for TV events, episode mode details. Group invite expansion (inviting a `groupId`) expands to individual invites at creation time, snapshotted at that moment.

When the host marks an event as completed (writing `completed_at` on the event), the backend upserts a watchlist row for every invitee whose `attendance = 'yes'`, targeting the selected item. Transition rules differ by event type:

**Movie events** (`user_movies`):
- No existing row → create with `state = 'watched'`
- Existing row with `state = 'unseen'` → update to `watched`
- Existing row with `state = 'watched'` or `'would_watch_again'` → unchanged

**TV events** (`user_tv_series`):
- No existing row → create with `state = 'watching'`
- Existing row with `state = 'unseen'` → update to `watching`
- Existing row with `state = 'watching'`, `'watched'`, or `'would_watch_again'` → unchanged

**Alternative considered**: Separate tables for movie events and TV events. Rejected because the invite/RSVP/vote flow is identical across types.

### 7. Database Schema

```sql
-- Shared tags (genre for watch app; cuisine reserved for dining app)
CREATE TABLE tags (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('genre','cuisine'))
);

-- Movies
CREATE TABLE movies (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT    NOT NULL,
  runtime_minutes  INTEGER,
  description      TEXT,
  streaming        TEXT,
  added_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_movies_title ON movies(title);

CREATE TABLE movie_tags (
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  tag_id   INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (movie_id, tag_id)
);

CREATE TABLE movie_series (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE movie_series_entries (
  series_id INTEGER NOT NULL REFERENCES movie_series(id),
  movie_id  INTEGER NOT NULL REFERENCES movies(id),
  position  INTEGER NOT NULL,
  PRIMARY KEY (series_id, movie_id)
);

CREATE TABLE user_movies (
  user_id  INTEGER NOT NULL REFERENCES users(id),
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  state    TEXT    NOT NULL CHECK(state IN ('unseen','watched','would_watch_again')),
  rating   INTEGER CHECK(rating BETWEEN -2 AND 2),
  added_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, movie_id)
);

-- TV Series
CREATE TABLE tv_series (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  title                   TEXT    NOT NULL,
  streaming               TEXT,
  episode_runtime_minutes INTEGER,
  added_by_user_id        INTEGER NOT NULL REFERENCES users(id),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tv_series_title ON tv_series(title);

CREATE TABLE tv_series_seasons (
  series_id     INTEGER NOT NULL REFERENCES tv_series(id),
  season        INTEGER NOT NULL,
  episode_count INTEGER NOT NULL,
  PRIMARY KEY (series_id, season)
);

CREATE TABLE tv_series_tags (
  series_id INTEGER NOT NULL REFERENCES tv_series(id),
  tag_id    INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (series_id, tag_id)
);

CREATE TABLE user_tv_series (
  user_id   INTEGER NOT NULL REFERENCES users(id),
  series_id INTEGER NOT NULL REFERENCES tv_series(id),
  state     TEXT    NOT NULL CHECK(state IN ('unseen','watching','watched','would_watch_again')),
  rating    INTEGER CHECK(rating BETWEEN -2 AND 2),
  added_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, series_id)
);

CREATE TABLE user_tv_progress (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  series_id  INTEGER NOT NULL REFERENCES tv_series(id),
  season     INTEGER NOT NULL,
  episode    INTEGER NOT NULL,
  watched_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, series_id, season, episode)
);

-- Watch Events
CREATE TABLE watch_events (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  title              TEXT    NOT NULL,
  type               TEXT    NOT NULL CHECK(type IN ('movie','tv')),
  scheduled_date     TEXT    NOT NULL,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at       TEXT
);

CREATE TABLE watch_event_invites (
  event_id   INTEGER NOT NULL REFERENCES watch_events(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  attendance TEXT    CHECK(attendance IN ('yes','no','maybe')),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE watch_event_candidates (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id             INTEGER NOT NULL REFERENCES watch_events(id),
  item_type            TEXT    NOT NULL CHECK(item_type IN ('movie','tv')),
  movie_id             INTEGER REFERENCES movies(id),
  series_id            INTEGER REFERENCES tv_series(id),
  suggested_by_user_id INTEGER NOT NULL REFERENCES users(id),
  suggested_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Prevent duplicate nominations per event
CREATE UNIQUE INDEX idx_event_candidates_movie ON watch_event_candidates(event_id, movie_id)
  WHERE movie_id IS NOT NULL;
CREATE UNIQUE INDEX idx_event_candidates_tv ON watch_event_candidates(event_id, series_id)
  WHERE series_id IS NOT NULL;

CREATE TABLE watch_event_votes (
  event_id     INTEGER NOT NULL REFERENCES watch_events(id),
  candidate_id INTEGER NOT NULL REFERENCES watch_event_candidates(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  vote         INTEGER NOT NULL CHECK(vote BETWEEN -2 AND 2),
  PRIMARY KEY (event_id, candidate_id, user_id)
);

-- Host-confirmed selection (written after voting)
CREATE TABLE watch_event_selection (
  event_id      INTEGER PRIMARY KEY REFERENCES watch_events(id),
  candidate_id  INTEGER NOT NULL REFERENCES watch_event_candidates(id),
  -- TV-specific fields (NULL for movie events)
  episode_mode  TEXT    CHECK(episode_mode IN ('latest','specific')),
  season_from   INTEGER,
  episode_from  INTEGER,
  season_to     INTEGER,
  episode_to    INTEGER
);
```

### 8. API Routes

All routes under `/api/watch/` require authentication via existing auth middleware.

**Tags**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watch/tags` | List genre tags |
| POST | `/api/watch/tags` | Create a tag |

**Movies**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watch/movies` | List catalog (`?q=` title search, `?tag=` filter) |
| POST | `/api/watch/movies` | Add a movie |
| GET | `/api/watch/movies/:id` | Get a movie |
| PUT | `/api/watch/movies/:id` | Update movie metadata or tags |
| GET | `/api/watch/movies/series` | List all movie series |
| POST | `/api/watch/movies/series` | Create a series |
| PUT | `/api/watch/movies/series/:id` | Update series name or entry order |
| GET | `/api/watch/movies/watchlist` | Current user's movie watchlist |
| PUT | `/api/watch/movies/watchlist/:movieId` | Add or update a watchlist entry |
| DELETE | `/api/watch/movies/watchlist/:movieId` | Remove from watchlist |

**TV**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watch/tv` | List catalog (`?q=` title search, `?tag=` filter) |
| POST | `/api/watch/tv` | Add a TV series (include seasons array) |
| GET | `/api/watch/tv/:id` | Get a TV series with season list |
| PUT | `/api/watch/tv/:id` | Update metadata or season counts |
| GET | `/api/watch/tv/watchlist` | Current user's TV watchlist |
| PUT | `/api/watch/tv/watchlist/:seriesId` | Add or update TV watchlist entry |
| DELETE | `/api/watch/tv/watchlist/:seriesId` | Remove from TV watchlist |
| GET | `/api/watch/tv/:seriesId/progress` | Get user's episode progress |
| POST | `/api/watch/tv/:seriesId/progress` | Mark episodes watched — single `{season,episode}` or bulk `{upTo:{season,episode}}` |
| DELETE | `/api/watch/tv/:seriesId/progress` | Mark episode(s) unwatched |

**Events**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watch/events` | List events the user created or was invited to |
| POST | `/api/watch/events` | Create an event with initial invite list |
| GET | `/api/watch/events/:id` | Event detail: invites, candidates, votes, selection |
| PUT | `/api/watch/events/:id/attendance` | RSVP (yes / no / maybe) |
| POST | `/api/watch/events/:id/candidates` | Suggest a candidate |
| POST | `/api/watch/events/:id/candidates/:candidateId/vote` | Cast or update a vote |
| PUT | `/api/watch/events/:id/selection` | Host confirms selection (+ TV episode details) |

Group invite expansion (POST `/api/watch/events`): when `invitees` contains a `{ groupId }` entry, the backend expands it to all current `group_members` at creation time and stores individual invite rows.

### 9. TV Progress Bulk Operation

`POST /api/watch/tv/:seriesId/progress` with `{ upTo: { season, episode } }` enumerates episodes to mark watched using `tv_series_seasons`:

1. For each season < `season`: insert rows for episodes 1 through `episode_count`
2. For `season`: insert rows for episodes 1 through `episode`

Rows already present in `user_tv_progress` are skipped (INSERT OR IGNORE). The operation also auto-promotes the user's `user_tv_series.state` to `watching` if it was `want`.

### 10. Repository Pattern

Three new repository interfaces and SQLite implementations:

- `MovieRepository` — catalog CRUD, series management, watchlist operations
- `TvRepository` — catalog CRUD, season metadata, watchlist + progress operations
- `WatchEventRepository` — event CRUD, invites, candidates, votes, selection

Follows the existing pattern: interface in `src/repositories/interfaces.ts`, implementation in `src/repositories/sqlite/`.

### 11. Frontend Page Structure

```
/                    → redirect to /movies
/movies              → personal movie watchlist (Want to Watch / Watched tabs; skip hidden by default)
/movies/catalog      → all movies; add movie; browse by series
/tv                  → personal TV watchlist (Want / Watching / Watched tabs)
/tv/catalog          → all TV series; add series
/events              → watch events list
/events/new          → create event (type, date, invitees)
/events/:id          → event detail: invites + RSVP, candidates + votes, confirmed selection
```

NavBar: Movies | TV | Events

The event detail page shows:
- Header: event title, type badge, date
- Attendance section: each invitee + RSVP; current user updates their own
- Candidates section: each nominated item with per-user votes and aggregate score (sum of votes); current user can vote; any invitee can add a candidate from the catalog
- Selection section (host only until confirmed; read-only after): pick winner, set TV episode mode if applicable

Aggregate score is computed client-side as the sum of all votes cast; unvoted entries contribute 0.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Season episode counts require manual entry and can be wrong | UI allows inline edit per season; incorrect counts affect bulk-mark accuracy but not individual episode tracking |
| Polymorphic `watch_event_candidates` — can't enforce `movie_id` XOR `series_id` at DB level | Application layer validates exactly one is non-null; partial unique indexes prevent duplicate nominations |
| "Current" state is computed on read — requires an EXISTS subquery per watchlist row | Acceptable at watchlist scale; can be optimized with a materialized column later if needed |
| Group expansion at event creation snapshots membership | Intentional — the event reflects who was invited, not current group membership |
