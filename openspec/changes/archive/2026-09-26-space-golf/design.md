# Design

## Context

Orbital Dodger (`client-games/src/games/orbital-dodger/`) already has most of the
physics Space Golf needs, in pure and tested modules: inverse-square gravity with
influence zones and reach (`physics.ts`), orbit rings sized to a true circular
speed (`ringFor`, `circularSpeed`), kinematic orbiting (`advanceOrbit`), a
normal/tangential split of impacts (`classifyImpact`), and wrap-aware
displacement. The scene integrates in fixed sub-steps of 1/120 s. The forecast,
though, is a separate coarser integration (`FORECAST_DT = 0.035`, 150 steps,
thrust excluded), so it only approximates the flight. That is fine for Dodger but
not for a puzzle game. Everything else in Dodger (thrust, fuel, shields, score
rate, server configs, server levels, level editor) has no counterpart here.

The games app hosts Phaser through `PhaserGame.tsx`, with React owning the UI
around the canvas. Scores go through `POST /api/scores` (any `gameSlug`, `mode`,
`level` string) and are read back with `GET /api/scores/leaderboard`.

See proposal.md for motivation and the specs for behaviour.

## Goals / Non-Goals

**Goals:**
- Every gameplay rule lives in pure, render-free TypeScript that runs under
  vitest and Node. The Phaser scene only renders, handles input and replays
  results.
- The forecast and the flight are the same data.
- Space Golf and Orbital Dodger can change independently.
- The game is quick to tune by playing: constants in one place, a live panel, and
  levels as plain data.

**Non-Goals:**
- No server work: no tables, no routes, no `openapi.yaml` change.
- No level editor, and no shared "orbital core" package.
- No 60 fps re-simulation of full flights. Only the forecast's leading stretch is
  recomputed while aiming.

## Decisions

### 1. Copy Orbital Dodger, then cut it down; share nothing

`cp -r orbital-dodger space-golf`, rename, then delete the modules with no
counterpart (`configs.ts`, `LevelEditor.tsx`, `LevelPicker.tsx` (rewritten),
Dodger's server-backed `levels.ts`, thrust, fuel, shields, score rate). Space Golf
SHALL NOT import from `orbital-dodger/`.

*Alternative:* extract a shared `orbital-core` now, like `@repo/dungeon-engine`.
We rejected this because the games are expected to end up with different
architectures, and a shared core would make every Space Golf experiment a Dodger
regression risk. We can revisit it once both games have settled.

### 2. Module layout

```
space-golf/
  physics.ts      gravity, influence zones, x-only wrap displacement, rings,
                  advanceOrbit, Tuning + DEFAULT_TUNING        (trimmed from Dodger)
  shot.ts         launchState, simulateShot → ShotResult        (new, the core)
  run.ts          LevelRun state + applyShot(run, result)       (OB revert, strokes, hull)
  scoring.ts      scoreBreakdown(run, level, tuning)
  levels.ts       Level types, LEVELS (the shipped sequence), validateLevel
  solver.ts       coarse shot search: reachable lies → wormhole (tests + dev)
  aim.ts          pure aim model: drag → power, release point, cancel, mode rules
  storage.ts      localStorage: settings, tuning overrides, last level (try/catch)
  SpaceGolfScene.ts   Phaser: render, input, camera, replay
  SpaceGolfGame.tsx   React host: picker ↔ play ↔ summary, HUD, overlay buttons
  LevelPicker.tsx, LevelSummary.tsx, SettingsPanel.tsx, TuningPanel.tsx
  *.test.ts       physics, shot, run, scoring, levels(+solver), aim, storage
```

### 3. The shot is simulated once, then replayed

```
 lie + shot + course + tuning
            │
            ▼
   simulateShot(…, { maxLength? })  ── fixed dt = 1/120, pure
            │
            ├─ path: xs[], ys[]            (one point per step)
            ├─ events: [{ step, kind: 'star'|'bounce'|'wall'|'zone', … damage }]
            └─ outcome: lock{planet, angle, dir} | wormhole | out-of-bounds | adrift | destroyed
                        (+ step at which it happened)
```

- **The forecast** calls `simulateShot` with `maxLength = forecastLength`. It stops
  once it has travelled that far. Because the integration is step-by-step and
  deterministic, a truncated run is an exact prefix of the full run. This is how
  "the forecast never disagrees" holds without drawing the full flight.
- **Fire** calls it again without `maxLength` (the cap is `maxFlightSec`, default
  15 s, which is 1,800 steps) and hands the result to the scene. The scene moves a
  cursor along `path` at `120 × flightSpeed` steps per second, interpolating
  between steps and applying each event as the cursor passes its step.
- **Hull is part of the simulation** (it is an input and gets updated), because
  `destroyed` has to be detected at the step where it happens.
- **Order of checks in each step:** integrate (gravity, wind, asteroid drag) →
  side edges (bounce or wrap) → planet contact (bounce) → zone damage → stars →
  wormhole → capture → out of bounds → hull ≤ 0.

*Alternative:* a live simulation plus a separate forecast, as Dodger does. We
rejected it because two integrators drift apart, and a puzzle can't tolerate
that.

### 4. Capture by ring crossing, not only by band

At 1/120 s and `maxSpeed` 600, a step is up to 5 units, so a thin band could be
skipped. Capture triggers when the signed ring offset `d − R` changes sign between
steps *or* `|d − R| ≤ captureBand`, **and** speed ≤ `captureSpeedRatio × vc`. The
ship is snapped onto the ring at `atan2`. Its direction is the sign of its
tangential velocity, with +1 on an exact tie. The launch ring is ignored until the
ship has been outside its band for one step.

A shot launched above `captureSpeedRatio × vc` but below escape (√2 × vc)
circles back to the same periapsis above capture speed, so it never recaptures.
It ends as **adrift**, which is handled like out of bounds without the hull
penalty. We accept this. (Implementation check: raising `captureSpeedRatio` to 1.5
did not remove the band, because those orbits take longer than the flight cap to
come back round; the fix, if one is needed, is a power floor or a shorter cap.) Play-testing decides whether launch power needs a floor
that avoids that band.

### 5. Bounces

When a planet is touched (`d < r + shipRadius`): split the velocity into normal
and tangential parts, set `vn' = −restitution × vn`, keep `vt`, place the ship on
the surface, and damage = `max(0, vin − damageThreshold) × planetDamageRate`.
Side walls in `bounce` mode work the same way with `wallDamageRate`. This replaces
Dodger's "kick sideways" `resolveGlancingImpact`, which was designed to rescue a
thrusting pilot, not to be predictable.

### 6. Launch and power

`launchState(lie, releaseAngle, power)`: the position is on the ring at
`releaseAngle`. The velocity is the prograde tangent × `min(vc + power ×
launchBoost, maxSpeed)`. Power comes from drag distance:
`clamp((drag − deadzone) / (fullDrag − deadzone), 0, 1)`, and a value below
`minPower` cancels the shot.

### 7. Aim modes are a pure model the scene drives

`aim.ts` holds `{ mode: 'timed'|'planned', pause, pressOrigin, power,
markerAngle }` and exposes `press / move / release / fire`. It returns intents
(`fire at angle θ`, `cancel`, `freeze orbit`, `resume`). The scene feeds it
pointer events and the current orbit angle.

| | pause off | pause on (default) |
|---|---|---|
| **timed** (default) | Orbit keeps moving. Forecast recomputed from the live angle each frame. Release fires at the angle of the last rendered frame, which is exactly what was drawn | Orbit moves until pressed, then freezes. Drag sets power. Release fires |
| **planned** | Marker dragged along the ring (a press within 24 units of the ring moves the marker, elsewhere it sets power). Forecast comes from the marker, so it is stable. Fire button, then the ship winds round to the marker | Same, but the ship freezes while the finger is down (cosmetic) |

The forecast is only recomputed when its inputs change (angle, power, tuning), and
in timed + moving mode that is at most once per frame.

### 8. Levels are client data

`LEVELS: Level[]` in `levels.ts`, with coordinates in course units (y down, the
tee near `height`). There are four levels for v1:

1. **First Tee**: 720 tall, bounce sides, 3 planets, 5 stars. The tutorial.
2. **Tailwind**: about 1600 tall, wrap sides, a solar wind lane that carries a
   star line.
3. **The Belt**: about 2000 tall, bounce sides, an asteroid field full of stars
   with a safe route around it.
4. **Hot Zone**: about 2400 tall, wrap sides, radiation zones guarding star
   pockets, plus wind.

Exact layouts are worked out in the editorless loop: edit the data, run the
tests, play. `validateLevel` and the solver test keep them honest.

*Alternative:* the server-stored levels and editor from Dodger. That is deferred.
The level document here is richer (height, pieces, wormhole), and building an
editor before the rules are fun would be premature.

### 9. Solver as a test guard

`solver.ts` does a BFS over lies `(planet, dir)`. From each lie it samples 72
release angles × 12 powers with `simulateShot`, adds a lock onto a new lie as an
edge, and succeeds when any shot's outcome is `wormhole`. It is capped at depth 8.
With about 8 planets that is at most around 7k simulations of ≤ 1,800 steps, which
takes about a second per level in Node. The test asserts every shipped level is
solvable. It also reports the minimum strokes, which is useful while designing
levels. It is not exposed in the UI in v1.

### 10. Run rules in one pure reducer

`applyShot(run, result, tuning)` → next run. It covers: +1 stroke, power added to
total, hull from the result; on `lock` a new lie and the stars are kept; on
`out-of-bounds` the lie is unchanged, +1 penalty stroke, `obHullPenalty`, and the
shot's stars are reverted; `adrift` is the same without the hull penalty;
`wormhole` → complete; `destroyed` → destroyed. The scene and React only display
what the reducer returns, so the out-of-bounds, penalty and revert rules are unit
tested without Phaser.

### 11. Camera and rendering

The logical canvas stays 400 × 720 with Phaser `Scale.FIT`, as in Dodger. The
world is 400 × `level.height`, and the main camera's bounds are the world. At
rest, the camera eases to centre the lie planet. In flight it follows the ship's
replay position (lerp 0.15). In **Look** mode, a drag scrolls `camera.scrollY`
and the wheel scrolls at rest. In wrap levels, planets, zones and stars near a
side are also drawn at ±400 so the seam reads correctly. Wind streaks are
animated sprites scrolling along the wind vector. Asteroids are a static
scatter of rocks, seeded by the level id so they are stable. Radiation is a
pulsing tinted circle.

### 12. Input follows kb/phaser-mobile-input.md

- Aiming, marker dragging and Look drags use the scene's `this.input`
  (`pointerdown` / `pointermove` / `pointerup` / `pointerupoutside` / `wheel`).
  We never rely on DOM clicks on the canvas. Dodger's latch protection comes
  along: a missed `pointerup` is recovered in `update()` by checking
  `activePointer.isDown`.
- HUD buttons (Restart, Levels, Settings, Look, Fire, ⚙) are React overlay
  buttons with `onClick`, and the game config sets `input: { windowEvents: false }`
  so iOS keeps their synthesized clicks.
- React → scene commands go through `game.events` (`restart`, `fire`,
  `look-toggle`). Settings and tuning are objects the scene re-reads (tuning is
  mutated in place, as in Dodger). Scene → React goes through `hud`,
  `aim-changed`, `level-complete` and `destroyed` events, with HUD emission
  throttled to about 10 Hz.

### 13. Scores through the existing API

On `wormhole`, the React host calls `submitScore('space-golf', 'classic',
level.id, total)` and then `fetchLeaderboard` for the summary, reusing
`components/Leaderboard`. `submitScore` already skips scores ≤ 0. The server needs
no change.

### 14. Persistence is per browser

`space-golf:settings` (`{ release, pause }`), `space-golf:tuning` (only the
overrides, layered over `DEFAULT_TUNING` so new keys get their defaults), and
`space-golf:level`. Every access is wrapped in try/catch, and a failure falls back
to the defaults.

### 15. Default tuning (starting point for play-testing)

| Key | Default | Note |
|---|---|---|
| G, massScale, influenceInner | from Dodger | Same feel to start |
| gravityReach | 220 | Raised from Dodger's 100 during implementation: at 100 a planet's pull ends so near the ring that even a weak shot escaped, so "a weak shot falls back" never happened. At 220 shots up to ~0.15 power fall back |
| maxSpeed | 600 | Dodger's 200 is far too low for "violent" shots |
| launchBoost | 320 | Speed added at power 1 |
| deadzone / fullDrag / minPower | 18 / 140 / 0.03 | Drag → power |
| captureSpeedRatio / captureBand | 1.3 / 8 | |
| restitution | 0.6 | |
| damageThreshold / planetDamageRate / wallDamageRate | 40 / 0.1 / 0.08 | Inward 200 → 16 hull |
| obHullPenalty | 5 | |
| asteroidDamagePerUnit / asteroidDrag | 0.08 / 0.6 s⁻¹ | |
| radiationDps | 12 | |
| forecastLength / maxFlightSec / flightSpeed | 900 / 15 / 1.5 | Near-escape shots (just above capture speed) are still bound but orbit for longer than 20 s, so they end adrift; 15 s and a 1.5× replay keep that wait short |
| starPoints / allStarsBonus / hullPoints / strokeCost / powerCost | 100 / 200 / 1 / 25 / 10 | |

## Risks / Trade-offs

- **[Timed + moving aim is too hard on a phone]** → It is a setting, and pause
  and planned are one tap away. We'll pick the default after play-testing.
- **[A long forecast turns puzzles into tracing]** → `forecastLength` is tunable
  and can be overridden per level. Tutorial levels can show a lot, later ones
  less.
- **[Per-frame forecast cost on iPhone in timed + moving mode]** → Only the
  prefix up to `forecastLength` is simulated (about 900 units, typically
  < 300 steps). If profiling shows jank, throttle to every other frame; the
  release uses the angle that was last drawn, so correctness holds.
- **[The adrift band between capture speed and escape speed]** → It is handled
  like out of bounds, so it is never a soft-lock. Tuning or a power floor can
  narrow it later.
- **[Local tuning makes leaderboard scores incomparable]** → We accept this while
  exploring. Server configs are a follow-up if the game sticks.
- **[Copying code duplicates Dodger bug fixes]** → Accepted by design.
  `docs/games/space-golf/tech.md` notes where the code came from.
- **[Hand-authored levels are unplayable or trivial]** → `validateLevel` plus the
  solver test in CI. The solver's minimum stroke count helps judge difficulty.

## Migration Plan

This change only adds things: a new folder and one registry entry. Deploying is
a normal push to `main`. To roll back, remove the registry entry or revert the
commit. No data is involved.
