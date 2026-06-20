## 1. Server — reject zero scores

- [x] 1.1 Change `score` Zod schema in `src/routes/scores.ts` from `nonnegative()` to `positive()` (rejects 0, returns 422)
- [x] 1.2 Update `src/routes/scores.test.ts` to assert that `score: 0` returns 422

## 2. Repository — filter zeros from leaderboard query

- [x] 2.1 Add `AND gs.score > 0` to the WHERE clause in `getLeaderboard` in `src/repositories/sqlite/scores.repository.ts`

## 3. Client — zero-score guard and race condition fix

- [x] 3.1 Change `submitScore` in `client-games/src/api.ts` to return `Promise<void>` that resolves after the POST (keep internal catch so callers don't need try/catch); skip the POST and resolve immediately if `score <= 0`
- [x] 3.2 In `BallMergeGame.tsx`, make the `gameover` event handler async and `await submitScore(...)` before calling `openLeaderboard(...)`
- [x] 3.3 In `BallMergeGame.tsx`, make `quit()` async and `await submitScore(...)` before calling `openLeaderboard(...)`

## 4. Level picker — top score per level

- [x] 4.1 In `LevelPicker.tsx`, on mount fetch `fetchLeaderboard(GAME_SLUG, MODE, levelId, 1)` in parallel for all levels; store results in local state keyed by level id
- [x] 4.2 Render top player name and score on each level card; show "No scores yet" when the array is empty or fetch is pending
- [x] 4.3 Accept `onShowLeaderboard: (levelId: string) => void` prop in `LevelPicker`; wire the score area as a tappable element that calls `onShowLeaderboard(level.id)`
- [x] 4.4 In `BallMergeGame.tsx`, pass `onShowLeaderboard={openLeaderboard}` to `<LevelPicker>`; confirm the mid-game leaderboard panel renders correctly over the picker

## 5. Verification

- [x] 5.1 Build client-games (`npm run build:watch`) and confirm zero TypeScript errors
- [x] 5.2 Run `src/routes/scores.test.ts` and confirm all tests pass
- [x] 5.3 Update `openapi.yaml` — change `score` field description/minimum to reflect `minimum: 1`
