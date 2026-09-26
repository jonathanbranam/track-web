# Design

## Context

Space Golf (`client-games/src/games/space-golf/`) currently simulates each flight
once, when the shot is fired. `simulateShot` in `shot.ts` returns the whole path
and its events, and the scene's `advanceFlight` moves a cursor along that path at
`120 × flightSpeed` steps per second (design §3 of the archived
`2026-09-26-space-golf` change). The forecast is a truncated call to the same
function, which is why "the forecast never disagrees" holds.

Both features in this change affect that pipeline:

- A **vector shot** changes only the launch state. The pipeline stays as it is.
- A **nudge** is input that arrives during a flight, so the path can no longer be
  fully known at the moment of firing.

The launch is `launchState` → `onRing(ring, angle, dir, speed)`, which gives a
prograde velocity. The aim model in `aim.ts` turns drag distance into power;
the drag's direction is currently discarded. Orbital Dodger's `thrustDirection`
(relative mode) is the behaviour players are asking for. Space Golf must not
import from `orbital-dodger/` (design §1 of the archived change).

See proposal.md for motivation and `specs/games-space-golf/spec.md` for
behaviour.

## Goals / Non-Goals

**Goals:**
- One step rule for the forecast, an un-nudged flight and a nudged flight. There
  is no second integrator.
- Vector shots keep the forecast exact.
- Every new rule is pure and tested under vitest: vector launch, nudge throttle,
  stepping with thrust, fuel accounting and scoring.

**Non-Goals:**
- No forecast during flight (the user decided this; it keeps nudging a skill).
- No fuel tank or per-shot limit. Nudging is limited only by its weak strength
  and its score cost.
- No change to the solver. It keeps searching prograde shots, which is enough to
  prove the shipped levels can be completed.
- No `direct` control mode (finger-relative-to-ship) from Orbital Dodger. The
  relative drag is the only nudge control.

## Decisions

### 1. Split `simulateShot` into `startFlight` + `stepFlight`

```
startFlight(course, lie, shot, opts, tuning) → FlightState
    { x, y, vx, vy, hull, taken[], prevOff[], blocked, step, length, fuelUsed }
stepFlight(course, state, thrust: Dir | null, tuning) → StepResult
    { point (x, y, hull, zone), events[], outcome | null }   // mutates state
simulateShot(...) = startFlight + loop stepFlight(…, null) until outcome / maxLength / cap
```

The body of today's loop moves into `stepFlight` without change. The only
addition is `thrust × nudgeThrust` added to the acceleration next to wind, with
`fuelUsed += |thrust| × SIM_DT`. `simulateShot` keeps its signature and its
`ShotResult`, so the forecast, the solver and the existing tests are unaffected.
The existing shot tests are the regression check that the refactor changed
nothing.

*Alternative:* keep the precomputed path, and on each nudge re-simulate the rest
of the flight from the current state. We rejected this because thrust applies
continuously while the finger is held, which means re-simulating every frame for
as long as the finger is down. It also leaves two code paths (replay and
re-simulate) that must agree. Live stepping has one path.

### 2. The scene steps the flight live, with an accumulator

`FlightState` replaces `flight.result`/`cursor`. Each frame:

```
budget += (dt / SIM_DT) × flightSpeed × (nudging && slowMo ? slowMoSpeed : 1)
while budget ≥ 1 and no outcome: stepFlight(…, currentThrust); budget -= 1; apply events
render at lerp(prevPoint, point, budget)   // same smoothness as today's cursor
```

The thrust is sampled once per frame and held for that frame's steps. That is
deterministic for a given input sequence, which is all the spec asks. Events
(stars, damage popups, shake) are applied as they are produced instead of by
matching step indices. `resolve()` builds a `ShotResult`-shaped summary
(`stars`, `finalHull`, `outcome`, `fuelUsed`) for `applyShot`, so `run.ts` stays
pure and needs only the new field.

Because slow motion scales only the step budget and not `SIM_DT`, the spec's
"slow motion does not change physics" follows directly. A test drives
`stepFlight` with the same thrust sequence at different frame budgets and checks
that the paths are identical.

The global `flightSpeed` tuning still scales every flight. It already covers the
"slow the ship down for precision" idea without changing physics.

### 3. Vector launch: `ShotInput.dir?`

```ts
interface ShotInput { angle: number; power: number; dir?: { x: number; y: number } } // unit vector
```

With no `dir`, the launch is prograde and unchanged. With `dir`, the velocity is
`onRing(ring, angle, lieDir, vc).v + dir × power × launchBoost`, clamped to
`maxSpeed`. An exactly prograde `dir` gives the same velocity as today's formula
below the clamp, which the spec scenario "A forward vector shot matches a prograde
shot" tests.

Everything else is unchanged: `blocked` still ignores the launch ring until the
ship leaves its band, so an inward or retrograde shot falls toward the planet and
bounces or crosses the band inside, as the physics dictates. Scoring still
charges `power`, the impulse magnitude.

*Alternative:* slingshot aiming (pull back, fire the opposite way), as in golf
games. We rejected it because the user asked for Orbital Dodger's feel, where the
drag direction is the push direction, and because nudges use the same
convention. One convention for both inputs avoids confusion when a player aims
and then steers.

### 4. Aim model: `shot` setting and a stored direction

`AimSettings` gains `shot: 'prograde' | 'vector'`. `AimState` gains
`dir: Point | null`, the unit vector from `origin` to the finger. `moveAim` sets
it in vector mode, and it is left as it was inside the deadzone so that it does
not flail. `releaseAim`'s fire intent carries `dir`. In planned mode `dir`
persists with `power` until Fire. `storage.ts` reads older saved settings with
defaults for the new fields (`shot: 'prograde'`, `slowMo: true`,
`slowMoSpeed: 0.35`).

Drawing: in vector mode, draw an arrow from the ship along `dir` with length
∝ power, and keep the power arc. In prograde mode, drawing is unchanged.

### 5. Nudge control: a copied, pure `nudgeVector`

The new `nudge.ts` holds `nudgeVector(origin, pointer, deadzone, fullDrag) →
Dir | null`. It is Orbital Dodger's relative branch, copied: no thrust inside the
deadzone, quadratic ramp to full, and never exactly zero past the deadzone. New
tuning values: `nudgeThrust` (acceleration at full throttle, default about 90
units/s², against `launchBoost` 320 units/s of instant speed, so a full second of
thrust changes speed by about a quarter of a full-power shot's boost),
`nudgeDeadzone` 12, `nudgeFullDrag` 90, and `fuelCost` 20. The defaults are a
starting point for playtesting.

### 6. Input routing by phase

The same scene `pointerdown/move/up` handlers (Fix 1 in
`kb/phaser-mobile-input.md`) route by phase:

| phase | press/drag does |
|---|---|
| resting | aim (as today; Look mode scrolls) |
| windup | nothing |
| flight | nudge: `nudgeOrigin` = press point, thrust from the drag |
| done | nothing |

The press that fires a timed shot ends at `pointerup`, before the flight exists,
so an aim can never turn into a nudge. `update()` already recovers a lost
`pointerup` by checking `activePointer.isDown`. That check is extended to clear
the nudge, so thrust can never stay stuck on. Overlay buttons keep Fix 2
(`windowEvents: false`, already set). A tap on a button never reaches the
canvas, so it cannot start a nudge.

### 7. Scoring and run state

`LevelRun.fuelUsed` is summed in `applyShot` for every outcome, including
out-of-bounds and adrift: fuel spent, like hull lost, stays spent.
`ScoreBreakdown` gains `fuel` and `fuelCost`. The HUD does not change. The summary
shows the new row.

## Risks / Trade-offs

- [Live stepping costs more CPU per frame than cursor replay.] → It is the same
  work spread over the flight: up to about 3 steps per frame at `flightSpeed`
  1.5, and each step is the loop body that already runs 1,800 times per fire.
  This is negligible.
- [Refactoring `simulateShot` could change results in subtle ways.] → Move the
  loop body verbatim. The current `shot.test.ts` and `levels.test.ts` (solver
  completability) must pass unchanged. Add a test that
  `simulateShot` equals `startFlight` + `stepFlight(null)` step for step.
- [Vector shots make levels much easier, for example straight at the wormhole.]
  → This is already true for prograde shots (see "Hole-in-one is too easy" in
  `docs/games/planning.md`). Scoring keeps it a poor choice. Level design is a
  separate follow-up.
- [Nudging near rings may lock the ship when the player meant to steer past.] →
  Capture stays speed-gated, and a weak nudge rarely brings the ship under capture
  speed by accident. If playtesting shows it does, gate capture on "not thrusting"
  as Orbital Dodger does. That would be a spec change.
- [The default nudge strength is a guess.] → It is exposed in the tuning panel.
