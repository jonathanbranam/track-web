## Why

The Ball Merge leaderboard has two bugs that corrupt stored scores — zero scores are saved when a player quits immediately, and the leaderboard is fetched concurrently with score submission so the player's own new score is often missing from the post-game display. Additionally, the level picker gives no indication of existing scores, so players have no context for which levels have competition before they choose.

## What Changes

- **Skip zero-score submissions**: Do not submit or store a score of 0; both the client (before calling `submitScore`) and the server (validation) should reject score ≤ 0
- **Filter zeros from leaderboard output**: The leaderboard query SHALL exclude rows where `score = 0`, so existing zero rows in the DB are never surfaced (belt-and-suspenders alongside the submission guard)
- **Fix post-game leaderboard race**: Await the score submission before fetching the leaderboard so the player's just-recorded score always appears in the post-game display
- **Level picker leaderboard preview**: Each level card in the LevelPicker shows the current top player name and score (or "No scores yet"); tapping the score area opens the full leaderboard for that level

## Capabilities

### New Capabilities

- `ball-merge-level-picker-scores`: Leaderboard preview embedded in the level picker — top player and score per level, tappable to open the full leaderboard panel

### Modified Capabilities

- `ball-merge-leaderboard`: Score submission requirements change — score of 0 SHALL be rejected (server returns 422; client skips submission); submission SHALL complete before leaderboard is fetched on game-end; leaderboard query SHALL exclude zero scores

## Impact

- `src/routes/scores.ts` — tighten Zod schema: `score: z.number().int().positive()` (min 1)
- `src/repositories/sqlite/scores.repository.ts` — add `AND gs.score > 0` to the leaderboard query's WHERE clause
- `client-games/src/api.ts` — guard in `submitScore`: skip fetch if `score <= 0`; change return type to `Promise<void>` that resolves after POST completes (remove silent fire-and-forget so callers can await it)
- `client-games/src/games/ball-merge/BallMergeGame.tsx` — await `submitScore` before calling `openLeaderboard` in both `gameover` handler and `quit()`
- `client-games/src/games/ball-merge/LevelPicker.tsx` — fetch top entry per level on mount; render player name + score on each card; tap opens leaderboard panel
- `openspec/specs/ball-merge-leaderboard/spec.md` — update score submission requirement to reject score = 0 and require sequential submit-then-fetch
- `openspec/specs/ball-merge-level-picker-scores/spec.md` — new spec
