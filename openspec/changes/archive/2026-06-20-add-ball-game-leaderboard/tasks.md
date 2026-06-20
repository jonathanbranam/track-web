## 1. Database

- [x] 1.1 Add migration `0027_game_scores` to `MIGRATIONS` array in `src/db.ts` — creates `game_scores(id INTEGER PK AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), game_slug TEXT NOT NULL, mode TEXT NOT NULL, level TEXT NOT NULL, score INTEGER NOT NULL, achieved_at TEXT NOT NULL)` with an index on `(game_slug, mode, level, score DESC)`
- [x] 1.2 Add `'game_scores'` to `TABLE_NAMES` in `src/db.ts` (after `'api_tokens'`)

## 2. Repository

- [x] 2.1 Add types and interface to `src/repositories/interfaces.ts`: `GameScore`, `LeaderboardEntry` (rank, playerName, score), `CreateGameScoreInput`, and `IGameScoreRepository` with methods `submit(input): GameScore` and `getLeaderboard(gameSlug, mode, level, limit): LeaderboardEntry[]`
- [x] 2.2 Create `src/repositories/sqlite/scores.ts` implementing `IGameScoreRepository` — `submit` inserts a row; `getLeaderboard` queries `MAX(score) GROUP BY user_id` joined to `users` for display name / email local-part, ordered by score DESC, limited to `min(limit, 50)`

## 3. Backend Route

- [x] 3.1 Create `src/routes/scores.ts` with `createScoresRouter(scoreRepo)` — `POST /api/scores` validates body (`gameSlug`, `mode`, `level`, `score: integer`) via Zod, takes `userId` from session, calls `scoreRepo.submit()`, returns 201
- [x] 3.2 Add `GET /api/scores/leaderboard` to the same router — query params `game` (required), `mode` (required), `level` (required), `limit` (optional, default 10, max 50); calls `scoreRepo.getLeaderboard()`, returns `{ leaderboard: LeaderboardEntry[] }`
- [x] 3.3 Wire `createScoresRouter` into `src/app.ts` under `/api/scores`, behind the existing auth middleware; instantiate `SqliteGameScoreRepository` from `src/db.ts`

## 4. Tests

- [x] 4.1 Create `src/routes/scores.test.ts` — in-process Hono app with in-memory SQLite; test: `POST /api/scores` returns 201 and persists row; `GET /api/scores/leaderboard` returns personal bests ranked highest-to-lowest; multiple scores for same user appear as one entry (their best); `POST /api/scores` without session returns 401

## 5. Admin CLI

- [x] 5.1 Add `scores:list` command to `scripts/admin.ts` with optional `--game`, `--mode`, `--level` filters and `--json` flag — prints `id`, `email`, `game_slug`, `mode`, `level`, `score`, `achieved_at`
- [x] 5.2 Add `scores:clear` command to `scripts/admin.ts` requiring `--game`, `--mode`, `--level`, and `--confirm` flags — without `--confirm` prints warning and exits; with `--confirm` deletes matching rows and prints count

## 6. OpenAPI

- [x] 6.1 Add `POST /api/scores` and `GET /api/scores/leaderboard` to `openapi.yaml` with request/response schemas

## 7. Client — API Layer

- [x] 7.1 Add `submitScore(gameSlug: string, mode: string, level: string, score: number): Promise<void>` to `client-games/src/api.ts` — fire-and-forget, swallows errors
- [x] 7.2 Add `fetchLeaderboard(gameSlug: string, mode: string, level: string, limit?: number): Promise<LeaderboardEntry[]>` to `client-games/src/api.ts`

## 8. Client — Leaderboard Component

- [x] 8.1 Create `client-games/src/components/Leaderboard.tsx` — renders an arcade-style ranked table (rank, player name, score); highlights the current player's row; shows a loading skeleton while fetching; shows an empty/error state if fetch fails or returns no entries

## 9. Client — BallMergeGame Updates

- [x] 9.1 Remove `BEST_KEY`, `loadBest()`, `best` state, `setBest`, and all `localStorage` reads/writes from `BallMergeGame.tsx`
- [x] 9.2 Add `leaderboardOpen` state and leaderboard data state (`entries`, `loading`) to `BallMergeGame.tsx`
- [x] 9.3 On `gameover` event: call `submitScore('ball-merge', 'classic', 'box', finalScore)` then `fetchLeaderboard('ball-merge', 'classic', 'box')` and store result; set `leaderboardOpen = true`
- [x] 9.4 Add trophy icon button to the HUD (alongside score/best display) that toggles `leaderboardOpen`; render `<Leaderboard>` as a dismissible panel when `leaderboardOpen` is true
- [x] 9.5 Update the game-over overlay to remove the "Best" display and render `<Leaderboard>` instead; ensure restart clears leaderboard state

## 10. Documentation

- [x] 10.1 Update `llm-context.md` to document the `game_scores` table, `/api/scores` endpoints, and that Ball Merge score display is server-side only
- [x] 10.2 Update `README.md` (or equivalent docs) to document the two new admin CLI commands (`scores:list`, `scores:clear`)

## 11. Verification

- [x] 11.1 Run `npm run build:games` and confirm zero TypeScript errors
- [x] 11.2 Run existing tests (`src/routes/scores.test.ts` and full test suite) and confirm all pass
