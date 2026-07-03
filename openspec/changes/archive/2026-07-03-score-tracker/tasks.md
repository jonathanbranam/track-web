## 1. Database

- [x] 1.1 Add migration `0038_score_tracker` to `MIGRATIONS` in `src/db.ts` creating tables `score_games` (`id`, `user_id`, `name`, `target_rounds` nullable, `status`, `created_at`, `completed_at` nullable), `score_players` (`id`, `game_id`, `user_id` nullable, `name`, `position`), `score_round_scores` (`game_id`, `player_id`, `round_number`, `value`; PK on `game_id,player_id,round_number`), and `score_game_names` (`id`, `name`, `name_key` UNIQUE)
- [x] 1.2 Seed `score_game_names` in the migration with Sushi Go, Tides of Time, Pit, Farkle, Uno (`INSERT OR IGNORE`, using lowercased `name_key`)
- [x] 1.3 Add `score_games`, `score_players`, `score_round_scores`, `score_game_names` to `TABLE_NAMES` in `src/db.ts`

## 2. Repository

- [x] 2.1 Define `IScoreGameRepository` (and row/DTO types) in `src/repositories/interfaces.ts`: create game, get game with players + round scores, list caller's games (active first, then completed newest-first), upsert a round, delete a round, complete a game, list game names, remember a game name
- [x] 2.2 Implement `src/repositories/sqlite/scoreGame.repository.ts` against the new tables, scoping every game query by `user_id`; upsert game name (`ON CONFLICT(name_key) DO NOTHING`) on create; allow any integer `value` (including negative/zero)
- [x] 2.3 Wire the new repository into the repository construction/registration used by `src/app.ts`

## 3. API routes

- [x] 3.1 Create `src/routes/scoreGames.ts` exporting `createScoreGamesRouter` with auth enforced at the app level and zod validation
- [x] 3.2 `GET /game-names` (remembered names, alphabetical) and `GET /score-games` (caller's games with players + totals)
- [x] 3.3 `POST /score-games` create `{ name, targetRounds|null, players: [{ userId?, name }] }` — reject empty player list; upsert the game name; return the full game
- [x] 3.4 `GET /score-games/:id` full game (players + all round scores), 404/403 when not owned by caller
- [x] 3.5 `PUT /score-games/:id/rounds/:roundNumber` upsert whole round `{ scores: [{ playerId, value }] }`; `DELETE /score-games/:id/rounds/:roundNumber` remove a round
- [x] 3.6 `POST /score-games/:id/complete` set `status='completed'` and stamp `completed_at`
- [x] 3.7 Register `app.route('/api/play', createScoreGamesRouter(...))` in `src/app.ts`

## 4. Backend tests

- [x] 4.1 Repository tests (`scoreGame.repository.test.ts`): create/get/list, negative & zero scores, round upsert/replace/delete, complete sets status + timestamp, game-name remember & case-insensitive dedup, caller-scoping isolation
- [x] 4.2 Route tests (`scoreGames.test.ts`): auth required (401), empty-player rejection, create→enter rounds→complete flow, seeded game names present, cross-user access returns 403/404

## 5. Play client — types & API

- [x] 5.1 Add `ScoreGame`, `ScorePlayer`, `ScoreRound`/round-scores, and game-name types to `client-play/src/types.ts`
- [x] 5.2 Add `api.scoreGames` (list/create/get/putRound/deleteRound/complete) and `api.gameNames` (list) plus the connected-users call to `client-play/src/api.ts`

## 6. Play client — UI

- [x] 6.1 Add a **Score** entry to `client-play/src/components/NavBar.tsx` and a `/score` route in `client-play/src/App.tsx` (behind `AuthGuard`)
- [x] 6.2 Build `ScorePage` as a Setup → Play → Results state machine
- [x] 6.3 Setup: game-name picker (remembered list + free-form), player selector (connected users + free-form add), optional round-count field (blank = unlimited)
- [x] 6.4 Play: per-round score entry accepting any integer incl. negatives/zero; live per-round breakdown and running totals
- [x] 6.5 Completion: auto-final on target reached, "Done" for unlimited games, early-end for fixed-round games → Results with final totals
- [x] 6.6 Results: "New game (same players & rules)" and "Edit setup" (reopens Setup pre-filled) actions
- [x] 6.7 Resume/history: on entering the tab, offer any active game to resume and list completed games as individual records (no leaderboard)

## 7. Docs

- [x] 7.1 Update `openapi.yaml` with the new `/api/play/score-games` and `/api/play/game-names` routes
- [x] 7.2 Update `llm-context.md` with the score-tracker feature area
- [x] 7.3 Add a `docs/play/planning.md` entry (or note in the relevant planning doc) for deferred follow-ups (leaderboard, mid-game player edits)

## 8. Verify

- [x] 8.1 Run `npm run build` (client-play + server) and the new test suites; confirm green
- [x] 8.2 Manually drive setup → multi-round entry (incl. negatives) → completion → rematch/edit-setup and confirm totals and persistence across reload
