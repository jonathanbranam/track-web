## Why

Ball Merge's tilt toggle button produces no visible reaction on iOS — no color change, no permission dialog, no effect — and without on-device DevTools we cannot tell whether the React `onClick`/`onPointerDown` handlers are firing at all. A dedicated diagnostic page isolates the React overlay event problem from the Phaser canvas, iOS permission API, and secure-context constraints.

## What Changes

- Add a **Prototypes** entry to the `client-games` registry — a React-only page (no Phaser canvas) reachable at `/games/prototypes`.
- Implement an **initial prototype: Motion/Tilt Button Tester** on that page:
  - Environment readout: `window.isSecureContext`, `'DeviceMotionEvent' in window`, `typeof DeviceMotionEvent.requestPermission`.
  - Button grid, each labeled with its trigger type: `onClick`, `onPointerDown`, `onPointerUp`, `onTouchStart`, `onTouchEnd`, `onClick` inside a `pointer-events: none` parent, `onPointerDown` inside a `pointer-events: none` parent.
  - On-screen scrollable event log (fixed at bottom) that appends `[event-type] fired` for each button tap.
  - **Request Permission** button — calls `DeviceMotionEvent.requestPermission()` and logs result or error.
  - Live `accelerationIncludingGravity` readout once permission is granted.
  - **Reload** button to clear the log.
- The Prototypes entry is listed in the public games lobby with the description "prototypes and tests".

## Capabilities

### New Capabilities

- `prototypes-game`: Registration of the Prototypes entry in the games registry and routing, including the page shell component.
- `prototypes-tilt-tester`: The Motion/Tilt Button Tester prototype — environment readout, event-type button grid, on-screen log, permission request, and live sensor readout.

### Modified Capabilities

_(none — no existing spec-level behavior changes)_

## Impact

- **`client-games/src/games/registry.ts`** — new Prototypes entry (hidden from lobby).
- **`client-games/src/App.tsx`** — new `/games/prototypes` route.
- **`client-games/src/games/prototypes/`** — new directory with `PrototypesGame.tsx` and `TiltTester.tsx`.
- No backend changes. No new API endpoints. No database changes.
- No Caddyfile/deploy script changes (subdomain and static serving already in place for `client-games`).
