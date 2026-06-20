## Why

The Ball Merge game currently only stores a best score per browser — there is no way to compare scores across sessions or between players. A server-side leaderboard tied to authenticated users adds a competitive arcade dimension and makes scores durable and meaningful.

## What Changes

- New SQLite table `game_scores` storing per-game-session scores linked to the authenticated user, with `mode` and `level` fields for future game variants.
- New backend API endpoints: submit a score on game-over, fetch the top 10 leaderboard for a given game slug filtered by mode and level.
- New leaderboard UI in the games app: an arcade-style "Top 10" overlay that appears on game-over and can be toggled in-game, showing rank, player name, and score.
- Score is submitted automatically on game-over (no manual action required from the player).
- The player's name shown on the leaderboard is taken from their authenticated user record (email local-part or display name) — no separate name entry.
- Initial mode is **`classic`**; initial level is **`box`** (the current rectangular three-walled container — named after the container shape, consistent with future levels: wine-glass, jar, jug, vase). Leaderboard is scoped per mode + level combination.

## Capabilities

### New Capabilities

- `ball-merge-leaderboard`: Server-side score persistence and arcade-style top-10 leaderboard for the Ball Merge game. Covers the `game_scores` DB table (with `mode` and `level` columns), the submit-score and fetch-leaderboard API endpoints, and the leaderboard UI component in `client-games`.

### Modified Capabilities

- `games-ball-merge`: The game-over flow gains an automatic score submission step and a leaderboard panel. The existing localStorage best score tracking is removed — the server leaderboard is the sole scoreboard.

## Impact

- **`src/db.ts`** — new migration adds `game_scores(id, user_id, game_slug, mode, level, score, achieved_at)`
- **`src/routes/`** — new `scores.ts` route file; registered in `app.ts`; protected by auth middleware
- **`src/repositories/interfaces.ts`** and **`src/repositories/sqlite/`** — new `ScoresRepository` interface and SQLite implementation
- **`openapi.yaml`** — two new endpoints: `POST /api/scores` and `GET /api/scores/leaderboard?game=<slug>&mode=<mode>&level=<level>&limit=10`
- **`client-games/src/`** — new `Leaderboard` component; `BallMergeGame.tsx` submits score on game-over and shows the leaderboard panel
- **`llm-context.md`** — update to document the scores feature area
