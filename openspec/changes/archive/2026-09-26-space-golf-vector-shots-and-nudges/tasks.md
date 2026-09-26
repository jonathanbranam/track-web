# Tasks

Tests: `npx vitest run client-games/src/games/space-golf`.

## 1. Step-rule refactor (no behaviour change)

- [x] 1.1 In `shot.ts`, split `simulateShot` into `startFlight` + `stepFlight(course, state, thrust, tuning)`, moving the loop body over unchanged (thrust `null` for now), and rebuild `simulateShot` on top of them. Verify: the existing `shot.test.ts`, `run.test.ts` and `levels.test.ts` (solver completability) pass with no edits.
- [x] 1.2 Add a test that `simulateShot`'s path, events and outcome equal a manual `startFlight` + `stepFlight(null)` loop, step for step, on a course with wind, asteroids, radiation, a bounce and a lock. Verify: the test passes.

## 2. Vector shots

- [x] 2.1 Add optional `dir` to `ShotInput`. `launchState` adds `dir × power × launchBoost` to the prograde orbital velocity and clamps to `maxSpeed`. Verify with shot tests: a prograde `dir` gives the same launch and path as no `dir`; an outward `dir` moves away from the planet; a strong retrograde `dir` leaves below `vc` and falls toward the planet; speed never exceeds `maxSpeed`.
- [x] 2.2 In `aim.ts`, add `shot: 'prograde' | 'vector'` to `AimSettings` (default `prograde`) and `dir` to `AimState`. `moveAim` sets `dir` from origin to finger, and holds it inside the deadzone. The fire intent carries `dir` in vector mode. Planned mode keeps `dir` until Fire. Verify with `aim.test.ts` cases for timed+vector, planned+vector, the deadzone hold, and prograde mode never setting `dir`.
- [x] 2.3 In `storage.ts`, persist the `shot` setting and fill in defaults for settings saved before this change. Verify: `storage.test.ts` covers the round trip and a legacy saved object with no `shot` field.
- [x] 2.4 In `SpaceGolfScene.ts`, pass `dir` to the forecast and the launch (timed release, and planned windup → launch). Draw the vector arrow (direction, length ∝ power) in vector mode. Add the Shot toggle to `SettingsPanel.tsx`. Verify: `npm run build:games` has zero TS errors. By hand, on a second instance (`docs/dev-second-instance.md`): with vector on, dragging left shows a left arrow, the forecast bends accordingly and the flight follows it, both timed and planned; with prograde on, the game plays as before.

## 3. In-flight nudges

- [x] 3.1 Read `kb/phaser-mobile-input.md` and confirm the scene still uses Fix 1 (scene `this.input`) and the game config uses Fix 2 (`windowEvents: false`) before changing input code. Verify: a note in the PR/commit that both are in place.
- [x] 3.2 Add `nudge.ts` with a pure `nudgeVector(origin, pointer, deadzone, fullDrag)` (copied relative-mode logic, no import from `orbital-dodger/`). Add `nudgeThrust`, `nudgeDeadzone`, `nudgeFullDrag` and `fuelCost` to `Tuning`/`DEFAULT_TUNING`. Verify with `nudge.test.ts`: null inside the deadzone, direction matches the drag, throttle rises with distance and caps at 1, and it is never zero past the deadzone.
- [x] 3.3 In `stepFlight`, add `thrust × nudgeThrust` to the acceleration, and track `fuelUsed += |thrust| × SIM_DT`. Verify with shot tests: a sideways thrust curves the path compared with none; identical thrust sequences give identical paths and fuel; the same thrust sequence gives the same path whatever the per-frame step batching (the slow-motion invariance); a nudge that slows the ship across a ring below capture speed locks.
- [x] 3.4 Add `fuelUsed` to `LevelRun` and `applyShot` (summed for every outcome, including out-of-bounds and adrift), and `fuel`/`fuelCost` to `scoreBreakdown`. Verify: `run.test.ts` covers fuel carried across an OB shot; extend the `scoreBreakdown` tests in `run.test.ts` with the spec's 165/585 cases (fuel 0) and the 585 → 545 case (2 s at default `fuelCost`).
- [x] 3.5 In `SpaceGolfScene.ts`, replace cursor replay with live stepping: a `FlightState`, a step budget from `dt / SIM_DT × flightSpeed`, interpolation between the last two points, events applied as they are produced, and `resolve()` building the summary for `applyShot` (including `fuelUsed`). No forecast in flight. Verify: `npm run build:games` has zero TS errors. By hand: un-nudged shots on every shipped level still follow their forecast to the same lock, star and wormhole outcomes.
- [x] 3.6 Route input by phase (design §6): a press/drag during flight sets the nudge origin/pointer and the thrust from `nudgeVector`. Clear the nudge on `pointerup`, on `pointerupoutside`, and in `update()` when `activePointer.isDown` is false. Draw the drag guide (deadzone and full-drag rings, drag line) and a thrust tick/flame on the ship. Verify by hand: dragging steers, a tap does nothing, lifting stops thrust, a release outside the canvas stops thrust, and tapping Restart mid-flight restarts without nudging.
- [x] 3.7 Slow motion: add `slowMo` (default on) and `slowMoSpeed` (0.1–1, default 0.35) to settings and storage (with legacy defaults), apply the factor to the step budget while a finger is down in flight, and add a toggle and slider to `SettingsPanel.tsx`. Verify: `storage.test.ts` round trip; by hand, holding in flight slows the ship on screen and lifting restores speed.
- [x] 3.8 Add the nudge constants and `fuelCost` to `TuningPanel.tsx`, and a fuel row (fuel used and its cost) to `LevelSummary.tsx`. Verify by hand: changing `nudgeThrust` changes the next nudge; Reset restores defaults; completing a level after nudging shows the fuel term and the submitted score matches the total.

## 4. Docs and integration

- [x] 4.1 Update Space Golf's player-facing notes in `docs/games/space-golf/` (controls: shot setting, nudging, slow motion, fuel cost). Add follow-ups to `docs/games/planning.md`: tuning the nudge strength, possibly gating capture while thrusting, and vector-shot level design. Verify: the docs describe the shipped defaults.
- [x] 4.2 Run the full `npm test` and `npm run build:games`. Verify: all tests pass and there are zero TypeScript errors.
- [x] 4.3 Playtest on an iPhone over the LAN at `http://<lan-ip>:6035` (a second instance): vector aim, nudging and slow motion by touch, overlay buttons during flight, and no stuck thrust. Verify: record the results when presenting the change.
  - 2026-09-26: the developer playtested on a phone from production and accepted the change; wider playtester feedback is still to come (follow-ups in `docs/games/planning.md`).
