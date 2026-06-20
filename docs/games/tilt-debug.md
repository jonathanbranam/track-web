# Tilt / Motion Controls — Debugging Log

## Feature Goal

Add tilt and shake controls to Ball Merge:
- **Tilt** the phone left/right to apply lateral gravity bias to the balls.
- **Shake** the phone (or tap a button) to jostle all balls with a random impulse.
- A toggle button in the top-right HUD enables/disables tilt.

## Symptom

On iOS (tested over LAN HTTP and then deployed to `https://games.branam.us`):

> **Tapping the tilt toggle button produces zero reaction — no color change, no iOS permission dialog, no visible effect of any kind.**

The ball drop / aim mechanic works normally. The quit and leaderboard buttons in the same HUD cluster have not been confirmed to work or not work in the same session (this is a useful next test).

## Implementation Overview

### Scene side (`BallMergeScene.ts`)
- `enableTilt()` — registers `devicemotion` listener, starts applying `accelerationIncludingGravity.x` to lateral gravity via EMA.
- `disableTilt()` — removes listener, resets gravity to straight down.
- `jostle()` — applies small random impulse to all live balls, emits `'jostled'` back to React.
- Scene listens on `this.game.events` for `'tilt-enabled'`, `'tilt-disabled'`, `'jostle'`.

### React side (`BallMergeGame.tsx`)
- `motionAvailable` — module-level constant gating button visibility.
- `tiltEnabled` state — drives button color (gray vs indigo).
- `handleTiltToggle` — calls `DeviceMotionEvent.requestPermission()` on iOS, then emits `'tilt-enabled'` to scene.
- Tilt toggle button and Shake button overlaid on the Phaser canvas using absolute positioning + `z-10`.

---

## Attempted Fixes (in order)

### 1. `async` handler losing iOS gesture context
**Hypothesis:** `handleTiltToggle` was declared `async`. On older iOS Safari, the browser may not consider an `async` function a valid user-gesture context for `requestPermission()`, even when called before the first `await`.

**Change:** Removed `async`; call `requestPermission()` synchronously and chain `.then()` for the result.

**Result:** No change in behavior.

---

### 2. `motionAvailable` too broad (shows on desktop)
**Hypothesis:** `'DeviceMotionEvent' in window` is `true` on desktop Chrome/Firefox/Edge, where there are no motion sensors. The button would appear on desktop but silently do nothing.

**Change:** Added `navigator.maxTouchPoints > 0 || 'ontouchstart' in window` to gate on touch-capable devices.

**Result:** Narrowed the button's visibility but did not affect mobile behavior.

---

### 3. Non-secure context (HTTP over LAN IP)
**Hypothesis:** iOS 13+ requires `window.isSecureContext === true` to call `DeviceMotionEvent.requestPermission()`. Loading from `http://10.0.0.113` is not a secure context; the call silently rejects, `.catch(() => {})` swallows it, no dialog appears, `setTiltEnabled(true)` is never called.

**Change:** Tested on the deployed production URL `https://games.branam.us` (Caddy provides TLS).

**Result:** Still no reaction. The secure context was a real constraint but not the sole blocker.

---

### 4. Phaser window-level `touchend` suppressing `click`
**Hypothesis:** Phaser 3 with `windowEvents: true` (default) adds `touchend` / `mousemove` listeners to `window` with `{ passive: false }` and calls `event.preventDefault()` on them. This suppresses the browser's synthesized `click` event, so React's `onClick` on the overlay buttons never fires.

**Changes:**
- Added `input: { windowEvents: false }` to the Phaser game config.
- Switched the tilt and shake buttons from `onClick` to `onPointerDown` (fires on touch-start, before `touchend`, immune to `click` suppression).

**Result:** Still no reaction. `onPointerDown` should bypass any `click`-suppression mechanism, but the button still does not respond.

---

## What Has Not Been Ruled Out

1. **Phaser canvas physically above the React overlay in z-order.**  
   Despite the HUD having `z-10`, Phaser's Scale Manager (FIT + CENTER_BOTH mode) may modify the canvas or its container div's CSS at runtime (e.g. adding `position: absolute`, `transform`, or inline `z-index`) in a way that puts the canvas on top of `z-10` React elements. If the canvas sits above the buttons in the hit-test stack, touches land on the canvas and Phaser handles them — React never sees them, regardless of which event type we use.

2. **`pointer-events: none` / `pointer-events: auto` iOS bug.**  
   The HUD outer div has `pointer-events: none`; the button group child has `pointer-events: auto`. There is a known (historical) iOS Safari issue where `pointer-events: auto` on a child does not correctly restore touchability when the parent has `pointer-events: none`. If this is the cause, the button appears visually but is invisible to the touch hit-tester.

3. **SVG `fill="none"` absorbing or dropping touches.**  
   The tilt button icon is an SVG with `fill="none"`. On some WebKit versions, tapping the transparent-fill interior of an SVG may not bubble to the parent `<button>`. This is most relevant when most of the tap area is "empty" SVG fill.

4. **`requestPermission` always returning `'denied'` (permission previously denied).**  
   If the permission was denied in a prior session (even on localhost/HTTP), iOS caches that and returns `'denied'` without showing a dialog. The current code does nothing visible on denial. This would only explain missing dialog — not missing color change — unless `onPointerDown` itself isn't firing.

5. **`onPointerDown` on iOS — unknown compatibility with Phaser overlay.**  
   Pointer events are the newer standard and may behave differently than touch events in some iOS/WebKit versions in the context of a Phaser canvas overlay.

---

## Recommended Next Steps

### A. Confirm whether the button's event handler fires at all

The key unknown is whether `handleTiltToggle` is being called. Without DevTools on device, this is hard to confirm. Options:
- **Prototypes game** (see below) — dedicated test app with on-screen logging.
- Temporarily replace `onPointerDown` with `onTouchStart` on the tilt button and log to a visible `<div>` on the page.

### B. Confirm whether other HUD buttons work

Tap the **quit button** (X icon, same button row). If it also has no reaction, the problem is with the entire React overlay — pointer events, z-index, or canvas coverage. If quit works, the problem is specific to `handleTiltToggle`.

### C. Eliminate the canvas from the equation

Temporarily add `className="pointer-events-none"` to the `<div>` inside `PhaserGame.tsx` (the Phaser container). This makes the canvas transparent to all pointer events, forcing every touch to land on the React overlay. If the tilt button suddenly works, the canvas was intercepting touches despite `z-10`.

### D. Eliminate `pointer-events: none` inheritance

In `BallMergeGame.tsx`, remove `pointer-events-none` from the outer HUD `<div>` and instead add `pointer-events-none` directly to the score `<div>`. The button group would then not need `pointer-events-auto` to override a parent. This tests whether the iOS inheritance bug is the cause.

### E. Check Phaser runtime DOM modifications

Open Safari > Develop > [device] and inspect the canvas element. Check if Phaser has set an inline `z-index`, `position: absolute`, or `transform` on the canvas or its container div. If the canvas has a higher effective z-index than the HUD's `z-10`, that is the root cause.

---

## Prototypes Game Plan

Add a `Prototypes` entry to the games app — a single-page React component (no Phaser) that acts as a scratchpad for diagnosing device-specific issues.

**Initial prototype: Motion/Tilt Button Tester**

Render on-screen:
- `window.isSecureContext` value
- `'DeviceMotionEvent' in window`
- `typeof DeviceMotionEvent.requestPermission`
- A scrollable event log `<div>` (fixed at bottom of screen) that appends a timestamped line for every event
- A grid of buttons, each labeled with its trigger type:
  - `onClick`
  - `onPointerDown`
  - `onPointerUp`
  - `onTouchStart`
  - `onTouchEnd`
  - `onClick` inside a `pointer-events-none` parent (replicating the HUD structure)
  - `onPointerDown` inside a `pointer-events-none` parent
- A **Request Permission** button that calls `DeviceMotionEvent.requestPermission()` and logs the result or error
- A live `accelerationIncludingGravity` readout once permission is granted
- A **Reload** button (clears log)

Each button tap appends `[event-type] fired` to the on-screen log. This tells us immediately which event types reach React handlers on iOS.
