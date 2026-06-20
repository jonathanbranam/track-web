**App**: games

## Purpose

Motion controls for Ball Merge: tilt the phone left/right to bias lateral gravity on the balls, and shake (physically or via button) to jostle all active balls with a three-phase impulse sequence. Tilt requires device-motion permission on iOS. Shake is always available and costs points.

## Requirements

### Requirement: Motion controls toggle
The game SHALL display a motion controls toggle button in the HUD only on platforms where `DeviceMotionEvent` is available AND the device has touch capability (`navigator.maxTouchPoints > 0` or `'ontouchstart' in window`). The toggle SHALL start in the disabled state. Tapping it while disabled SHALL request iOS permission (if `DeviceMotionEvent.requestPermission` exists) and, on grant, enable motion controls (tilt + physical shake detection). Tapping it while enabled SHALL disable motion controls and restore default gravity. If iOS permission is denied, the toggle SHALL silently remain disabled with no error message shown.

The toggle button handler MUST be wired to `onClick` (not `onPointerDown` or `onTouchStart`). iOS Safari only recognises `click` events as a valid user-gesture context for `DeviceMotionEvent.requestPermission()`; other event types produce a `NotAllowedError`.

#### Scenario: Toggle hidden on desktop
- **WHEN** the game loads in a browser where `DeviceMotionEvent` is not defined or the device has no touch capability
- **THEN** the motion controls toggle is not rendered

#### Scenario: Toggle starts disabled
- **WHEN** the game loads on a touch-capable device
- **THEN** the motion controls toggle is visible and in the off state

#### Scenario: First tap enables motion controls (no permission required)
- **WHEN** the player taps the toggle on Android or a browser that does not require explicit permission
- **THEN** motion controls activate immediately

#### Scenario: First tap requests iOS permission
- **WHEN** the player taps the toggle on iOS 13+ where `DeviceMotionEvent.requestPermission` exists
- **THEN** the system permission dialog is shown; on grant, motion controls activate

#### Scenario: Permission denied stays silent
- **WHEN** the player denies the iOS permission dialog
- **THEN** the toggle remains in the off state and no error message is displayed

#### Scenario: Second tap disables motion controls
- **WHEN** the player taps the toggle while motion controls are enabled
- **THEN** motion controls deactivate and world gravity returns to default

### Requirement: Tilt gravity bias
While motion controls are enabled, the game SHALL continuously bias the Matter.js world gravity on the x-axis in proportion to the phone's lateral tilt angle (derived from `accelerationIncludingGravity.x`). The bias SHALL be applied via an exponential moving average to reduce jitter. The maximum lateral gravity bias SHALL be a named tuning constant. The axis formula is `gravityX = (smoothedX / 9.8) * MAX_TILT_GRAVITY` — no negation — because tilting the phone right increases `accelerationIncludingGravity.x` and should drift balls right.

#### Scenario: Tilt right drifts balls right
- **WHEN** motion controls are enabled and the phone is tilted to the right
- **THEN** balls in the container drift toward the right wall

#### Scenario: Tilt left drifts balls left
- **WHEN** motion controls are enabled and the phone is tilted to the left
- **THEN** balls in the container drift toward the left wall

#### Scenario: Flat phone has no bias
- **WHEN** motion controls are enabled and the phone is held flat (no lateral tilt)
- **THEN** world gravity is effectively (0, 1) — no lateral drift

#### Scenario: Tilt disabled resets gravity
- **WHEN** the player disables motion controls via the toggle
- **THEN** world gravity immediately resets to (0, 1)

### Requirement: Physical shake detection
While motion controls are enabled, the game SHALL monitor `acceleration` (gravity-subtracted) from `devicemotion` events for rapid changes exceeding a named threshold. When a shake is detected and the jostle cooldown has elapsed, the game SHALL trigger a jostle. Physical shake detection SHALL share the same jostle cooldown as the shake button so they cannot stack.

#### Scenario: Shake triggers jostle
- **WHEN** motion controls are enabled, the player shakes the device sharply, and the cooldown has elapsed
- **THEN** a jostle fires

#### Scenario: Shake respects cooldown
- **WHEN** a jostle was triggered (by shake or button) within the cooldown window
- **THEN** a subsequent shake does not trigger another jostle until the cooldown elapses

#### Scenario: Shake inactive when motion disabled
- **WHEN** motion controls are disabled
- **THEN** shaking the phone produces no effect

### Requirement: Shake button
The game SHALL display a shake button in the HUD at all times on all devices (not gated on motion availability). The button SHALL be positioned in the top-left of the HUD, below the score display. Tapping it SHALL trigger a jostle immediately if the jostle cooldown has elapsed and the player's score is at least `SHAKE_COST`. The button SHALL be disabled during the cooldown and also when the player's score is below the shake cost. A cost label (e.g. "−50") SHALL be displayed below the button so the player can see the point penalty before tapping.

#### Scenario: Button visible on all devices
- **WHEN** the game is active (not game-over)
- **THEN** the shake button is visible regardless of whether tilt/motion controls are available

#### Scenario: Button triggers jostle
- **WHEN** the player taps the shake button and the cooldown has elapsed and score ≥ SHAKE_COST
- **THEN** a jostle fires and SHAKE_COST points are deducted from the score

#### Scenario: Button disabled during cooldown
- **WHEN** a jostle was triggered within the cooldown window
- **THEN** the shake button appears disabled and does not respond to taps

#### Scenario: Button disabled when score too low
- **WHEN** the player's score is below SHAKE_COST
- **THEN** the shake button appears disabled

#### Scenario: Button re-enables after cooldown
- **WHEN** the cooldown elapses and score ≥ SHAKE_COST
- **THEN** the shake button returns to its active state

### Requirement: Shake point cost
Triggering a jostle (via button or physical shake) SHALL deduct `SHAKE_COST` points from the score immediately, floored at zero. `SHAKE_COST` SHALL be a named exported constant so the React HUD can reference it for display and gating without duplicating the value.

#### Scenario: Points deducted on jostle
- **WHEN** a jostle fires (button or physical shake)
- **THEN** the score decreases by SHAKE_COST, minimum zero

#### Scenario: Score cannot go negative from shake
- **WHEN** the player triggers a jostle with a score less than SHAKE_COST
- **THEN** the score is set to zero, not a negative value

### Requirement: Jostle impulse sequence
A jostle SHALL apply a three-phase impulse sequence to all non-consumed balls:
1. **Upward burst** (immediate): strong upward force to lift balls — risky if the container is near full.
2. **Swing left** (~120 ms delay): lateral force pushing balls left.
3. **Swing right** (~280 ms delay): lateral force pushing balls right, with slight random magnitude variation so the sequence does not feel mechanical.

Each phase adds per-ball random scatter so balls move independently rather than as a single block. Force magnitudes SHALL be named tuning constants (`JOSTLE_UP_FORCE`, `JOSTLE_LATERAL_FORCE`, `JOSTLE_SCATTER`).

#### Scenario: Upward burst lifts balls
- **WHEN** a jostle fires with balls settled at the top of the container
- **THEN** balls are pushed upward and may overflow if the container is full

#### Scenario: Left-right swing follows the upward burst
- **WHEN** a jostle fires
- **THEN** balls swing left, then right in sequence shortly after the upward burst

#### Scenario: Each ball moves independently
- **WHEN** a jostle fires with multiple balls in the container
- **THEN** each ball receives slightly different forces due to per-ball scatter

#### Scenario: Impulse does not apply to consumed balls
- **WHEN** a jostle fires at the same moment a ball is mid-merge
- **THEN** balls marked consumed do not receive the impulse
