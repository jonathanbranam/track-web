## Context

All six refinements target the existing `score-tracker` capability. Five are client-only (`client-play/src/pages/ScorePage.tsx` plus a new constants module and a shell tweak); one (delete a game) needs a new backend endpoint and repository method. The backend already has `SqliteScoreGameRepository` / `IScoreGameRepository`, the `createScoreGamesRouter` mounted at `/api/play`, and owner-scoped queries throughout — the new delete follows those patterns exactly. `UserChip` from `@repo/auth` already accepts a `hidden?: boolean` prop and returns `null` when set, so hiding it is a matter of plumbing a flag from `ScorePage` up to where the shell renders `<UserChip />`.

## Goals / Non-Goals

**Goals:**
- Confirmation on the two destructive actions (end game, discard game).
- A way to abandon an in-progress game without leaving a partial record.
- Hide the floating pill while a game is open so it never overlaps the scoreboard.
- Autofill round counts for known games from a single in-code source of truth.
- Delete completed games from History via swipe, backed by an owner-scoped endpoint.

**Non-Goals:**
- No leaderboard/analytics (still explicitly out of scope for score-tracker).
- No undo history beyond the immediate swipe-delete affordance.
- No server-side "known games" catalog — defaults live in client code only.
- No soft-delete / archive of games — delete is a hard delete.

## Decisions

### 1. Hiding the pill: a small chrome context in `client-play`
`UserChip` is rendered by `AppShell` in `App.tsx`, a sibling of the `<Routes>` that contain `ScorePage` — so `ScorePage` can't pass it a prop directly. Introduce a tiny context in `client-play` (e.g. `ChromeContext` exposing `{ chromeHidden, setChromeHidden }`) provided at `AppShell` level. `AppShell` renders `<UserChip hidden={chromeHidden} />`; `ScorePage` calls `setChromeHidden(true)` when its view is `play` or `results` and `false` otherwise (via `useEffect` on the view, with cleanup resetting to `false` on unmount).

*Alternatives considered:* (a) route-based hiding — rejected because play/results are internal `ScorePage` state, not routes; (b) a module-level event/store — rejected as heavier and less idiomatic than context; (c) moving `UserChip` into each page — rejected because it's a shell-level concern shared by the Putt tab too.

### 2. Confirmations: native `confirm()` for parity with existing code
Use `window.confirm(...)` for the end-game and discard confirmations, matching the existing pattern already used in the Putt page (`handleDeleteRound` uses `confirm(...)`). Keeps the change small and consistent; a custom modal is unnecessary for a single-user, mobile-first tool.

*Alternative:* a styled confirmation sheet — deferred; `confirm()` is adequate and already in use.

### 3. Discard = delete the in-progress game (reuse the delete endpoint)
"Quit and discard" is semantically the same server operation as deleting a game: remove the game row and its players/scores. Rather than a special "abandon" state, discard calls the same `DELETE /api/play/score-games/:id`. This keeps one code path for removal and avoids a partial/abandoned status the spec doesn't want.

### 4. Delete endpoint + cascading removal
Add `DELETE /api/play/score-games/:id` → `IScoreGameRepository.deleteGame(id, userId): boolean`, owner-scoped (returns 404 when the game isn't found for that user). The SQLite implementation deletes in a transaction; `score_players` and `score_round_scores` already declare `ON DELETE CASCADE` referencing `score_games`, but since the app does not enable `PRAGMA foreign_keys` globally, the repository will **explicitly delete child rows** (round scores, players) then the game inside one transaction — matching how the rest of the codebase manages related rows rather than relying on cascade.

### 5. Known-game defaults: a typed constant map
Add `client-play/src/gameDefaults.ts` exporting something like `GAME_DEFAULTS: Record<string, { rounds: number }>` keyed by a normalized (lowercased, trimmed) game name, seeded with `sushi go` and `tides of time` → `{ rounds: 3 }`. Setup looks up the selected name on change; if a match exists **and the round field is empty/untouched**, it fills the round input. Track an `roundsTouched` flag (set when the user edits the field) so autofill never clobbers a manual entry, and so switching between known games still updates an untouched field.

### 6. Swipe-to-delete in History
Implement a lightweight touch swipe on each History row (touchstart/move/end tracking horizontal delta) revealing a Delete action; on delete, `confirm()` then call the delete endpoint and drop the row from local state. No new dependency. The swipe is additive to the existing tap-to-view behavior (tap still opens results).

*Alternative:* a swipe library — rejected to avoid a dependency for one gesture.

## Risks / Trade-offs

- **[Autofill fights the user when switching games]** → the `roundsTouched` flag means autofill only ever writes to a field the user hasn't edited; once they type, it's theirs.
- **[`confirm()` looks unstyled]** → acceptable for a personal tool and consistent with existing Putt code; can be upgraded later without spec change.
- **[Swipe gesture conflicts with vertical scroll]** → only treat mostly-horizontal moves past a threshold as a swipe; let vertical moves scroll normally.
- **[Deleting without foreign_keys leaves orphan rows]** → repository deletes children explicitly in a transaction, so no orphans regardless of the `foreign_keys` pragma.
- **[Hidden pill not restored on unmount]** → the chrome-context effect resets `chromeHidden` to `false` on view change and on `ScorePage` unmount.

## Migration Plan

No database migration — the tables already exist and the delete endpoint is additive. Steps: add repo method + interface, add the delete route, add the chrome context + `UserChip hidden` wiring, add `gameDefaults.ts`, update `ScorePage` flows, add tests, update `openapi.yaml` and `llm-context.md`. **Rollback:** purely additive; reverting the code removes the endpoint and UI with no data-shape change.

## Open Questions

- Should discarding an in-progress game also be reachable from the games list (long-press/swipe on an active game), or only from within the open game? (Design assumes only from within the open game; History swipe-delete covers completed games.)
