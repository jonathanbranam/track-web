## Why

The tilt gravity bias in Ball Merge reads raw device axes (`accelerationIncludingGravity.x`) without accounting for screen orientation. When the device is rotated to landscape (90° or 270°), the device's x-axis no longer aligns with the screen's horizontal axis, so balls fall sideways or backward instead of downward relative to the visible game.

## What Changes

- Before applying tilt to gravity, rotate the device acceleration vector by `screen.orientation.angle` so that "down" on screen always maps to the correct device axis regardless of orientation.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ball-merge-tilt-shake`: The tilt gravity bias requirement must specify that the device acceleration components are mapped through the current screen orientation angle (0°, 90°, 180°, 270°) before computing `gravityX`, so lateral tilt always biases balls toward the correct screen edge.

## Impact

- `client-watch/src/` — game tilt/motion handling code (the `devicemotion` event handler that computes gravity bias)
- No API, data, or schema changes
