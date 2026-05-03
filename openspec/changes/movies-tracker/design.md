## Context

The monorepo has a shared Hono backend, a SQLite database with `users`, `groups`, and `group_members` tables already in place, and a `client-movies` frontend that is fully auth-gated but shows only a placeholder `<h1>Movies</h1>`. The backend follows a repository pattern (`src/repositories/sqlite/`) with interfaces in `src/repositories/interfaces.ts`. Routes live in `src/routes/` and are registered in `src/app.ts`.

This change adds the movies feature: a global movie catalog, per-user watchlists, and group watch plans with attendance and voting.

## Goals / Non-Goals

**Goals:**
- Global movie catalog (title required; runtime, description, streaming platform optional)
- Per-user watchlist: want-to-watch vs. have-watched, priority rank, "would watch again" flag
- Watch plans: dated events created by any user, inviting individual users or groups
- Attendance RSVP per invited user: yes / no / maybe
- Movie suggestions on a plan by any invitee; 5-level integer vote per suggestion per invitee

**Non-Goals:**
- External movie data APIs (TMDb, OMDB) — manual entry only for now
- Rich recommendation algorithms
- Comments or discussion threads on plans or movies
- Per-plan permissions beyond "invited users can do everything"

## Decisions

### 1. Global Movie Catalog

Movies live in a single `movies` table shared across all users. Any authenticated user can add a movie. The catalog is the source of truth for metadata; watchlist and suggestion rows reference it by `movie_id`.

**Alternative considered**: Per-user movie records (each user has their own row per movie). Rejected because it duplicates metadata and makes it impossible to correlate "the same film" across users without fuzzy matching.

### 2. Watchlist as a Join Table

`user_movies` is a join between `users` and `movies` with extra columns: `state` (`want` | `watched`), `priority` (integer 1–5, nullable), `would_watch_again` (boolean, only meaningful when `state = 'watched'`). Priority rank is a user-assigned score, not a computed position — ties are allowed.

**Alternative considered**: Separate `want_to_watch` and `watched` tables. Rejected as needlessly duplicated structure; a single `state` column expresses the same thing.

### 3. Watch Plans Are Not Group-Scoped

A watch plan is created by a user and has an explicit invite list. It does not require a pre-existing group, though inviting a whole group is supported as a convenience (expands to individual invites at creation time). This keeps plans lightweight and ad-hoc.

**Alternative considered**: Plans owned by a group, membership = invite list. Rejected because it forces group creation before scheduling a one-off event.

### 4. Attendance RSVP Column

`watch_plan_invites` stores `attendance` as a nullable TEXT with values `'yes'`, `'no'`, `'maybe'`. NULL means the user has not responded. The invite row is created when a user is invited; the user updates their own row.

### 5. Suggestions Are Per-Plan Movie References

`watch_plan_movies` links a plan to a movie from the catalog. The row records who suggested it. Any invitee (including the plan creator) can suggest. A movie can only be suggested once per plan (unique constraint on `plan_id, movie_id`).

### 6. Vote Scale Stored as Integer

`watch_plan_votes` stores one row per `(plan_id, movie_id, user_id)`. The `vote` column is an INTEGER: −2 (definitely no), −1 (no), 0 (no preference), 1 (yes), 2 (definitely yes). NULL means no vote cast. Upsert semantics: submitting a vote replaces any prior vote.

**Alternative considered**: Separate numeric rating scale (1–5). Rejected to avoid confusion with priority rank. The signed −2/+2 scale communicates valence explicitly.

### 7. Database Schema

```sql
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

CREATE TABLE user_movies (
  user_id           INTEGER NOT NULL REFERENCES users(id),
  movie_id          INTEGER NOT NULL REFERENCES movies(id),
  state             TEXT    NOT NULL CHECK(state IN ('want','watched')),
  priority          INTEGER CHECK(priority BETWEEN 1 AND 5),
  would_watch_again INTEGER,    -- boolean; only set when state='watched'
  added_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, movie_id)
);

CREATE TABLE watch_plans (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT    NOT NULL,
  scheduled_date      TEXT    NOT NULL,   -- ISO 8601 date (YYYY-MM-DD)
  created_by_user_id  INTEGER NOT NULL REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE watch_plan_invites (
  plan_id    INTEGER NOT NULL REFERENCES watch_plans(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  attendance TEXT    CHECK(attendance IN ('yes','no','maybe')),
  PRIMARY KEY (plan_id, user_id)
);

CREATE TABLE watch_plan_movies (
  plan_id           INTEGER NOT NULL REFERENCES watch_plans(id),
  movie_id          INTEGER NOT NULL REFERENCES movies(id),
  suggested_by_user_id INTEGER NOT NULL REFERENCES users(id),
  suggested_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (plan_id, movie_id)
);

CREATE TABLE watch_plan_votes (
  plan_id  INTEGER NOT NULL REFERENCES watch_plans(id),
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  user_id  INTEGER NOT NULL REFERENCES users(id),
  vote     INTEGER NOT NULL CHECK(vote BETWEEN -2 AND 2),
  PRIMARY KEY (plan_id, movie_id, user_id),
  FOREIGN KEY (plan_id, movie_id) REFERENCES watch_plan_movies(plan_id, movie_id)
);
```

### 8. API Routes

All routes under `/api/movies/` are authenticated via existing auth middleware.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/movies/catalog` | List all movies (title search via `?q=`) |
| POST | `/api/movies/catalog` | Add a movie to the catalog |
| GET | `/api/movies/catalog/:id` | Get a single movie |
| GET | `/api/movies/watchlist` | Get current user's watchlist |
| PUT | `/api/movies/watchlist/:movieId` | Add/update a watchlist entry |
| DELETE | `/api/movies/watchlist/:movieId` | Remove from watchlist |
| GET | `/api/movies/plans` | List plans the current user is invited to or created |
| POST | `/api/movies/plans` | Create a watch plan (with initial invite list) |
| GET | `/api/movies/plans/:id` | Get plan detail (invites, suggestions, votes) |
| PUT | `/api/movies/plans/:id/attendance` | RSVP (yes/no/maybe) |
| GET | `/api/movies/plans/:id/suggestions` | List suggested movies for a plan |
| POST | `/api/movies/plans/:id/suggestions` | Suggest a movie for a plan |
| POST | `/api/movies/plans/:id/suggestions/:movieId/vote` | Cast or update a vote |

Group invite expansion (POST `/api/movies/plans`): when `invitees` contains a `{ groupId }` entry, the backend expands it to all current `group_members` at plan creation time.

### 9. Repository Pattern

Two new repository interfaces and SQLite implementations:

- `MovieRepository` — catalog CRUD + watchlist operations
- `WatchPlanRepository` — plan CRUD, invites, suggestions, votes

Follows the existing pattern: interface in `src/repositories/interfaces.ts`, implementation in `src/repositories/sqlite/movie.repository.ts` and `watch-plan.repository.ts`.

### 10. Frontend Page Structure

```
/                   → redirect to /watchlist
/watchlist          → personal watchlist (two tabs: Want to Watch / Watched)
/catalog            → browse all movies; add new movie
/plans              → list of plans the user is part of
/plans/new          → create a plan (pick date, invite users/groups)
/plans/:id          → plan detail: invited users, attendance, suggestions, voting
```

`NavBar` gets three links: Watchlist, Plans, Catalog.

The plan detail page shows:
- Header: plan title + date
- Attendance section: each invitee + their RSVP (current user can update their own)
- Suggestions section: each suggested movie with per-user votes and aggregate score (sum of votes); current user can vote; any invitee can add a suggestion from the catalog

### 11. Aggregate Score Display

The plan detail page computes a total score per suggestion as the sum of all votes cast. Unvoted entries contribute 0. This is purely client-side computed from the votes array returned by the API.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Group expansion at plan creation creates stale invites if group membership changes | Invites are snapshot at creation; this is intentional — the plan reflects who was invited, not current group membership |
| Watchlist priority rank allows ties | Intentional; a forced ranked list is more friction than it's worth |
| No edit/delete on plans | Out of scope for now; straightforward to add later |
| SQLite composite FKs on `watch_plan_votes` → `watch_plan_movies` | SQLite enforces composite FKs when `PRAGMA foreign_keys = ON`; already enabled in `db.ts` |
