## 1. Groundwork

- [x] 1.1 Read `kb/phaser-mobile-input.md` in full before writing any input-handling code; confirm both patterns are understood — scene-level `this.input` for canvas press-and-drag (Fix 1) and `input: { windowEvents: false }` for the React HUD buttons layered over the canvas (Fix 2). Verify by being able to state which fix applies to which surface in this game.
- [x] 1.2 Move the prototype from the repo root `orbital-dodger.html` to `docs/games/orbital-dodger/prototype.html`. Verify the file exists at the new path, no longer exists at the root, and opens and plays in a browser.
- [x] 1.3 Create the `client-games/src/games/orbital-dodger/` directory. Verify no new npm dependency is added and `client-games/package.json` is unchanged — Phaser stays externalized via the existing `rollupOptions.external` + import map.

## 2. Pure logic module (`physics.ts`)

- [x] 2.1 Define the tuning parameter type and shipped defaults (gravity strength, planet mass scale, thrust, max speed, gravity softening distance, ship radius, planet count, max fuel, score base rate, proximity bonus, proximity range, forecast distance, star bonus), seeded from the prototype's values as a starting point for later calibration. Verify the module type-checks with `npx tsc --noEmit -p client-games/tsconfig.app.json`.
- [x] 2.2 Implement `gravityAccelAt(x, y, planets, tuning)` summing per-planet inverse-square acceleration proportional to planet area, with the squared distance clamped to the softening minimum. Verify unit tests cover: larger planet pulls harder at equal distance; acceleration rises as distance falls; contributions from multiple planets sum as vectors; acceleration stays finite at zero distance.
- [x] 2.3 Implement `generatePlanets(width, height, tuning, rng)` taking an injected `rng` and producing non-overlapping planets with the clearance margin and a clear center start position, using bounded retries with a fallback. Verify unit tests with a seeded `rng` assert no pair overlaps, no planet covers the center start, and generation returns in bounded time when the field is over-crowded.
- [x] 2.4 Implement `spawnStar(width, height, planets, rng)` placing a star clear of every planet's surface. Verify a seeded unit test asserts the returned position is outside every planet plus its clearance.
- [x] 2.5 Implement `scoreRateAt(x, y, planets, tuning)` returning base rate plus a non-linear proximity bonus keyed on distance to the nearest planet *surface*, maxing at the surface and reaching zero at the proximity range. Verify unit tests cover: base rate only beyond the range; maximum bonus at the surface; a mid-range value strictly between the two and below the linear midpoint (confirming the non-linear ramp).
- [x] 2.6 Implement `projectForecast(ship, planets, tuning)` forward-integrating gravity only (ignoring thrust), terminating at the forecast distance, on planet intersection, on leaving the play area, or at the step cap. Verify unit tests cover: path ends at a planet placed directly ahead; path length is bounded by the step cap when no collision occurs; an empty/withheld path when forecast distance is zero.
- [x] 2.7 Implement `stepShip(ship, planets, tuning, thrustTarget, dt)` applying gravity plus optional thrust toward a target, clamping speed to the maximum, and integrating position — and `checkLoss(ship, planets, bounds, fuel, tuning)` returning the loss reason (`crash`, `out-of-bounds`, `out-of-fuel`) or none. Verify unit tests cover: speed clamp preserves direction; thrust is ignored when fuel is zero; each loss reason is returned for its condition; a ship just inside the out-of-bounds margin does not lose.
- [x] 2.8 Run `npm test` and verify all new `physics.test.ts` tests pass alongside the existing suite with no failures.

## 3. Phaser scene (`OrbitalDodgerScene.ts`)

- [x] 3.1 Create the scene with logical dimensions `GAME_W = 400` / `GAME_H = 720` exported for the React host, plus a background starfield. Verify the scene mounts and renders in `npm run dev -w client-games` with the canvas scaled to fit and centered.
- [x] 3.2 Generate each planet's lit-sphere appearance once into a `Phaser.Textures.CanvasTexture` using `createRadialGradient`, displayed as an `Image`, regenerated only when a layout is created. Verify planets visually match the prototype's gradient look and that no gradient work happens per frame.
- [x] 3.3 Implement the fixed sub-step simulation loop: accumulate `delta`, advance in sub-steps of at most 1/120 s with a per-frame sub-step cap, and test collisions at every sub-step. Verify by thrusting at maximum speed directly into the smallest planet repeatedly and confirming the ship never passes through it.
- [x] 3.4 Wire canvas input per Fix 1 — `pointerdown`/`pointermove`/`pointerup` on `this.input` for press-and-drag thrust, **plus** a `pointerupoutside` subscription, **plus** re-deriving thrust state from `pointer.isDown` each sub-step. Verify that releasing the pointer outside the canvas bounds stops thrust and stops fuel drain rather than latching thrust on.
- [x] 3.5 Implement fuel drain while thrusting, ending the run at zero, and render the dynamic layer each frame into a single cleared `Graphics`: ship, motion trail, stars, pickup particles, forecast path, and the thrust aim line. Verify a held thrust drains the reserve over the configured duration and ends the run with reason `out-of-fuel` while clear of all planets.
- [x] 3.6 Recompute the forecast on an interval (every few frames) and redraw the cached polyline in between. Verify the drawn path fades along its length, ignores active thrust, terminates at a planet in its way, and that frame time does not regress at the maximum planet count.
- [x] 3.7 Implement star collection (fixed bonus, particle burst) and set respawn when the last star is collected. Verify collecting all stars places a new set clear of the planets.
- [x] 3.8 Emit `score` and `fuel` to `game.events` at roughly 10 Hz plus an exact final value on run end, and emit `gameover` carrying the final score and loss reason; handle inbound `retry` (same layout) and `new-layout` events by resetting score, fuel, ship position, velocity, and stars. Verify retry preserves the planet layout and new-layout replaces it, and that both reset run state fully.

## 4. React host (`OrbitalDodgerGame.tsx`)

- [x] 4.1 Build the Phaser config with `type: Phaser.AUTO`, `Scale.FIT` + `CENTER_BOTH`, no physics engine, and **`input: { windowEvents: false }`** per Fix 2, mounted through the existing `PhaserGame` host. Verify the game mounts and unmounts cleanly when navigating to and away from `/game/orbital-dodger`.
- [x] 4.2 Build the HUD: score readout, fuel bar that changes appearance below the low-reserve threshold, a quit button (hidden once the run has ended), and a trophy button opening the leaderboard without ending the run. Verify each control responds to a tap and that the fuel bar changes color as the reserve drains.
- [x] 4.3 Wire score submission on run end and on quit — `submitScore` with `gameSlug: 'orbital-dodger'`, `mode: 'classic'`, `level: 'classic'`, skipping the POST when score is zero, awaiting submission before fetching the leaderboard, and swallowing failures. Verify a completed run appears in the leaderboard panel, a zero-score run makes no POST, and a forced network failure still renders the overlay.
- [x] 4.4 Build the end-of-run overlay showing the loss reason (crash / out of fuel / quit), the final score as a whole number, the `Leaderboard` component, and both restart controls (retry same layout, new layout). Verify each reason renders its own heading and both restart controls start a fresh run.
- [x] 4.5 Confirm no best score is written to or read from `localStorage` anywhere in the game. Verify by searching the new files for `localStorage` and finding no occurrences.

## 5. Registration

- [x] 5.1 Add the `orbital-dodger` entry to `client-games/src/games/registry.ts` as a `single-player` game with a lazy `mount` and no `lobbySlug`. Verify the catalog shows an Orbital Dodger card and selecting it navigates to `/game/orbital-dodger` and mounts the game directly without a lobby.

## 6. Dev-only tuning panel

- [x] 6.1 Build the tuning panel as a React component reached through a dynamic `import()` guarded by `import.meta.env.DEV`, with a slider per tuning parameter and a reset-to-defaults control, writing into the mutable tuning object the scene reads each sub-step. Verify in `npm run dev -w client-games` that adjusting gravity changes ship motion live mid-run, that planet count takes effect only on the next layout, and that reset restores every default.
- [x] 6.2 Run `npm run build:games` and verify the panel is absent from the production bundle — grep the built output in `client-games/dist/` for a string unique to the panel and confirm no match.

## 7. Calibration

- [x] 7.1 Using the dev tuning panel, re-calibrate gravity strength, mass scale, thrust, max speed, softening distance, proximity range, and forecast distance for the `400 × 720` logical field, since the prototype's values were tuned against a viewport-sized field. Verify a stable orbit around a mid-size planet is achievable with brief thrust taps and that the fuel budget supports a run of a satisfying length.
- [x] 7.2 Freeze the calibrated values as the shipped defaults in `physics.ts` and confirm they are what a production build uses. Verify by playing a production build (`npm run build:games` + preview) and confirming the feel matches the calibrated dev session.

## 8. Verification and documentation

- [ ] 8.1 Test on a real iOS device over the LAN, per `kb/phaser-mobile-input.md` (desktop mouse input will not surface the bug). Verify press-and-drag thrust works on the canvas, every HUD button (quit, trophy) responds to a tap, and releasing a drag outside the canvas stops thrust.
- [x] 8.2 Take verification screenshots of the catalog card, an active run, and the end-of-run overlay with `playwright-cli screenshot`, saving to `/tmp/track-verify/` (never the project root).
- [x] 8.3 Update `llm-context.md` — the games entry currently says the platform's only game is Ball Merge. Add Orbital Dodger with its slug, mode/level values (`orbital-dodger` / `classic` / `classic`), and its single shared leaderboard. Verify the entry reflects the shipped behavior.
- [x] 8.4 Add any follow-on items surfaced during implementation (difficulty tiers as additional `level` values, sound/haptics, motion controls) to `docs/games/planning.md`. Verify the file lists them.
- [x] 8.5 Run `npm test` and verify the full suite passes with no failures.
- [x] 8.6 Run `npm run build:games` and verify it completes with zero TypeScript errors, and confirm Phaser is **not** in the bundle — check that `phaser` remains an external import in the built output.
