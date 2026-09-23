## Why

The games catalog has one real-time single-player game (Ball Merge) and one turn-based one (Dungeon Tactics Solo). A working browser prototype of **Orbital Dodger** — a gravity-slingshot survival game — already exists at the repo root as an untracked scratch file, where it is unauthenticated, has no leaderboard, and will be lost the first time the working tree is cleaned. Porting it into `client-games` turns a throwaway prototype into a second arcade game on the existing platform, reusing the Phaser host, auth, and score/leaderboard infrastructure that Ball Merge already proved out.

## What Changes

- **New single-player game `orbital-dodger`** added to the `client-games` game registry, mounted through the existing `PhaserGame` React host and reachable at `/game/orbital-dodger`. It appears as a card in the games catalog alongside Ball Merge.
- **Gameplay ported from the prototype**, with these mechanics preserved:
  - Procedurally generated layout of non-overlapping planets, each exerting **inverse-square gravity** scaled by its radius (`F = G · (r² · massScale) / d²`), with a softening floor on distance so close passes stay stable.
  - **Hold-to-thrust toward the pointer**: while the player holds, the ship accelerates toward the touch point; velocity is clamped to a maximum speed.
  - **Fuel as the core constraint**: thrusting drains a fixed fuel budget; hitting zero ends the run even mid-orbit, so a run is *spent*, not only crashed.
  - **Proximity-weighted continuous scoring**: points accrue at a base rate everywhere and ramp quadratically the closer the ship flies to a planet's surface, rewarding tight orbits over parking in empty space.
  - **Collectible stars** that respawn as a set once all are gathered.
  - **Gravity-only forecast path**: a fading polyline projecting where gravity alone (ignoring current thrust) would carry the ship, so the player can read an upcoming orbit or collision.
  - **Loss conditions**: contact with a planet, drifting beyond the play area margin, or running out of fuel.
- **Custom gravity integration rather than a physics engine.** The scene integrates position/velocity itself in `update` — Matter's uniform gravity cannot express per-planet inverse-square attraction. Rendering uses Phaser `Graphics` primitives; no sprite assets are required.
- **HUD and end-of-run flow aligned with Ball Merge** rather than the prototype's DOM overlay: React-owned HUD showing score and a fuel bar, a trophy button for the mid-game leaderboard, and a quit button that ends the run voluntarily. The end overlay shows the final score, the reason the run ended, the leaderboard, and controls to retry the same layout or generate a new one.
- **Server leaderboard replaces the prototype's `localStorage` best score.** Runs submit to the existing `POST /api/scores` with `gameSlug = 'orbital-dodger'`, `mode = 'classic'`, `level = 'classic'`, and read back via `GET /api/scores/leaderboard`. Consistent with `ball-merge-leaderboard`, the server is the sole scoreboard and no local best is stored. **No server, schema, or API changes are needed** — both endpoints are already game-agnostic.
- **Tuning panel is dev-only.** The prototype's slider panel (gravity, thrust, fuel, scoring, forecast range) is retained behind `import.meta.env.DEV` so the feel can still be tuned live during development without shipping the panel — or its markup — in the production bundle. Shipped defaults are the prototype's tuned values.
- **Prototype file relocated** from the root `orbital-dodger.html` to `docs/games/orbital-dodger/prototype.html` as the reference implementation.

### Deferred (explicitly out of scope)

- **Difficulty tiers / level picker.** The leaderboard API keys on a `level`, and the prototype's planet-count slider is effectively a difficulty knob, so tiers would be a natural follow-on. This change ships a single `classic` level so all runs share one ranking; splitting into tiers later only requires new `level` values, not an API change.
- Sound, haptics, and motion/tilt controls.

## Capabilities

### New Capabilities

- `games-orbital-dodger`: The Orbital Dodger game — registry entry, procedural planet layout, inverse-square gravity simulation, hold-to-thrust control with a fuel budget, proximity-weighted scoring and star pickups, the gravity forecast path, loss conditions, HUD/end-of-run flow, and leaderboard submission under the `orbital-dodger` slug.

### Modified Capabilities

None. `games-app-shell` already specifies a generic game registry and Phaser host, and `ball-merge-leaderboard` already specifies game-agnostic `POST /api/scores` and `GET /api/scores/leaderboard` endpoints — adding a new game slug exercises those requirements without changing them.

## Impact

**New code** — `client-games/src/games/orbital-dodger/`:
- `OrbitalDodgerScene.ts` — Phaser scene: gravity integration, thrust, fuel, collisions, scoring, forecast, rendering.
- `OrbitalDodgerGame.tsx` — React host: HUD, fuel bar, quit, leaderboard, end-of-run overlay.
- `physics.ts` + `physics.test.ts` — pure functions (gravity accumulation, score rate, forecast projection, planet layout generation) unit-tested independently of Phaser, matching the `ball-merge/logic.ts` pattern.
- `tuning.ts` — default parameter values plus the dev-only panel wiring.

**Modified code**:
- `client-games/src/games/registry.ts` — one new `GameEntry` with a lazy `mount`.

**Unchanged**:
- Server (`src/`), DB schema, and API surface — the scores endpoints are already game-agnostic.
- `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `scripts/build-deploy.sh`, `dev-local.sh`, `openapi.yaml`, `client-home/src/pages/DirectoryPage.tsx` — this adds a game *inside* the existing `client-games` app, not a new client app or subdomain, and adds no API route.
- `client-games/vite.config.ts` and `index.html` — Phaser is already externalized with a CDN import map, so the new game adds no bundler work. **Nothing in this change may bundle Phaser**, per the t4g.micro build constraint.

**Risks**:
- The prototype's tuning constants are calibrated against a full-window canvas sized in CSS pixels. The Phaser host uses a fixed logical resolution scaled to fit, so gravity, thrust, and scoring-range values must be re-checked against the chosen `GAME_W`/`GAME_H` or the game will feel wrong at the same numeric settings.
- Per-frame gravity accumulation runs over every planet for both the ship and each forecast step (up to 150 steps). At the prototype's planet counts this is trivial, but forecast step count and planet count should stay bounded to keep the frame budget safe on phones.
