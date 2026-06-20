## 1. Tuning Constants and Scene Event Wiring

- [x] 1.1 Add named tuning constants to `BallMergeScene.ts`: `MAX_TILT_GRAVITY`, `TILT_SMOOTHING`, `JOSTLE_FORCE`, `JOSTLE_VERT_FRAC`, `SHAKE_THRESHOLD`, `SHAKE_COOLDOWN_MS`
- [x] 1.2 Add scene state fields: `tiltEnabled`, `smoothedTiltX`, `lastJostileTime`, `onDeviceMotion` handler reference (for clean unsubscribe)
- [x] 1.3 Wire `game.events.on('tilt-enabled')` → subscribe to `devicemotion`, reset `smoothedTiltX`
- [x] 1.4 Wire `game.events.on('tilt-disabled')` → unsubscribe from `devicemotion`, call `matter.world.setGravity(0, 1)`
- [x] 1.5 Wire `game.events.on('jostle')` → call scene's jostle method (for shake button presses from React)
- [x] 1.6 Clean up all three event listeners in `SHUTDOWN` handler alongside existing `restart` cleanup

## 2. Tilt Mechanic (Scene)

- [x] 2.1 Implement `onDeviceMotion` handler: read `accelerationIncludingGravity.x`, apply EMA with `TILT_SMOOTHING`, call `matter.world.setGravity(gravityX, 1)` where `gravityX = -(smoothedX / 9.8) * MAX_TILT_GRAVITY`
- [x] 2.2 Verify axis sign on a real device; if balls drift the wrong way, negate the expression
- [x] 2.3 Ensure `doRestart` resets `smoothedTiltX = 0` and re-applies gravity from current tilt state (keeps tilt enabled across restarts)

## 3. Jostle Mechanic (Scene)

- [x] 3.1 Implement `jostle()` method: iterate non-consumed balls, call `this.matter.body.applyForce` with independently random lateral force (±`JOSTLE_FORCE`) and small vertical component (`JOSTLE_VERT_FRAC` fraction of lateral)
- [x] 3.2 Guard jostle with cooldown: check `this.time.now - lastJostleTime > SHAKE_COOLDOWN_MS`; update `lastJostleTime` on fire; emit `game.events.emit('jostled')` so React can disable the button
- [x] 3.3 Add physical shake detection inside `onDeviceMotion`: read `acceleration.x/y` (gravity-subtracted), compute delta magnitude vs previous sample, call `jostle()` when threshold exceeded and cooldown elapsed

## 4. React — Motion Controls Toggle

- [x] 4.1 Add `motionAvailable` constant: `typeof window !== 'undefined' && 'DeviceMotionEvent' in window`
- [x] 4.2 Add `tiltEnabled` state (boolean, starts `false`) to `BallMergeGame`
- [x] 4.3 Render motion controls toggle button in the top-right HUD button cluster, conditional on `motionAvailable`; active state visually distinct (e.g. highlighted icon)
- [x] 4.4 Implement toggle click handler: if enabling, check for `DeviceMotionEvent.requestPermission` and await it; on `'granted'` (or if no permission needed), set `tiltEnabled = true` and emit `game.events.emit('tilt-enabled')`; on denial, silently do nothing
- [x] 4.5 On disable: set `tiltEnabled = false`, emit `game.events.emit('tilt-disabled')`

## 5. React — Shake Button

- [x] 5.1 Add `jostleDisabled` state (boolean, starts `false`) to `BallMergeGame`
- [x] 5.2 Listen for `game.events.on('jostled')` in `onGameReady`: set `jostleDisabled = true`, schedule `setTimeout` for `SHAKE_COOLDOWN_MS` to set it back to `false`
- [x] 5.3 Render shake button in the game overlay, visible on mobile (`motionAvailable`), with `disabled={jostleDisabled}` and visual disabled state; tapping emits `game.events.emit('jostle')`
- [x] 5.4 Hide shake button and tilt toggle when `gameOver` is true (game-over overlay covers the canvas anyway)

## 6. Cleanup and State Reset

- [x] 6.1 On `game.events.on('restart')` in React: do NOT reset `tiltEnabled` — motion state persists across restarts
- [x] 6.2 Confirm `doRestart` in scene does not change `tiltEnabled` or unsubscribe from `devicemotion`
- [x] 6.3 Confirm scene `SHUTDOWN` handler removes the `devicemotion` listener if currently subscribed

## 7. Build and Verification

- [x] 7.1 Run `npm run build:games` and confirm zero TypeScript errors
- [ ] 7.2 Test on Android: tilt shifts balls, shake triggers jostle, button works, cooldown disables button
- [ ] 7.3 Test on iOS: first toggle tap shows permission dialog; grant enables tilt + physical shake; deny leaves toggle off silently
- [ ] 7.4 Test on desktop: tilt toggle not rendered; shake button visible; jostle fires on click
- [ ] 7.5 Test restart with tilt on: motion controls remain enabled after restart
- [ ] 7.6 Verify game-over does not change motion toggle state
