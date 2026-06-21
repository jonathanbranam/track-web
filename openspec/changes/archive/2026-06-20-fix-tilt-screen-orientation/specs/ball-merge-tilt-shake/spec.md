**App**: games

## MODIFIED Requirements

### Requirement: Tilt gravity bias
While motion controls are enabled, the game SHALL continuously bias the Matter.js world gravity on the x-axis in proportion to the phone's lateral tilt angle. The lateral tilt component SHALL be derived from `accelerationIncludingGravity` by mapping device axes through the current screen orientation angle, so the bias always tracks the visible screen's horizontal axis regardless of device rotation. The bias SHALL be applied via an exponential moving average to reduce jitter. The maximum lateral gravity bias SHALL be a named tuning constant.

The lateral component SHALL be selected based on `screen.orientation.angle` (falling back to `window.orientation` on platforms where the standard API is unavailable):

| Angle | Screen orientation     | Lateral axis |
|-------|------------------------|--------------|
| 0°    | Portrait               | `+x`         |
| 90°   | Landscape (CCW)        | `+y`         |
| 180°  | Portrait (inverted)    | `-x`         |
| 270°  | Landscape (CW)         | `-y`         |

The axis formula is `gravityX = (smoothedLateral / 9.8) * MAX_TILT_GRAVITY` where `smoothedLateral` is the EMA-smoothed screen-relative lateral value. No negation is applied to the 0° case because tilting the phone right increases `accelerationIncludingGravity.x` and should drift balls right; the 90°/270° signs follow the same physical convention for those orientations.

#### Scenario: Tilt right drifts balls right in portrait
- **WHEN** motion controls are enabled, the device is in portrait orientation, and the phone is tilted to the right
- **THEN** balls in the container drift toward the right wall

#### Scenario: Tilt left drifts balls left in portrait
- **WHEN** motion controls are enabled, the device is in portrait orientation, and the phone is tilted to the left
- **THEN** balls in the container drift toward the left wall

#### Scenario: Tilt right drifts balls right in landscape
- **WHEN** motion controls are enabled, the device is in landscape orientation, and the phone is tilted so balls should roll toward the right side of the screen
- **THEN** balls drift toward the right side of the visible screen (not sideways relative to the physical device)

#### Scenario: Flat phone has no bias in any orientation
- **WHEN** motion controls are enabled and the phone is held flat (no lateral tilt relative to the screen)
- **THEN** world gravity is effectively (0, 1) — no lateral drift

#### Scenario: Orientation change mid-session is handled automatically
- **WHEN** the player rotates the device while motion controls are enabled
- **THEN** tilt direction adapts to the new orientation on the next device-motion event with no additional user action required

#### Scenario: Tilt disabled resets gravity
- **WHEN** the player disables motion controls via the toggle
- **THEN** world gravity immediately resets to (0, 1)
