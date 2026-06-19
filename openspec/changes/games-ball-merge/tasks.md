## 1. Workspace Scaffold

- [x] 1.1 Create `client-games/` with `index.html`, `tsconfig.json`, `tsconfig.app.json`, and `package.json` (name `@repo/games`, deps `@repo/auth`, `react`, `react-dom`, `react-router-dom`, `phaser`; devDeps mirroring `client-play`)
- [x] 1.2 Create `client-games/vite.config.ts` mirroring `client-play` — React + Tailwind + PWA plugins, `server.port: 6035`, `/api` proxy to `localhost:3000`, PWA manifest named "Games"
- [x] 1.3 Add `client-games` to the root `package.json` `workspaces` array
- [x] 1.4 Add `"build:games": "npm run build -w client-games"` to root scripts and include `npm run build:games` in the `build` concurrently chain
- [x] 1.5 Add games icons under `client-games/public/icons/` (icon-192, icon-512)

## 2. App Shell

- [x] 2.1 Create `client-games/src/main.tsx`, `src/index.css` (Tailwind), and `src/App.tsx` with React Router v7 and `AuthGuard`/`AuthProvider` from `@repo/auth`
- [x] 2.2 Implement `src/pages/HomePage.tsx` — catalog that maps the game registry to cards
- [x] 2.3 Implement `src/pages/GamePage.tsx` (`/game/:slug`) — looks up the registry entry and mounts it; shows a not-found state for unknown slugs
- [x] 2.4 Add a `NavBar` component consistent with the other clients (fixed bottom nav, safe-area vars)

## 3. Game Registry & Phaser Host

- [x] 3.1 Create `src/games/registry.ts` exporting `GameEntry { slug, name, category: 'single-player' | 'multiplayer', mount }` and a `games` array; register `ball-merge`
- [x] 3.2 Create `src/games/PhaserGame.tsx` — React host that constructs `Phaser.Game` against a container ref on mount, destroys it on unmount, and wires a scene→React event callback (score, game over)
- [x] 3.3 Confirm Phaser is code-split so the catalog/shell loads without pulling Phaser until a game route opens (build emits a separate `BallMergeGame-*.js` chunk)

## 4. Ball Merge Game

- [x] 4.1 Create `src/games/ball-merge/logic.ts` — pure functions: `SIZES` table (radius + points per size), `nextSize(size)`, `mergeScore(size)`, `pickSpawnSize(rng)`, `isOverflow(bodyTopY, topLine, speed)`
- [x] 4.2 Create `src/games/ball-merge/BallMergeScene.ts` — Phaser scene using Matter.js physics: three-sided container (left/right walls + floor, open top), gravity, restitution/friction constants centralized in one config object
- [x] 4.3 Implement the drop spout: horizontally movable drop position (pointer/drag + keyboard), readied ball drawn via `pickSpawnSize`, release to drop, ready the next ball
- [x] 4.4 Implement merge handling on Matter collision: equal-size bodies marked consumed synchronously, removed, replaced by one `nextSize` body at contact midpoint, award `mergeScore`; largest size does not merge; guard against double-consumption
- [x] 4.5 Implement scoring + best-score persistence in `localStorage['ball-merge:best']`, surfaced to React via the scene callback
- [x] 4.6 Implement loss detection via `isOverflow` with a settle grace period so a ball passing through the opening does not trigger game over
- [x] 4.7 Implement game-over UI (final score, best score, restart) and restart that clears balls, resets score to zero, preserves best, and readies a new ball

## 5. Deployment Wiring

- [x] 5.1 Add `games.branam.us` handle block to `Caddyfile` (static `client-games/dist`, `/api/*` reverse-proxied), then `caddy fmt --overwrite Caddyfile`
- [x] 5.2 Add `games-branam-us.duckdns.org:80 → localhost:6035` to `Caddyfile.local`, then `caddy fmt --overwrite Caddyfile.local`
- [x] 5.3 Add a `build:games` step to `server-deploy.sh` (after `build:play`, before `build:server`)
- [x] 5.4 Add a tmux pane running `npm run dev -w client-games` to `dev-local.sh`

## 6. Docs

- [x] 6.1 Update `docs/games/design.md` — broaden the platform framing from "async turn-based strategy" to "any casual game"; mark Phaser 3 the primary renderer; note single-player real-time games need no rooms/polling
- [x] 6.2 Update `docs/games/planning.md` — add server-side leaderboard, largest-ball pop-and-clear, and additional casual games as future work
- [x] 6.3 Update `llm-context.md` — add the games app (`games.branam.us`, port 6035) and its first game to the app inventory
- [x] 6.4 Confirm `openapi.yaml` needs no change (no API routes added) — leave a note in the PR description rather than editing the spec

## 7. Build & Test

- [x] 7.1 Add unit tests for `src/games/ball-merge/logic.ts` (Vitest): `nextSize`, `mergeScore`, `pickSpawnSize` distribution stays within the small-size range, and `isOverflow` boundary/grace behavior (added to `vitest.config.mts` include glob)
- [x] 7.2 Run `npm test` and confirm existing and new tests pass (83 tests pass, 11 new)
- [x] 7.3 Run `npm run build:games` and `npm run build` and confirm zero TypeScript errors across all affected clients (all 7 build steps exit 0)
- [~] 7.4 Manually verify gameplay (drop, merge, score, overflow loss, restart) in the browser; capture a screenshot to `/tmp/track-verify/` — backend + games dev server run, login/auth flow verified via API, SPA serves. Browser screenshot could not be captured: Chromium download is blocked in the sandbox. Recommend a visual pass locally.
