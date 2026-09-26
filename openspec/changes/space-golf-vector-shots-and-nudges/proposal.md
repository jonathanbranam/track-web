# Proposal

## Why

Playtesters of Space Golf asked for two things. First, they want to correct a
shot once it is flying, using thrusters as in Orbital Dodger. Second, a shot can
only leave its ring prograde, along the orbit, so the only choices are *when* to
release and *how hard*. That was the intended design, but many players expected
to be able to push the ship in any direction. Letting the player aim the launch
impulse freely gives more shots to choose from on every lie, and a small in-flight
nudge lets them rescue or finesse a flight. Both keep the game's core promise: the
shot you line up is the shot you get.

## What Changes

- **Vector shots (new aim option).** A new **Shot** setting: `prograde` (default,
  today's behaviour, unchanged) or `vector`. In vector mode the drag sets both the
  direction and the strength of an impulse. The ship leaves the ring with its
  orbital velocity plus that impulse, so pushing forward speeds it up, pushing
  outward lifts it off the ring, and pushing backward can kill its orbit. Vector
  mode works with both timed and planned release and with pause-while-aiming. The
  aim indicator shows the direction and the strength. The forecast is exact, as
  before.
- **In-flight nudges.** During a flight, pressing and dragging anywhere fires the
  ship's thrusters in the drag direction, as in Orbital Dodger's relative control:
  nothing inside a deadzone, and throttle ramping up with drag distance. The
  thrust is deliberately weak, a nudge rather than an engine burn. It is
  unlimited, but every second of thrust costs score through a new tunable
  **fuel cost** term.
- **Slow motion while nudging (new setting).** An on/off setting with a speed
  slider, both remembered per browser. While a finger is down in flight, time runs
  at the chosen fraction of normal speed.
- **No forecast in flight.** The forecast is drawn only while aiming. A flight
  that is never nudged still follows its forecast exactly. A nudged flight is not
  forecast.
- **Scoring** gains a `− fuel used × fuelCost` term. With no nudges the score is
  the same as today. The summary shows the new term.
- The flight is **simulated step by step as it plays** instead of being
  precomputed. It uses the same fixed-step function as the forecast, so an
  un-nudged flight is still identical to its forecast.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `games-space-golf`: the Shots, Aim modes, Deterministic shot simulation, Forecast
  arc, Flight follows the forecast, Scoring, Heads-up display and controls, Level
  summary and Tuning panel requirements change, and a new In-flight nudges
  requirement is added.

## Impact

- `client-games/src/games/space-golf/`: `shot.ts` (vector launch; the per-step
  function is factored out of `simulateShot` so it can take thrust), `aim.ts` (the
  shot setting and the vector drag), a new pure nudge-control helper, `run.ts` and
  `scoring.ts` (fuel used), `storage.ts` (new settings), `SpaceGolfScene.ts` (live
  flight stepping, nudge input, slow motion, aim and thrust drawing),
  `SettingsPanel.tsx`, `TuningPanel.tsx`, `LevelSummary.tsx`, and tests for each
  pure module.
- No server, API, database or `openapi.yaml` changes. Scores go to the same
  leaderboard, and the leaderboard does not record whether a run used vector
  shots or nudges, just as it does not record tuning.
- Orbital Dodger is untouched. Space Golf still imports nothing from it; the
  relative-thrust helper is copied, not shared.
