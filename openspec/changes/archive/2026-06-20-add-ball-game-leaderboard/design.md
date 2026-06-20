## Context

Ball Merge currently tracks a best score only in `localStorage` — per-browser, anonymous, and invisible to anyone else. The app already has multi-user auth (`users` table, session cookies) so we can attach scores to real users without any new identity work.

The backend follows a consistent pattern: repository interface → SQLite implementation → Hono route factory → registered in `app.ts`. Admin operations live in `scripts/admin.ts` using Commander. This change adds one new table, one new repository, one new route module, two new API endpoints, two admin CLI commands, one API test file, and a leaderboard UI component.

## Goals / Non-Goals

**Goals:**
- Persist every game-over score server-side, linked to the authenticated user and tagged with `game_slug`, `mode`, and `level`
- Expose a leaderboard endpoint returning each user's personal best (top N), ranked highest-to-lowest
- Show the leaderboard in the games UI on game-over and on demand
- Admin CLI commands to inspect and clear scores
- API test coverage for submit and leaderboard endpoints

**Non-Goals:**
- Score submission for anonymous (unauthenticated) users — auth is already required for the games app
- Leaderboard filtering by date range or pagination (not needed for top-10 arcade display)
- Real-time live leaderboard updates (polling or websocket) — page-load fetch is sufficient
- Providing a local-only fallback score when the server is unreachable — the server leaderboard is the sole scoreboard

## Decisions

### DB table: one row per game session, all scores kept

`game_scores(id, user_id, game_slug, mode, level, score, achieved_at)` — append-only. Every game-over event inserts a new row regardless of score; no deduplication or replace-if-better at write time.

**Alternatives considered:** upsert-best-only (one row per user+slug+mode+level). Rejected — losing history makes future analytics impossible and the table will be small.

The leaderboard query derives each user's personal best with `MAX(score) ... GROUP BY user_id`, ranked and limited at read time.

### Leaderboard: personal best per user, not all-time raw scores

A user appears on the leaderboard once, showing their highest score for the given `game_slug + mode + level` combo. Raw history is stored but not exposed by this endpoint.

### Display name: `display_name` → email local-part fallback

The leaderboard response includes a `playerName` field: `users.display_name` if set, otherwise the portion of `email` before `@`. Full email addresses are never returned by the leaderboard endpoint.

### Score submission: fire-and-forget on game-over, no blocking

`BallMergeGame.tsx` calls `submitScore()` after emitting `gameover`. The UI does not wait for the server response before showing the game-over overlay. The leaderboard panel fetches fresh data after submission (short delay). A failed submission is silently ignored on the client — the server leaderboard is the sole scoreboard and the game-over overlay still renders normally.

### `mode` and `level` as free-form strings with defaults

Stored as `TEXT NOT NULL` with no CHECK constraint. Current values are `classic` and `box`. Constraining the column now would require a migration for every future mode/level. The application layer enforces valid values via Zod schema validation on the POST endpoint.

### Route: `/api/scores`, admin-protected leaderboard read is not needed

`POST /api/scores` — authenticated user submits their own score; `userId` comes from the session, not the request body (users cannot impersonate each other).

`GET /api/scores/leaderboard` — query params `game`, `mode`, `level`, `limit` (default 10, max 50). Open to all authenticated users; no admin restriction needed since it only returns aggregated best scores + display names.

### Admin CLI: two commands in `scripts/admin.ts`

- `scores:list [--game <slug>] [--mode <m>] [--level <l>] [--json]` — raw score rows with user email
- `scores:clear --game <slug> --mode <m> --level <l>` — delete all scores for a combo (for resetting a leaderboard)

### Testing: new `src/routes/scores.test.ts`

Follows the pattern of `auth.test.ts` and `entries.test.ts` — in-process Hono app with an in-memory SQLite test DB. Covers: submit returns 201 with the saved score; leaderboard returns top-N personal bests in ranked order; unauthenticated submit returns 401.

## Risks / Trade-offs

- **Score spam** — a user could submit many low scores without playing. Mitigation: not addressed in this change; the leaderboard only shows each user's best, so spam doesn't pollute the display. Rate limiting is a future concern.
- **`display_name` is nullable** — the email local-part fallback is deterministic and doesn't expose the full address, but display names are the preferred player identity. Users without a display name will show as e.g. `jon` instead of a chosen handle. Acceptable for a single-family app.
- **No offline fallback** — if the server is unreachable, score submission silently fails and the game-over overlay shows no leaderboard data. Acceptable for a self-hosted, always-online app.

## Migration Plan

1. Add migration `0027_game_scores` to `src/db.ts` (append to `MIGRATIONS` array).
2. Add `'game_scores'` to `TABLE_NAMES` in the same file (after `api_tokens`).
3. Add `IGameScoreRepository` and supporting types to `src/repositories/interfaces.ts`.
4. Implement `SqliteGameScoreRepository` in `src/repositories/sqlite/scores.ts`.
5. Add `createScoresRouter` in `src/routes/scores.ts`; wire into `app.ts`.
6. Add `scores:list` and `scores:clear` commands to `scripts/admin.ts`.
7. Add `src/routes/scores.test.ts`.
8. Update `openapi.yaml` with the two new endpoints.
9. Add `submitScore` / `fetchLeaderboard` to `client-games/src/api.ts`.
10. Add `Leaderboard.tsx` component to `client-games/src/components/`.
11. Update `BallMergeGame.tsx` to submit score on game-over and render the leaderboard panel.
12. Update `llm-context.md`.

No data migration required — new table, no existing data affected. Rollback: remove the migration (safe while no production rows exist) and revert the code changes.

## Open Questions

Resolved:
- **Leaderboard visibility**: shown automatically on game-over; also accessible mid-game via a trophy button in the HUD.
- **`scores:clear` safety gate**: requires `--confirm` flag to prevent accidental wipes.
