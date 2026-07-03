## Context

`client-play` today has a single tab (Putt) whose scoring is piggy-backed on the Trips data model (`/api/trips/:tripId/putt/...`). The score-tracker feature is a standalone, trip-independent scorekeeper for arbitrary tabletop and card games. It needs its own persistence, its own API surface, and a new tab in the Play app.

The backend follows a consistent pattern: SQLite via `better-sqlite3`, an ordered `MIGRATIONS` array in `src/db.ts` (each `{ id, up }` applied once, tracked in `schema_migrations`), a `TABLE_NAMES` export that must list every table, repository interfaces in `src/repositories/interfaces.ts` with SQLite implementations under `src/repositories/sqlite/`, and Hono routers registered in `src/app.ts` with per-app auth. The most recent migration id is `0037_sessions`, so this change adds `0038_score_tracker`.

The Play app already consumes shared auth (`@repo/auth`) and can call the existing `GET /api/social/users/connectable`, which returns the current user's connected users (`id`, `email`, `displayName`) — the picker for "select existing connected users" reuses this endpoint unchanged.

## Goals / Non-Goals

**Goals:**
- A new **Score** tab in `client-play` covering setup → per-round entry → live totals → completion → rematch/edit-setup.
- Persist games, their players, per-round scores, and a remembered list of game names so a game survives navigation and restarts.
- Support scores of **any integer** (negative, zero, positive).
- Support both **fixed** round counts and **unlimited** games, each with an explicit end path.
- A **game-name picker** backed by a remembered list, free-form entry, and a seed set (Sushi Go, Tides of Time, Pit, Farkle, Uno).

**Non-Goals:**
- Real-time multi-device / collaborative scoring. A game is edited by the single **scorekeeper** (the creating user) on one device; connected-user selection only pre-fills player names, it does not grant those users access to the game record.
- Per-game rule engines, win-condition logic, or auto-ranking beyond sorting by total. The app records and totals numbers; it does not know each game's rules.
- Decimal / fractional scores (integers only).
- Sharing the remembered game-name list across users.
- **Any leaderboard / cross-game ranking / standings** — explicitly deferred to a later change. This change persists completed games (final per-player scores, players, and timestamps) but presents them only as individual game records, never aggregated into a leaderboard.

## Decisions

### 1. Standalone data model, not tied to Trips
Four new tables under a `score_` prefix:

- **`score_games`** — `id`, `user_id` (owner/scorekeeper), `name`, `target_rounds` (INTEGER, **nullable** → unlimited), `status` (`'active' | 'completed'`), `created_at`, `completed_at` (nullable). Completed rows are **retained permanently** — the game record (players, final scores, and timestamps) is the persisted history; it is never deleted on completion.
- **`score_players`** — `id`, `game_id`, `user_id` (nullable — set when chosen from connected users), `name` (always stored — a snapshot label), `position` (0-based seat order).
- **`score_round_scores`** — `game_id`, `player_id`, `round_number` (1-based), `value` (INTEGER, any sign). Primary key `(game_id, player_id, round_number)`.
- **`score_game_names`** — `id`, `name`, `name_key` (lowercased, UNIQUE) for the remembered picker list.

Rounds are represented implicitly by `round_number` in `score_round_scores` rather than a separate `score_rounds` table — a round is nothing more than the set of scores sharing a round number, so a dedicated table would add nothing. The number of the current round = `max(round_number)` recorded so far.

*Alternative considered:* reusing the arcade `game_scores` table (`routes/scores.ts`). Rejected — it is a positive-only, single-score leaderboard keyed by `game_slug/mode/level`, with none of players, rounds, or negative values. Wrong shape entirely.

### 2. Player snapshot (store `name` even for connected users)
`score_players.name` is always populated, even when `user_id` is set. This keeps historical games readable if a display name later changes and lets free-form and connected players share one uniform table and rendering path. `user_id` is retained only so the picker can show "already added" state and future features could link back.

*Alternative:* join to `users` at read time for connected players. Rejected — couples game history to mutable profile data and complicates the mixed free-form/connected list.

### 3. Ownership = scorekeeper model (documented exception to equal-rights default)
Games are scoped to the creating `user_id`; all endpoints filter by the authenticated user, and a game referencing another user as a *player* grants that user **no** access. This is an intentional exception to the repo's equal-rights default because the feature is a local scorekeeper, not a shared live scoreboard (see Non-Goals). Connected-user selection is a name-entry convenience only.

### 4. Remembered game names: shared, low-sensitivity, seeded in migration
`score_game_names` is a single shared list (not per-user) — game titles carry no sensitive data, and a shared list gives everyone the same convenient picker. Dedup is case-insensitive via a UNIQUE `name_key`. The migration seeds the five requested titles. On game creation the server upserts the chosen name (`INSERT ... ON CONFLICT(name_key) DO NOTHING`) so any newly typed name is remembered automatically. The picker is fed by `GET /api/play/game-names` (sorted alphabetically) and free-form text is always allowed alongside it.

*Alternative:* scope names per user. Rejected as unnecessary isolation for non-sensitive strings; would also make seeding awkward (seed rows have no owner).

### 5. API surface — new `/api/play` router
A new `createScoreGamesRouter` registered at `app.route('/api/play', ...)` in `src/app.ts`, auth enforced at the app level like the other apps:

- `GET  /api/play/game-names` — remembered names for the picker.
- `GET  /api/play/score-games` — the caller's games (active first, then completed history newest-first) for resume and past-game review. Returns each game with its players and final per-player totals; no cross-game ranking.
- `POST /api/play/score-games` — create `{ name, targetRounds|null, players: [{ userId?, name }] }`; upserts the name; returns the full game.
- `GET  /api/play/score-games/:id` — full game: players + all round scores (for resume / rematch / edit-setup).
- `PUT  /api/play/score-games/:id/rounds/:roundNumber` — upsert the whole round `{ scores: [{ playerId, value }] }`. Idempotent, so editing a past round's numbers reuses the same call.
- `DELETE /api/play/score-games/:id/rounds/:roundNumber` — remove a round (undo).
- `POST /api/play/score-games/:id/complete` — set `status='completed'`, stamp `completed_at`; covers "Done" (unlimited), early-end (fixed), and the natural target-reached completion.

Running totals and per-round breakdowns are computed **client-side** from the returned round scores — trivial arithmetic, no need for a server aggregate endpoint.

*Alternative:* per-cell `PUT .../scores` (one entry at a time). The whole-round `PUT` was chosen because scores are entered a full round at a time; it also makes a round atomic and edits simpler. Individual-cell correction is still expressible by re-PUTting the round.

### 6. Client structure
Under `client-play/src/`: a `ScorePage` route added to `App.tsx` and a second entry in `components/NavBar.tsx` (the nav becomes two tabs: Putt, Score). Internally `ScorePage` is a small state machine — **Setup** (game name picker + players + rounds), **Play** (round entry + live scoreboard), **Results** (final totals + "New game (same players & rules)" / "Edit setup"). Types added to `types.ts`, calls added to `api.ts` under an `api.scoreGames` / `api.gameNames` group. "Edit setup" re-enters Setup pre-filled from the current game's players and rules; "New game" POSTs a fresh game with the same name, target, and player list.

## Risks / Trade-offs

- **[Client-side totals could drift from stored values]** → Totals are pure sums of the authoritative `score_round_scores` rows returned by the server; the client never persists a computed total, so a refresh always re-derives from source of truth.
- **[Scorekeeper model surprises users expecting shared live scoring]** → Documented as an explicit Non-Goal; the connected-user picker is framed as name entry, not invitation. Revisitable later without schema change (players already carry `user_id`).
- **[Free-form game names accumulate typos / near-duplicates in the shared list]** → Case-insensitive dedup collapses obvious duplicates; a future admin cleanup can prune. Acceptable for a low-stakes convenience list.
- **[Whole-round `PUT` overwrites concurrent edits]** → Single-scorekeeper model makes concurrent edits a non-issue; last write wins is fine.
- **[Deleting a middle round leaves a numbering gap]** → Round numbers are display labels derived from stored rows, not contiguous invariants; the UI renders rounds in `round_number` order and gaps are tolerated (delete is an undo-latest affordance in practice).

## Migration Plan

1. Add migration `0038_score_tracker` to `MIGRATIONS` in `src/db.ts`: create the four `score_*` tables and seed `score_game_names` with the five titles (`INSERT OR IGNORE`).
2. Add the four table names to `TABLE_NAMES` in the same file.
3. Add repository interface + SQLite implementation, register the router in `app.ts`.
4. Build client Score tab.
5. Update `openapi.yaml` (new `/api/play` routes) and `llm-context.md` (new feature area).

Migrations are additive and idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`), applied once and tracked in `schema_migrations`. **Rollback:** the change is purely additive — reverting the code leaves the unused tables in place with no effect on other apps; no down-migration is required.

## Open Questions

- Should players be **reorderable / removable** after a game starts, or only during setup? (Design assumes players are fixed once the first round is entered; editable only via "Edit setup" before scoring begins.)
- Is an explicit **tie indicator** wanted in final totals, or just sort-by-total descending? (Defaulting to sort-only unless requested.)
