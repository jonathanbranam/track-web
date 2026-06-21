## 1. Implementation

- [ ] 1.1 In `BallMergeScene.onDeviceMotion`, read both `accelerationIncludingGravity.x` and `.y`
- [ ] 1.2 Add a helper that returns the screen-relative lateral value by switching on `screen.orientation?.angle ?? window.orientation ?? 0`: 0°→`+x`, 90°→`+y`, 180°→`-x`, 270°→`-y`
- [ ] 1.3 Replace the `rawX` variable with the helper's output and smooth it with the existing EMA into `smoothedTiltX` (rename to `smoothedTiltLateral` for clarity)
- [ ] 1.4 Verify that the 90° and 270° signs are correct on a physical device in landscape — swap if balls drift the wrong direction

## 2. Verification

- [ ] 2.1 Test portrait mode: tilt right → balls drift right, tilt left → balls drift left (no regression)
- [ ] 2.2 Test landscape mode: tilt the bottom of the screen down → balls drift toward the bottom of the visible screen
- [ ] 2.3 Rotate mid-session with tilt enabled and confirm the bias direction updates immediately without toggling tilt off and back on
- [ ] 2.4 Confirm flat phone → no lateral drift in both portrait and landscape
- [ ] 2.5 Run `npm run build:watch` and confirm zero TypeScript errors
