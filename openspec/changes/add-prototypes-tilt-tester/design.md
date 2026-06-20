## Context

Ball Merge has a tilt-toggle button overlaid on a Phaser canvas. On iOS the button produces no visible reaction — the root cause is unknown because we cannot tell whether React event handlers fire at all on device (no DevTools over LAN). The existing games app uses a `registry.ts` / `/game/:slug` routing pattern. All games — including those built with Phaser — share the same route; the game component decides what it renders. The Prototypes entry adds a new slug (`prototypes`) that mounts a pure-React component instead of a Phaser wrapper.

## Goals / Non-Goals

**Goals:**
- Add `prototypes` to `registry.ts` so it appears in the lobby and routes normally.
- Implement the Motion/Tilt Button Tester as the first (and initially only) prototype.
- Diagnose whether specific React event handler types (`onClick`, `onPointerDown`, `onTouchStart`, etc.) fire on iOS when the page has no Phaser canvas.
- Surface iOS motion permission API state and live sensor data on screen.

**Non-Goals:**
- No Phaser canvas — this is a pure-React component.
- No backend changes, no new API endpoints, no database changes.
- No Caddyfile / deploy script changes (the `client-games` subdomain and build are already in place).
- Not a permanent game; this is a diagnostic / scratchpad space.

## Decisions

**1. Use the existing `/game/:slug` route — no new routes.**

`App.tsx` already has `<Route path="/game/:slug">` that renders `<GamePage>`, which reads the slug and mounts the registered component. Adding `prototypes` to `registry.ts` is sufficient; no routing changes needed.

**2. `GameCategory` stays `'single-player'` — no new category.**

Adding a `'utility'` or `'dev'` category would require changing the lobby UI. Since the proposal says to list Prototypes as a normal game, reusing `'single-player'` is the simplest path.

**3. Pure React — no `PhaserGame` wrapper.**

The whole point is to test event handling without a Phaser canvas in the DOM. The component just returns plain React JSX.

**4. On-screen event log as a fixed-height scrollable `<div>`, not `position: fixed`.**

`position: fixed` interacts poorly with iOS soft keyboard and `100dvh` layouts. A flex-column layout where the log takes `flex-1` with `overflow-y-auto` keeps everything in flow and avoids safe-area edge cases.

**5. Test `pointer-events: none` parent with `pointer-events: auto` child — replicating the Ball Merge HUD structure.**

This is the highest-suspect cause from `tilt-debug.md`. The tester includes two buttons inside a `pointer-events-none` outer div (with `pointer-events-auto` on the button) to directly reproduce the HUD pattern.

## Risks / Trade-offs

- **Prototypes page is permanent in the lobby** — [Risk: clutter as the app grows] → Mitigation: description "prototypes and tests" sets expectations; can be removed or hidden later if needed.
- **iOS motion permission is session-scoped** — [Risk: a previously denied permission (from localhost testing) may return `'denied'` with no dialog] → Mitigation: the tester logs the return value explicitly so this state is visible.
- **`onPointerDown` / `onTouchStart` on iOS may behave differently without a canvas** — [Risk: results may not transfer 1-to-1 to the Phaser overlay scenario] → Mitigation: that is the point — if handlers fire here but not in Ball Merge, the canvas is the culprit.
