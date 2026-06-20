**App**: games

## ADDED Requirements

### Requirement: Motion controls toggle
The game SHALL display a motion controls toggle button in the HUD only on platforms where `DeviceMotionEvent` is available. The toggle SHALL start in the disabled state. Tapping it while disabled SHALL request iOS permission (if `DeviceMotionEvent.requestPermission` exists) and, on grant, enable motion controls (tilt + physical shake detection). Tapping it while enabled SHALL disable motion controls and restore default gravity. If iOS permission is denied, the toggle SHALL silently remain disabled with no error message shown.

#### Scenario: Toggle hidden on desktop
- **WHEN** the game loads in a browser where `DeviceMotionEvent` is not defined
- **THEN** the motion controls toggle is not rendered

#### Scenario: Toggle starts disabled
- **WHEN** the game loads on a mobile device
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
While motion controls are enabled, the game SHALL continuously bias the Matter.js world gravity on the x-axis in proportion to the phone's lateral tilt angle (derived from `accelerationIncludingGravity.x`). The bias SHALL be applied via an exponential moving average to reduce jitter. The maximum lateral gravity bias SHALL be a named tuning constant; the value SHALL be subtle enough that a flat phone produces near-zero bias.

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
- **THEN** a jostle fires (random lateral impulse applied to all active balls)

#### Scenario: Shake respects cooldown
- **WHEN** a jostle was triggered (by shake or button) within the cooldown window
- **THEN** a subsequent shake does not trigger another jostle until the cooldown elapses

#### Scenario: Shake inactive when motion disabled
- **WHEN** motion controls are disabled
- **THEN** shaking the phone produces no effect

### Requirement: Shake button
The game SHALL display a shake button in the game UI at all times on mobile (regardless of whether motion controls are enabled). Tapping it SHALL trigger a jostle immediately if the jostle cooldown has elapsed. The button SHALL appear visually disabled for the duration of the cooldown after any jostle fires (button press or physical shake).

#### Scenario: Button triggers jostle
- **WHEN** the player taps the shake button and the cooldown has elapsed
- **THEN** a random lateral impulse is applied to all active balls

#### Scenario: Button disabled during cooldown
- **WHEN** a jostle was triggered within the cooldown window
- **THEN** the shake button appears disabled and does not respond to taps

#### Scenario: Button re-enables after cooldown
- **WHEN** the cooldown elapses
- **THEN** the shake button returns to its active state

#### Scenario: Button visible without motion controls
- **WHEN** motion controls are disabled or unavailable
- **THEN** the shake button is still visible and functional

### Requirement: Jostle impulse
A jostle SHALL apply a randomized lateral impulse to each non-consumed ball independently, with a small randomized vertical component. The peak force and vertical fraction SHALL be named tuning constants. The direction of the lateral impulse SHALL be independently random per ball (not the same direction for all balls).

#### Scenario: Each ball receives an independent impulse
- **WHEN** a jostle fires with multiple balls in the container
- **THEN** each ball receives a lateral impulse that may differ in direction from the others

#### Scenario: Impulse does not apply to consumed balls
- **WHEN** a jostle fires at the same moment a ball is mid-merge
- **THEN** balls marked consumed do not receive the impulse
