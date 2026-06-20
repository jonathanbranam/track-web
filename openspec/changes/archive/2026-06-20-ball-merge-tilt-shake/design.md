## Context

Ball Merge uses Phaser's Matter.js physics engine. The scene (`BallMergeScene.ts`) owns all physics bodies and the Matter world; React (`BallMergeGame.tsx`) owns the HUD and communicates with the scene exclusively via `game.events` (Phaser EventEmitter). The existing pattern: React emits `restart` → scene responds; scene emits `score` / `gameover` → React responds.

`DeviceMotionEvent` provides two relevant data streams: `accelerationIncludingGravity` (raw sensor including gravity component — good for tilt) and `acceleration` (gravity subtracted — good for shake, since tilt won't inflate the delta). Both come from the same listener and the same iOS permission.

## Goals / Non-Goals

**Goals:**
- Tilt phone → subtle lateral gravity bias on all balls
- Shake phone → jostle impulse applied to all active balls (same effect as shake button)
- Shake button → always available fallback; shares cooldown with physical shake
- One iOS permission request (via tilt toggle tap) gates both motion features
- Tilt toggle hidden on platforms where `DeviceMotionEvent` is unavailable

**Non-Goals:**
- Visual tilt indicator or aim-line drift on the preview ball
- Haptic feedback
- Landscape orientation support (portrait-only assumption; axes would rotate)
- Making shake work independently of tilt permission on iOS

## Decisions

### 1. Scene owns the `devicemotion` subscription; React owns permission

React cannot call `requestPermission` and then hand a stream to the scene without coupling them tightly. Instead:

- React button tap → calls `DeviceMotionEvent.requestPermission()` (if needed) → on grant, emits `tilt-enabled` to `game.events` → scene subscribes to `devicemotion`
- React tilt toggle tap again → emits `tilt-disabled` → scene unsubscribes, resets gravity to `(0, 1)`

This keeps physics logic in the scene and permission UI in React.

**Alternative considered**: React subscribes and emits tilt values each frame via game events. Rejected — high-frequency events across the React/Phaser boundary on every `devicemotion` tick is unnecessary overhead.

### 2. Use separate data fields for tilt vs. shake

`accelerationIncludingGravity.x` — used for tilt (contains gravity component, so naturally reflects phone angle).
`acceleration.x/y` (gravity-subtracted) — used for shake detection (a shake is a rapid delta in true acceleration, not tilt angle).

Using `accelerationIncludingGravity` for shake detection would make a statically-tilted phone appear to be shaking.

### 3. EMA smoothing for tilt

Raw accelerometer data fires at ~60 Hz with significant jitter. Apply an Exponential Moving Average in the `devicemotion` handler before updating world gravity:

```
smoothedX = TILT_SMOOTHING * rawX + (1 - TILT_SMOOTHING) * smoothedX
gravityX  = -(smoothedX / 9.8) * MAX_TILT_GRAVITY
```

The negation accounts for the axis convention: tilting right decreases `accelerationIncludingGravity.x` (gravity component shifts left), but we want balls to drift right.

Tuning constants (named, easy to adjust):
```
MAX_TILT_GRAVITY   = 0.28   // peak lateral as fraction of down gravity (y=1)
TILT_SMOOTHING     = 0.12   // EMA alpha — lower = more lag, less jitter
JOSTLE_FORCE       = 0.006  // peak lateral impulse per ball
JOSTLE_VERT_FRAC   = 0.20   // vertical component as fraction of lateral
SHAKE_THRESHOLD    = 12     // m/s² delta to register a shake (tune by feel)
SHAKE_COOLDOWN_MS  = 1500   // shared cooldown for button and physical shake
```

### 4. Shake detection via acceleration delta

In each `devicemotion` callback, compute the magnitude of the change in `acceleration`:

```
Δ = sqrt((ax - prevAx)² + (ay - prevAy)²)
if Δ > SHAKE_THRESHOLD and timeSinceLastJostle > SHAKE_COOLDOWN_MS:
    jostle()
```

This is intentionally simple — no multi-sample window or frequency analysis. The threshold should be high enough to ignore walking/handling vibration but low enough that a deliberate wrist-flick registers.

### 5. Shared cooldown via scene-emitted event

When any jostle fires (button press or physical shake), the scene emits a `jostle` event back to `game.events`. React listens and disables the shake button for `SHAKE_COOLDOWN_MS`. The scene independently tracks `lastJostleTime` to debounce physical shake. Both use the same constant so they stay in sync without needing to coordinate state.

### 6. Mobile detection

Show the tilt toggle only if `window.DeviceMotionEvent` is defined. This is accurate for all modern mobile browsers and harmless on desktop (where the class exists but events carry no meaningful sensor data). No user-agent sniffing.

### 7. Restart and game-over handling

On `doRestart`: keep tilt subscription if it was enabled (user intent persists across games). Reset `smoothedX = 0` and call `setGravity(0, 1)` then immediately re-apply once the first event fires. On `endGame`: no change to tilt state (game-over overlay sits on top, user can restart or quit).

## Risks / Trade-offs

**Axis sign may be wrong on first test** → the negation for tilt direction is based on the spec; test on a real device and flip the sign constant if needed. The constant name `TILT_AXIS_SIGN` can be added as a `±1` multiplier.

**iOS permission denied** → `requestPermission()` resolves with `'denied'`; React keeps the toggle in the off state and shows no motion features. No error toast needed — the button simply doesn't activate.

**Shake near overflow triggers game-over** → This is intentional risk/reward, but could feel unfair on first encounter. No mitigation planned; it's part of the mechanic.

**Portrait-only axis assumption** → If the game canvas rotates (landscape mode), `accelerationIncludingGravity.x/y` axes swap. Since the game is portrait-locked as a PWA, this is acceptable.

**EMA lag on rapid tilt reversal** → With `α=0.12`, reversing tilt direction has ~0.5 s of lag. This is a feature (smoother ball movement), not a bug, but aggressive players may find it sluggish. `TILT_SMOOTHING` is a named constant; increasing it (e.g. 0.2) reduces lag.

## Resolved Questions

- **Permission denied UX**: Silent — toggle stays off, no error message. The shake button remains available as a fallback regardless.
- **Physical shake when tilt disabled**: Physical shake does not fire when tilt is off; they share the `devicemotion` subscription. The shake button is always visible and functional on mobile whether or not tilt is enabled.
