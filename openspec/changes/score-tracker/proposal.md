## Why

The Play app currently only tracks disc-golf putting (Putt tab). Households and game nights need a simple, general-purpose way to keep score for tabletop and card games — something everyone reaches for a phone or scrap paper to do today. Adding a score-tracking tab to `client-play` turns the app into the go-to scorekeeper for any game with per-round points.

## What Changes

- **New "Score" tab** in `client-play` for tracking scores across a wide range of tabletop and card games.
- **Game setup**: create a game by adding players. Players may be selected from the current user's **connected users** (via the existing social-connections list) or added freely as ad-hoc names.
- **Round configuration**: setup asks for an optional target **number of rounds**; leaving it blank means **unlimited** rounds.
- **Per-round score entry**: after each round, enter a score for every player. Scores are integers of **any value, including negative and zero**.
- **Live scoreboard**: display each player's **per-round scores** and a **running total** as rounds are recorded.
- **Game completion**:
  - A game with a set round count **shows final totals** once the last round is entered.
  - A **"Done"** button ends an unlimited game at any time and shows final totals.
  - A game with rounds can be **ended early** before reaching the target round count.
- **Post-game actions**: from the results screen, **start a new game with the same players and rules**, or **"Edit setup"** to reopen the setup screen pre-filled with the same players and rules.
- **Backend persistence** for games, players, rounds, and per-player round scores so a game survives navigation and app restarts.

## Capabilities

### New Capabilities
- `score-tracker`: General score tracking in `client-play` — game setup (players from connected users or free-form names, optional round count), per-round score entry allowing any integer including negatives, running and per-round totals, game completion (target reached, early end, or "Done" for unlimited games), and post-game rematch / edit-setup flows. Covers the new backend tables and API endpoints plus the Score tab UI.

### Modified Capabilities
<!-- None — reuses the existing social-connections read endpoint without changing its requirements. -->

## Impact

- **New client code** (`client-play/src/`): Score tab route + nav entry (`App.tsx`, `components/NavBar.tsx`), setup / play / results pages, `api.ts` and `types.ts` additions.
- **New backend code** (`src/`): new router (e.g. `routes/scores-games.ts`) registered in `app.ts`, new repository under `repositories/sqlite/` with an interface in `repositories/interfaces.ts`, and new SQLite tables + inline migration in `db.ts`. Distinct from the existing arcade `game_scores` leaderboard (`routes/scores.ts`), which is unrelated.
- **Reuses** the social-connections API (`GET /api/social/users/connectable`) to populate the connected-user picker; no change to its behavior.
- **Docs to keep in sync**: `openapi.yaml` (new routes), `llm-context.md` (new feature area). No new subdomain, so `Caddyfile*`, `server-deploy.sh`, and `dev-local.sh` are unaffected.
