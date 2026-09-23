## Context

See `proposal.md` — Why. The constraints that actually shape the approach:

- **The prototype is a full-window 2D-canvas program.** It sizes its world to `innerWidth`/`innerHeight`, draws with `CanvasRenderingContext2D` (including `createRadialGradient`), owns its own `requestAnimationFrame` loop, and puts score/fuel/overlay in DOM elements it controls directly. None of that survives the port unchanged.
- **`client-games` already fixes the surrounding shape.** `PhaserGame` creates and destroys the `Phaser.Game`; React owns the HUD and overlays outside the canvas; the scene reports gameplay events back over `game.events`. `submitScore`/`fetchLeaderboard` in `src/api.ts` and the `Leaderboard` component are game-agnostic and need no change.
- **Phaser is externalized to a CDN** via `rollupOptions.external` + an import map, because bundling it once took the t4g.micro production host down. Nothing here may reintroduce it into the bundle.
- **Phaser + iOS input has bitten this repo twice** (`kb/phaser-mobile-input.md`). This game has *both* interaction surfaces — a press-and-drag on the canvas *and* React buttons layered over it — so both documented fixes apply.
- **Gravity here is not what a physics engine provides.** Matter and Arcade both model gravity as a uniform field. This game needs per-planet inverse-square attraction summed over all bodies.

## Goals / Non-Goals

**Goals:**

- Preserve the prototype's *feel* — the mechanics are already tuned and play well; the port should reproduce them, not redesign them.
- Keep all rules in a pure, render-free module that can be unit-tested without a canvas, following the `ball-merge/logic.ts` precedent.
- Make runs comparable on a shared leaderboard: every player simulates the same play field regardless of device.
- Keep the per-frame cost bounded and predictable on a phone.

**Non-Goals:**

- No physics engine, no sprite assets, no new runtime dependency.
- No server, schema, or API change.
- No unit tests of the Phaser scene or React components — the repo's precedent is to test the pure logic module and verify the rest by hand (including a real iOS device, per the KB).

## Decisions

### Integrate motion directly; do not use a physics engine

The scene owns position and velocity and integrates them itself. Matter is available (ball-merge uses it), but it would contribute nothing here: gravity is per-body inverse-square rather than a uniform field, and there is no collision *response* to compute — touching a planet ends the run, so there is no restitution, friction, or resting contact to resolve. Using Matter would mean disabling its gravity, applying per-body forces every frame, and ignoring its solver — all cost, no benefit.

*Alternative considered:* Matter bodies with `applyForce` per planet per frame. Rejected — it buys only the collision *detection*, which here is a one-line distance comparison.

### Semi-implicit Euler with fixed sub-steps

Phaser's `update(time, delta)` delta is variable and spikes after a stall. The prototype papered over this by clamping `dt` to 33 ms, but with inverse-square gravity a large step near a planet both distorts the trajectory and can tunnel the ship straight through a small planet at max speed.

The scene accumulates elapsed time and advances the simulation in fixed sub-steps of at most **1/120 s**, with a cap on sub-steps per frame so a long stall drops time instead of spiralling. Collision is tested at every sub-step, not once per frame.

*Alternative considered:* single clamped step as in the prototype. Rejected — max speed × 33 ms is a meaningful fraction of the smallest planet's diameter, so tunnelling is reachable in normal play.

### Fixed logical resolution (`400 × 720`), scaled to fit

The canvas runs at a fixed logical size with `Phaser.Scale.FIT` and `CENTER_BOTH`, matching ball-merge's `GAME_W`/`GAME_H` pattern. Because the play field is also the difficulty — its size determines how much room there is between planets — a device-sized field would make leaderboard entries incomparable between a phone and a desktop. A fixed field makes every run the same game.

The trade-off is letterboxing on tall phones; `400 × 720` is taller than ball-merge's `400 × 640` to keep the bars small.

*Alternative considered:* `Scale.RESIZE` to fill the viewport, preserving the prototype's full-window behavior. Rejected for leaderboard fairness.

**Consequence:** the prototype's tuning constants were calibrated against a viewport-sized field in CSS pixels and will not feel identical at `400 × 720`. Re-calibration is an explicit task, done through the dev tuning panel, and the shipped defaults are whatever that produces — not the prototype's literals copied across.

### Pure logic module with injected randomness

`physics.ts` holds the render-free rules: gravity accumulation, score rate, forecast projection, layout generation, star placement, and the integration step. Layout and star placement take an `rng: () => number` parameter (defaulting to `Math.random`) so tests can drive them deterministically and assert the non-overlap and clear-start invariants rather than sampling and hoping.

### Planet textures generated once via `CanvasTexture`

Phaser's `Graphics` has no radial gradient, which is how the prototype gives planets their lit sphere look. Each distinct planet is drawn once into a `Phaser.Textures.CanvasTexture` — which exposes a real 2D context, so `createRadialGradient` works verbatim — and then displayed as an `Image`. Generation happens only when a layout is created, so the per-frame cost is zero.

Everything that moves (ship, trail, stars, particles, forecast path, thrust line) is drawn into a single `Graphics` object cleared each frame, as in the prototype.

*Alternative considered:* approximate the gradient with concentric filled circles in `Graphics`. Rejected — banding, and more draw calls for a worse result.

### Both Phaser mobile-input fixes, plus a release guard

Per `kb/phaser-mobile-input.md`, this game has both interaction surfaces:

- **Canvas press-and-drag → Fix 1.** The scene handles `pointerdown` / `pointermove` / `pointerup` on `this.input`. No DOM `click` on a container is used to detect canvas input.
- **React HUD buttons over the canvas → Fix 2.** The game config sets `input: { windowEvents: false }` so Phaser does not install the window-level listeners whose `preventDefault()` suppresses iOS's synthesized `click`.

These two interact in a way that matters for *this* game specifically: `windowEvents: false` removes the window-level listener, so a pointer released **outside** the canvas may never deliver a `pointerup` to the scene — and unlike a tap-to-act game, a missed release here leaves thrust latched on and silently burns the player's entire fuel reserve. The scene therefore also subscribes to `pointerupoutside`, and additionally re-derives thrust state each sub-step from `pointer.isDown` rather than trusting a latched boolean, so a dropped release event self-corrects on the next frame instead of ending the run.

### Throttled state flow from scene to React

Score and fuel change every frame. Emitting both at frame rate would re-render the React HUD 60 times a second for a display that cannot show the difference. The scene emits `score` and `fuel` at roughly **10 Hz** (and once more on run end, so the final value is exact); `gameover` carries the final score and the reason the run ended. React→scene direction uses `game.events.emit` for `retry` and `new-layout`, matching ball-merge's `restart`.

### Forecast recomputed on an interval, not every frame

The forecast is up to 150 integration steps, each summing gravity over every planet — by far the heaviest thing per frame, and an order of magnitude more work than the ship's own integration. It is recomputed every few frames and the cached polyline is redrawn in between. The path is a planning aid over a ~second-long horizon; it does not need per-frame freshness, and the visual difference is imperceptible.

### Dev tuning panel behind `import.meta.env.DEV`

The panel is a React component rendered only when `import.meta.env.DEV` is true, reached through a dynamic `import()` so Vite's dead-code elimination drops both the panel and its markup from the production bundle rather than shipping unreachable code. Tuning values live in one mutable object the scene reads each sub-step, so edits apply live; planet count is read only at layout generation, which is why it takes effect on the next layout.

### Leaderboard identifiers

`gameSlug: 'orbital-dodger'`, `mode: 'classic'`, `level: 'classic'`. The API requires a non-empty `level`, and a single value keeps all runs in one ranking. Difficulty tiers later become additional `level` values with no API or schema change.

## Risks / Trade-offs

- **Prototype constants won't feel right at the new resolution** → Re-calibration is a task, not an assumption; the dev panel exists precisely to do it, and the values are confirmed on a real device before the defaults are frozen.
- **`windowEvents: false` can drop a `pointerup`, latching thrust on** → `pointerupoutside` subscription plus re-deriving thrust from `pointer.isDown` each sub-step, so the state self-corrects.
- **Forecast cost scales with planets × steps** → Both are bounded (planet count is capped, steps are capped), and the forecast is recomputed on an interval rather than per frame.
- **Continuous scoring could cause a React re-render storm** → Scene emits at ~10 Hz with an exact final value on run end.
- **Tunnelling through a small planet at max speed** → Fixed 1/120 s sub-steps with collision tested per sub-step.
- **Letterboxing on tall phones** → Accepted deliberately in exchange for a comparable leaderboard; mitigated by choosing a taller logical field than ball-merge.
- **Fixed field size is baked into every recorded score** → Changing `GAME_W`/`GAME_H` later would invalidate historical leaderboard entries. If the field is ever resized, it should come with a new `level` value rather than silently re-ranking old scores.

## Migration Plan

Purely additive client-side code. No database migration, no API change, no new dependency, no change to `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `scripts/build-deploy.sh`, `dev-local.sh`, `openapi.yaml`, or `client-home`'s app directory — this adds a game *inside* the existing `client-games` app, not a new client app or subdomain.

Deploy is the normal push to `main`. Rollback is reverting the registry entry, which removes the catalog card and the route; the new files are inert without it. Any `orbital-dodger` rows already in `game_scores` are harmless — the table is keyed by game slug and other games ignore them.

## Open Questions

- The final shipped tuning values, pending on-device calibration. This changes no requirement, no interface, and no task — the calibration task is already in the plan; only the resulting numbers are open.
- Whether the star bonus should scale with proximity like the continuous score does, or stay flat as in the prototype. Shipping flat; revisit only if play testing shows stars pulling players away from close orbits rather than into them.
