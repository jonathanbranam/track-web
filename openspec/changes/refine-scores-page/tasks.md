## 1. Backend — delete a game

- [x] 1.1 Add `deleteGame(id: number, userId: number): boolean` to `IScoreGameRepository` in `src/repositories/interfaces.ts`
- [x] 1.2 Implement `deleteGame` in `src/repositories/sqlite/scoreGame.repository.ts`: owner-scoped; in a transaction delete `score_round_scores`, then `score_players`, then the `score_games` row; return whether a game was removed
- [x] 1.3 Add `DELETE /score-games/:id` to `src/routes/scoreGames.ts` → 200 on success, 404 when not found/owned
- [x] 1.4 Repository test: delete removes game + players + round scores; returns false / no-op for another user's game
- [x] 1.5 Route test: owner can delete (200), non-owner gets 404, unauthenticated gets 401

## 2. Client — known-game defaults

- [x] 2.1 Add `client-play/src/gameDefaults.ts` exporting `GAME_DEFAULTS` keyed by normalized (lowercased/trimmed) game name, seeded with `sushi go` and `tides of time` → `{ rounds: 3 }`, plus a lookup helper
- [x] 2.2 In `SetupView`, track a `roundsTouched` flag (set on manual edit); when the selected game name matches a known-game entry and the round field is empty/untouched, autofill the default rounds; never override a typed value

## 3. Client — hide user pill during play

- [x] 3.1 Add a chrome context in `client-play` (e.g. `ChromeContext` with `{ chromeHidden, setChromeHidden }`) provided at `AppShell` level in `App.tsx`
- [x] 3.2 Render `<UserChip hidden={chromeHidden} />` in `AppShell`
- [x] 3.3 In `ScorePage`, `setChromeHidden(true)` while the view is `play` or `results`, `false` otherwise; reset to `false` on unmount

## 4. Client — confirmations & discard

- [x] 4.1 Require `window.confirm` before completing a game (Done / early-end / finish) in `PlayView`; cancelling leaves the game active
- [x] 4.2 Add a "Quit & discard" action to `PlayView` that, after confirmation, calls the delete endpoint and returns to the list (removing the game from local state)
- [x] 4.3 Add `api.scoreGames.delete(id)` to `client-play/src/api.ts`

## 5. Client — swipe-to-delete in History

- [x] 5.1 Add a horizontal-swipe affordance to History rows in `ListView` (touch delta tracking, horizontal-threshold so vertical scrolling still works) revealing a Delete action; tap still opens results
- [x] 5.2 On delete: `confirm()` then call `api.scoreGames.delete(id)` and drop the game from local state

## 6. Spec-only: creator-as-default-player

- [x] 6.1 Verify the shipped behavior matches the spec (new game seeds creator as "you", removable, re-addable; edit-setup/rematch preserve existing players) — adjust `SetupView` only if it diverges

## 7. Docs

- [x] 7.1 Update `openapi.yaml` with `DELETE /api/play/score-games/{id}`
- [x] 7.2 Update `llm-context.md` score-tracker notes (delete endpoint, creator-default-player, known-game round defaults)

## 8. Verify

- [x] 8.1 Run `npm run build` and the new/updated test suites; confirm green
- [x] 8.2 Drive the flows: known-game autofill (and no-override), end-game & discard confirmations, pill hidden during play, swipe-delete from history, creator default player add/remove/re-add
