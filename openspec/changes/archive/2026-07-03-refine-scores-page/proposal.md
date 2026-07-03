## Why

The score tracker shipped in `client-play` and has since gotten several hands-on fixes. Real use surfaced more rough edges: there's no way to abandon a game without finishing it, destructive actions (ending a game) happen with no confirmation, the floating user pill overlaps the scoreboard while playing, common games always need their round count typed in by hand, and finished games pile up in History with no way to remove them. This change refines those flows and, at the same time, captures in the spec a fix already made — adding the game's creator as a default player.

## What Changes

- **Spec the owner-as-default-player fix** (already implemented): creating a new game seeds the player list with the creating user, labeled "you" and removable; the creator can also re-add themselves from a picker chip. This change updates the `score-tracker` spec to require that behavior.
- **Discard / quit a game without saving** — from an in-progress game, allow the user to quit and discard the current game (removing it rather than keeping a partial record). **Requires a confirmation prompt.**
- **Confirm before ending a game** — the "Done" / end-game / finish action **requires a confirmation prompt** before completing the game.
- **Hide the user-name pill during play** — the floating `UserChip` is hidden while viewing or scoring a game (Play and Results views), and restored on the list/setup views.
- **Known-game default configuration** — introduce a code constant mapping known games to default settings, and **autofill the round count** when the user picks such a game. Seed it so **Sushi Go** and **Tides of Time** default to **3 rounds**. Autofill only pre-fills an empty/unedited round field; it never overrides a value the user typed.
- **Swipe-to-delete from History** — allow deleting a completed game from the History list via a swipe gesture (with a confirmation/undo affordance). Adds a backend delete endpoint for a game and all its rows.

## Capabilities

### New Capabilities
<!-- None — all changes refine the existing score-tracker capability. -->

### Modified Capabilities
- `score-tracker`: Add requirements for creator-as-default-player, discard-game-with-confirmation, confirm-before-ending, hiding the user pill during play, known-game default round autofill, and deleting completed games from history (new `DELETE /api/play/score-games/:id`).

## Impact

- **Client** (`client-play/src/`): `pages/ScorePage.tsx` (discard/confirm flows, autofill on game-name select, swipe-to-delete rows), a new constants module (e.g. `gameDefaults.ts`), and a mechanism to hide `UserChip` from the app shell (`App.tsx`) while a game is open.
- **Backend** (`src/`): new `DELETE /api/play/score-games/:id` route, `IScoreGameRepository.deleteGame` + SQLite implementation (cascading to players and round scores), owner-scoped.
- **Tests**: repository + route tests for game deletion and owner scoping.
- **Docs**: `openapi.yaml` (new delete route), `llm-context.md` (score-tracker behavior notes). No new subdomain, so Caddy/deploy files are unaffected.
