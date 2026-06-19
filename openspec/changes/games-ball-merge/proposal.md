## Why

The casual games platform (`games.branam.us`, see `docs/games/design.md`) is designed but has no code: there is no `client-games` workspace yet. The platform's first build target should prove out the app shell, the Phaser 3 rendering approach, and the game-registry pattern with a small, self-contained game before any multiplayer infrastructure is built.

The original design framed the platform narrowly around **asynchronous turn-based strategy** games. In practice the platform should host **any casual game** — single-player real-time arcade games as well as multiplayer turn-based ones. A single-player, physics-based ball-merging game is the ideal first game: it needs no rooms, turns, polling, or backend state, so it exercises the shell and Phaser integration end-to-end while staying tiny.

## What Changes

- **Bootstrap the `client-games` workspace** — React 19 + Vite + Tailwind 4 + PWA, dev port **6035**, served at `games.branam.us`. Mirrors the existing client workspaces (`@repo/games`), auth-gated via `@repo/auth`.
- **Adopt Phaser 3 as the primary game renderer**, mounted inside a React host component. React owns the app shell (catalog, HUD overlays, game-over UI); Phaser owns the game canvas. The Matter.js physics engine bundled with Phaser drives the ball-merge game.
- **Broaden the platform scope** beyond turn-based strategy to any casual game, via a client-side **game registry**: each game is an entry exposing a slug, display name, a category (`single-player` | `multiplayer`), and a mount function. The home page renders the registry as a catalog; a route per game mounts it. Turn-based multiplayer infrastructure (rooms, polling, server state) is deferred — not required by this change.
- **Add the first game: Ball Merge** — an empty three-sided container (open top). The player drops a randomly-sized ball from a horizontally-movable spout at the top. Balls fall and stack under gravity. When two balls of the **same size** touch, they merge into the **next size up** and award points. The game ends when any ball comes to rest above the container's open top (i.e. falls/overflows outside the container). Score and best-score (localStorage) are shown; game-over offers restart.
- **Update deployment + docs** — add `games.branam.us` to `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`, the `build:games` script in `package.json`, and reflect the broadened scope in `docs/games/design.md` / `docs/games/planning.md` and `llm-context.md`.

No new backend routes, database tables, or env vars are introduced — the game is entirely client-side and persists only a local best score. A server-side leaderboard is recorded as future work.

## Capabilities

### New Capabilities

- `games-app-shell`: The `client-games` workspace — auth-gated React 19 + Vite + Tailwind + PWA app at `games.branam.us`, a Phaser 3 React host component, and a client-side game registry that renders a catalog of casual games (single-player and, in future, multiplayer) and routes to each game.
- `games-ball-merge`: The Ball Merge game — drop-and-merge physics gameplay in a three-sided container, same-size merge with scoring, overflow loss condition, game-over/restart, and a locally-persisted best score.

### Modified Capabilities

- _None._ The games platform has no existing `openspec/specs/` capability; its design lived only in `docs/games/`. The scope broadening is captured in the new `games-app-shell` spec and reflected back into the design docs.

## Impact

- `client-games/` — new workspace: `index.html`, `vite.config.ts` (port 6035, PWA, `/api` proxy), `package.json` (`@repo/games`, depends on `@repo/auth`, `phaser`), `tsconfig*.json`, `src/` (App router + AuthGuard, home/catalog page, Phaser React host, game registry, Ball Merge scene + pure logic, NavBar).
- `package.json` (root) — add `client-games` to `workspaces`; add `build:games` script and include it in the `build` concurrently chain.
- `Caddyfile` — add `games.branam.us` handle block (static `client-games/dist` + `/api/*` reverse proxy, matching siblings).
- `Caddyfile.local` — add `games-branam-us.duckdns.org:80 → localhost:6035`.
- `server-deploy.sh` — add a `build:games` step.
- `dev-local.sh` — add a tmux pane running `npm run dev -w client-games`.
- `docs/games/design.md`, `docs/games/planning.md` — broaden platform framing to "any casual game"; mark Phaser 3 the primary renderer; record server-side leaderboard as future work.
- `llm-context.md` — add the games app and its first game to the app inventory.
- `openapi.yaml` — no change (no API routes added); noted explicitly so reviewers don't expect one.
