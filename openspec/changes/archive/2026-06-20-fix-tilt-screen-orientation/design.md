## Context

`BallMergeScene.onDeviceMotion` computes lateral gravity bias using only `accelerationIncludingGravity.x`:

```ts
const rawX = e.accelerationIncludingGravity?.x ?? 0
const gravityX = (this.smoothedTiltX / 9.8) * MAX_TILT_GRAVITY
```

Device axes are fixed to the physical hardware. In portrait (0°) the device x-axis is screen-horizontal, so this is correct. In landscape, the x-axis no longer aligns with the screen's horizontal — gravity reads as lateral even when the phone is flat, and the tilt direction is wrong.

## Goals / Non-Goals

**Goals:**
- Compute the screen-relative lateral acceleration component from device x/y before applying to gravity
- Work correctly in all four orientations (0°, 90°, 180°, 270°)
- Use the best available orientation API on each platform

**Non-Goals:**
- Changing the tilt feel or tuning constants
- Supporting non-standard orientations or sensor fusion beyond what's needed for the axis mapping
- Fixing the shake detection (shake uses `acceleration` delta magnitude; orientation doesn't affect delta detection in the same way)

## Decisions

### Decision: Use `screen.orientation.angle` with fallback to `window.orientation`

`screen.orientation.angle` is the W3C standard and works on Android Chrome and recent iOS Safari (16.4+). `window.orientation` is deprecated but still the most reliable signal on older iOS Safari. Use `screen.orientation?.angle` and fall back to `-(window.orientation as number ?? 0)` — note the negation because `window.orientation` reports the device rotation direction, which is opposite to screen orientation angle convention.

**Alternative considered:** `window.orientation` only — rejected because it's deprecated and absent in some non-iOS environments.

### Decision: Four-branch axis mapping (switch on angle)

Read both `accelerationIncludingGravity.x` and `.y`, then select the screen-horizontal component based on the orientation angle:

| Angle | Orientation           | Screen-lateral formula |
|-------|-----------------------|------------------------|
| 0°    | Portrait              | `+x`                   |
| 90°   | Landscape (CCW)       | `+y`                   |
| 180°  | Portrait (inverted)   | `-x`                   |
| 270°  | Landscape (CW)        | `-y`                   |

The 90°/270° signs follow the standard device-frame convention: when the device is in 90° landscape (home button on the right on most phones), tilting the bottom edge of the device down makes balls roll toward the bottom of the screen, which corresponds to `+y`.

> **Verify on device**: The sign for 90° and 270° must be confirmed against physical hardware, as platform sign conventions can differ between iOS and Android. If the directions are inverted in landscape, swap `+y`/`-y`.

**Alternative considered:** Trigonometric rotation (`rawX * cos(θ) + rawY * sin(θ)`) — equivalent for 0°/90°/180°/270° but adds float math and doesn't make the intent obvious.

### Decision: Apply the transformation only to the tilt component, not shake

Shake detection measures the magnitude of delta vectors (`√(dx²+dy²)`) and is orientation-independent by nature. No change needed there.

## Risks / Trade-offs

- **Platform sign uncertainty** → Mitigation: test on both iOS Safari and Android Chrome in landscape before shipping; the switch branches are trivial to flip.
- **`screen.orientation` unavailable on very old iOS Safari** → Mitigation: the `window.orientation` fallback covers iOS 13+ (the same floor as `DeviceMotionEvent.requestPermission`).
- **Orientation changes mid-session** → No special handling needed; `onDeviceMotion` reads the orientation angle live on each event, so it adapts automatically.
