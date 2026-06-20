## Context

The Ball Merge leaderboard (`ball-merge-leaderboard` spec) has two bugs affecting score integrity: zero scores are stored when players quit immediately, and the post-game leaderboard is fetched concurrently with score submission so the player's own score is often absent from the display. Additionally, the level picker (`LevelPicker.tsx`) shows no score context — players have no way to know if there's existing competition on a level before choosing it.

Current state:
- `submitScore` in `client-games/src/api.ts` is fire-and-forget (swallows all errors, returns `void` immediately)
- `BallMergeGame.tsx` calls `submitScore(...)` then `openLeaderboard(...)` without awaiting the submit
- Zod schema in `src/routes/scores.ts` allows `score: 0` (`nonnegative()`)
- Leaderboard SQL query has no filter on score value
- `LevelPicker.tsx` is a pure picker with no data fetching

## Goals / Non-Goals

**Goals:**
- Prevent score = 0 from being stored or shown (three layers: client guard, server validation, DB query filter)
- Ensure the post-game leaderboard always includes the player's just-submitted score
- Show the current top player and score on each level card in the picker
- Allow players to view the full leaderboard for a level directly from the picker

**Non-Goals:**
- Retrying failed score submissions
- Surfacing submission errors to the user
- Adding a new API endpoint for bulk level score summaries (parallel per-level requests are acceptable at the current scale of 8 levels)

## Decisions

### Zero score — three-layer guard

**Decision**: Block score = 0 at client, server, and query.

1. **Client** (`submitScore`): skip the POST entirely if `score <= 0`
2. **Server** (`scores.ts` Zod schema): change `nonnegative()` → `positive()` (rejects 0, returns 422)
3. **DB query** (`scores.repository.ts`): add `AND gs.score > 0` to the leaderboard WHERE clause

Layer 3 is essential: existing zero rows are already in the DB and would otherwise remain visible forever. Layers 1 and 2 prevent future pollution.

### Race condition — await submit before fetching leaderboard

**Decision**: Change `submitScore` to return a real promise (the fetch), and make the `gameover`/`quit` paths await it before calling `openLeaderboard`.

`submitScore` becomes `async` and returns the POST promise (still catches errors internally so callers don't need try/catch). The `gameover` event handler and `quit()` in `BallMergeGame.tsx` become async and await the submit first.

Trade-off: the leaderboard appears slightly later (~one network round-trip after game end). Acceptable — the user sees "Game Over" immediately; the leaderboard panel loads a moment after.

### Level picker score data — parallel per-level fetches

**Decision**: `LevelPicker` fetches `fetchLeaderboard(game, mode, levelId, 1)` for each level in parallel on mount, storing results in local state. No new API endpoint.

Alternatives considered:
- **New `/api/scores/summary` endpoint returning top-1 per level**: Cleaner network-wise but adds server surface for a 8-request saving that matters only at scale. Deferred.
- **Fetch only on hover**: Adds complexity and delays the data; eager fetch is simpler and fast enough.

`LevelPicker` receives an `onShowLeaderboard: (levelId: string) => void` prop from `BallMergeGame`. Tapping a level's score chip calls this callback, which invokes the existing `openLeaderboard` function — reusing the existing panel without duplication.

## Risks / Trade-offs

- **8 parallel leaderboard requests on picker mount**: Negligible at current user count; revisit if levels grow significantly → add a summary endpoint then.
- **Leaderboard panel renders over picker**: The mid-game panel condition (`leaderboardOpen && !gameOver`) already handles this correctly; no layout changes needed.
- **Existing zero rows in DB**: The query filter handles these. They remain in the DB (harmless) but are never surfaced.

## Migration Plan

No schema migration required. The DB filter and client guard are additive; existing zero rows stay in place but become invisible. Deploy is a normal build + restart.
