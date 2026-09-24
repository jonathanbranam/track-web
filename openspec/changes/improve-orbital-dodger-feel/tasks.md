## 1. Groundwork

- [x] 1.1 Re-read `kb/phaser-mobile-input.md` before touching input. Confirm the new press-origin tracking (relative drag) and the orbit-release press are handled on scene-level `this.input` (Fix 1), and that `input: { windowEvents: false }` (Fix 2) and the `pointerupoutside` and `isDown` guards are kept. Done when you can say which fix covers each input surface this change touches.
- [x] 1.2 Add the new `Tuning` fields and defaults to `physics.ts`: `shieldCharges`, `lethalImpactSpeed`, `bounceOut`, `kickTangential`, `shieldGraceSec`, `orbitHeight`, `captureBand`, `captureAngleDeg`, `captureSpeedTol`, `orbitScoreArcDeg`, `controlMode`, `controlDeadzone`, `edgeMode`. Default `controlMode` to `'relative'` and `edgeMode` to `'bounded'`. Narrow the `Slider.key` type in `TuningPanel.tsx` to the numeric keys, so the enum fields do not break it. Verify with `npx tsc --noEmit -p client-games/tsconfig.app.json`.

## 2. Pure logic (`physics.ts` + `physics.test.ts`)

- [x] 2.1 Add `wrapDelta` and a position-wrap helper. Make `gravityAccelAt`, `scoreRateAt` and the contact check use minimum-image displacement when `edgeMode === 'wrap'`. Tests to add:
  - Acceleration just either side of a seam, next to a planet near the opposite edge, is equal to within tolerance.
  - Bounded-mode results are unchanged from today's tests.
- [x] 2.2 Implement `thrustDirection(mode, ship, pressOrigin, pointer, lastDir, deadzone)`, and change `stepShip` to take a direction (or null) instead of a target point. Tests to add:
  - Relative mode follows the drag vector wherever the ship is, including at the field edge.
  - A relative drag inside the deadzone returns null.
  - Direct mode inside the deadzone returns `lastDir`.
  - Existing clamp and no-fuel tests are rewritten against the new signature and still pass.
- [x] 2.3 Implement impact classification and `resolveGlancingImpact` (design D1), and make `checkLoss` return a contact instead of `crash` for overlaps. Tests to add:
  - A skim with low normal and high tangential speed is glancing.
  - A straight-in drop above `lethalImpactSpeed` is direct.
  - After resolution the ship is outside the surface, and its velocity has an outward component and a tangential component in the same direction as before.
  - A zero-tangential contact still gets a tangential kick.
  - Out of bounds never triggers in wrap mode.
- [x] 2.4 Implement `orbitRings(planets, tuning)`, which gives each ring's radius, circular speed (capped below `maxSpeed`) and culling, and `tryCapture(ship, rings, tuning)`. Tests to add:
  - A tangent approach at `vc` inside the band captures.
  - A steep approach, a far-off speed, or being outside the band does not capture.
  - A ring that would cross a neighbouring planet is culled.
  - `vc` never exceeds `maxSpeed`.
- [x] 2.5 Implement the locked-orbit bonus decay factor (half-life), and make `projectForecast` wrap-aware: continue across edges in wrap mode and return segment breaks at seams. Tests to add:
  - The decay factor is 1 at t=0 and 0.5 at one half-life.
  - A wrap-mode forecast crossing an edge continues on the other side with a segment break.
  - A bounded-mode forecast still stops outside the field.
- [x] 2.6 Run `npm test`. Verify every `physics.test.ts` test and the rest of the suite pass.

## 3. Scene (`OrbitalDodgerScene.ts`)

- [x] 3.1 Input: record `pressOrigin` on `pointerdown`, track the pointer while it is down, and each sub-step compute thrust through `thrustDirection`. Drain fuel only when a direction is returned. Draw the relative-mode guide from the origin to the pointer, plus a heading tick on the ship. Check in `npm run dev -w client-games`:
  - A drag steers from anywhere on screen.
  - A tap inside the deadzone burns no fuel.
  - Releasing outside the canvas still stops thrust.
- [x] 3.2 Shields: track charges and the grace timer, resolve contacts through the physics helpers, tint the ship red during grace, emit `shields`, and reset charges on retry and new layout. Check manually:
  - Skimming a planet costs one charge and knocks the ship along the surface.
  - Diving straight in ends the run.
  - With 0 charges, any touch ends the run.
- [x] 3.3 Orbit lock: build the rings on layout (and when `orbitHeight` changes), draw them faint or highlighted, run `tryCapture` when not thrusting, advance the ship on rails while locked (no gravity, fuel or collision), release on press with the recapture block, apply the bonus decay to scoring, and hide the forecast while locked. Check manually:
  - Coasting onto a ring locks the ship and it orbits indefinitely.
  - A press breaks the orbit and the ship continues from its orbital velocity.
  - The score rate falls over a long lock.
- [x] 3.4 Off-screen indicator (design D4): draw it in bounded mode when the ship is outside the field. Check manually that it appears on the nearest edge pointing at the ship, turns redder and pulses as the ship nears the margin, and disappears on re-entry.
- [x] 3.5 Wrap mode: wrap the ship position after each step, split the trail and forecast polylines at seams, and draw ghost planets near the edges. Check manually with the dev panel set to wrap:
  - The ship crosses each edge and reappears opposite.
  - No lines span the field.
  - The run never ends as out of bounds.

## 4. React host and dev panel

- [x] 4.1 `OrbitalDodgerGame.tsx`: subscribe to `shields` and render charge pips beside the fuel bar. Check that the pips decrement on a glancing hit and refill on retry.
- [x] 4.2 `TuningPanel.tsx`: add a "Shields" and an "Orbit" slider group for the new numeric fields, and add select controls for `controlMode` and `edgeMode`. Check that each control changes behavior live (per the spec), and that Reset restores all new fields to their defaults.

## 5. Verification

- [x] 5.1 Run `npm test` and `npm run build -w client-games` (or the repo `npm run build`). Confirm zero TypeScript errors and all tests passing.
- [x] 5.2 Use a disposable second instance (`docs/dev-second-instance.md`) and playwright-cli to exercise:
  - a relative-drag run
  - a glancing hit, checking that the shield pip drops
  - an orbit capture
  - the off-screen indicator
  - wrap mode

  Save screenshots to `/tmp/track-verify/`. Done when each behavior is visible in a screenshot.
- [ ] 5.3 Hand the build to the user for phone playtesting of default tuning: lethal impact speed, capture tolerances, locked scoring arc, empty-tank grace, and relative vs. direct control. Record the tuned defaults in `DEFAULT_TUNING`, and record any follow-ups (such as easing into orbit capture, or making wrap the default) in `docs/app/planning.md`.

## 6. Playtest follow-ups (2026-09-22)

- [x] 6.1 Replace the locked-orbit bonus half-life with a scoring arc (`orbitScoreArcDeg`, default 180°). The whole score rate should fade linearly to zero over the arc. Verify a unit test covers factor 1 at capture, 0.5 at half the arc, and 0 at and past the full arc, and that the dev panel slider replaces the half-life one.
- [x] 6.2 Add an empty-tank grace period (`fuelGraceSec`, default 5 s). `checkLoss` reports out of fuel only once the grace has elapsed, and the countdown also runs while locked. Verify unit tests cover alive during grace and out of fuel at grace, and that the HUD shows the countdown in the browser.
- [x] 6.3 Make relative drag analog: throttle rises quadratically from the deadzone to full at `controlFullDrag` (default 100 px), fuel drains in proportion to throttle, and an outer guide ring shows the full-thrust distance. Verify unit tests cover a quarter throttle halfway through the ramp and full throttle at and beyond `controlFullDrag`, and that the dev panel has the new slider.
- [x] 6.4 Influence zones and true-orbit rings (design D8):
  - add `influenceZones` (toggle), `influenceInner` and `gravityReach` to tuning and the dev panel
  - make `gravityAccelAt` zone- and reach-aware
  - size rings by planet radius at true circular speed, raised under the speed cap, and dropped when outside the inner zone
  Verify unit tests cover the zone edge sitting at equal pull, neighbours ignored inside a zone, continuity at the edge, reach cut-off, smaller rings being lower and slower, and released orbits holding in generated layouts.
- [ ] 6.5 Phone playtest of influence zones and gravity reach: whether zones feel right in free flight, the inner-zone fraction, and whether a reach is worth turning on.
- [x] 6.6 Raise contrast of everything drawn against space, since orbit rings were invisible on a phone. Changes: unlocked rings go from 12% to 45% opacity and 1.5 px (locked rings go to 3 px, fully opaque); the forecast keeps at least 25% opacity at its tail; the trail, steering guide, heading tick, ghost planets and off-screen indicator are all brighter; the ship gets a white rim; planet shadow colours are lighter and planets get a lit rim; background stars are slightly brighter; HUD labels, the fuel track and empty shield pips are brighter. Verify that `tsc` and the orbital-dodger tests pass, then check on a phone.
- [ ] 6.7 Phone check of the 6.6 contrast pass: unlocked rings visible but still clearly fainter than a locked ring, and background stars not competing with the rings.
- [x] 6.8 The run waits for the first press: every run (first, retry, new layout) starts frozen with a "Touch and drag to launch" prompt, rings and the forecast visible, and the first press launches and steers. Verify with `tsc`.
- [ ] 6.9 Browser or phone check of 6.8: nothing moves, scores or drains before the first press; the first drag thrusts immediately; retry and new layout wait again.
