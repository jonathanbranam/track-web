# Space Golf: Tech

How the game forks from Orbital Dodger
(`client-games/src/games/orbital-dodger/`), and the one engineering rule that
matters most.

## As built (v1, 2026-09-26)

The code lives in `client-games/src/games/space-golf/`. It began as a copy of
`orbital-dodger/` and shares no code with it.

| File | What it is | Where it came from |
|---|---|---|
| `physics.ts` | Gravity, influence zones, reach, rings, `Tuning` | Dodger's `physics.ts`, cut down. x-only wrap |
| `shot.ts` | `simulateShot`: the whole flight as a pure function | New |
| `run.ts` | `LevelRun` plus `applyShot`: strokes, out-of-bounds revert, penalties | New |
| `scoring.ts` | `scoreBreakdown` | New |
| `levels.ts` / `levelData.ts` | Level types, `buildCourse`, `validateLevel`, and the four shipped levels | New |
| `solver.ts` | BFS shot search. Tests use it to prove each level is completable | New |
| `aim.ts` | Aim model: timed or planned release, pause | New |
| `storage.ts` | localStorage: `space-golf:settings`, `:tuning`, `:level` | New |
| `SpaceGolfScene.ts` | Phaser: render, input, camera, replay | Dodger's scene (planet textures, input guards) |
| `SpaceGolfGame.tsx` | React host, HUD, overlays | Dodger's host (boot, resize, panel inset) |
| `TuningPanel.tsx` | Sliders, saved per browser | Dodger's panel without server configs |

The sketches below are what was planned before building; the table above is
what shipped.

## Determinism: what you see is what you get

Space Golf is a puzzle game. The forecast arc makes a promise, and the shot has to
keep it exactly.

Orbital Dodger does **not** keep that promise, and it doesn't need to:

- The scene steps at `SUB_STEP = 1/120` (`OrbitalDodgerScene.ts`).
- `projectForecast` steps at `FORECAST_DT = 0.035` with a 150-step cap
  (`physics.ts`).
- Thrust is left out of the forecast on purpose.

So in Dodger the line is a rough guide. In Space Golf the plan is:

```
  simulateShot(course, lie, shot) ──▶ { path[], events[], outcome }
        pure · fixed dt · no Phaser        │
                                           ├─▶ the forecast draws path[] (maybe cut short)
                                           └─▶ the scene REPLAYS path[] when you fire
```

- The shot is a **pure function**. It takes the course, the current lie (planet,
  angle, orbit direction), and the shot (release angle, power), and returns the
  whole flight: sampled points, events (star collected, bounce with its damage,
  wind entered, lock), and an outcome (`lock` on a planet / `hole` /
  `out-of-bounds` / `adrift` / `destroyed`).
- **The scene does not simulate.** It animates the precomputed path. Forecast and
  flight cannot disagree, because they are the same data.
  *Changed 2026-09-26 (`space-golf-vector-shots-and-nudges`):* in-flight nudges
  mean the path isn't fully known at fire time. `simulateShot` is now
  `startFlight` + a loop of `stepFlight`, and the scene plays the flight live
  through `flight.ts`, one `stepFlight` per fixed step. It's still the same step
  rule, so an un-nudged flight is identical to its forecast. Slow motion changes
  only how many steps a frame buys, never `SIM_DT`.
- Cost: a 10-second flight at 1/120 s is 1,200 steps × N planets. That is cheap
  enough to recompute on every aim change, and cheaper still if it is throttled or
  only recomputed when the aim settles.
- It needs a cap on steps. If the cap is hit, the outcome is `adrift`: back to the
  last lie with a stroke.

### What this makes possible

- **Unit tests are whole shots.** "From P1 at 90°, power 0.4, the ship locks on
  P2 and picks up stars 1 and 2." That is a Gherkin-shaped scenario for free.
- **A par solver.** Brute-force search over (release angle × power), for example
  360 × 50, to find the fewest shots through a level. The editor can warn when the
  authored par can't be reached, or report the solver's par. It runs in Node, so
  it could also run in the `pi/harness` bench the way dungeon-engine does.
- **Replays and ghosts** are just the list of shots.

## What to take from Orbital Dodger

`physics.ts` is already pure and tested (741 lines of tests). Pieces worth
carrying over:

| Dodger piece | Use in Space Golf |
|---|---|
| `displacement`, `wrapDelta`, `wrapCoord` | Keep. Wrap applies to the sides only |
| `gravityAccelAt`, `influenceRadii`, `neighbourWeight` | Keep. Influence zones keep orbits stable in a crowded course |
| `circularSpeed`, `ringFor`, `orbitRings` | Keep. Ring placement rules still apply |
| `tryCapture` | **Rework.** Capture on a speed gate instead of the angle and speed band |
| `advanceOrbit` | Keep, for the idle orbit and the wind-up before release |
| `classifyImpact`, `resolveGlancingImpact` | Keep the maths. Damage comes from the speed into the surface rather than from a lethal threshold |
| `projectForecast` | **Replace** with `simulateShot` |
| `thrustDirection`, fuel, shields, `scoreRateAt`, `orbitScoreFactor` | Drop |
| `levels.ts` (layout, draft, validation) | Fork. The layout gains height, a tee, a hole, par and pieces |
| `LevelEditor.tsx`, `LevelPicker.tsx`, `TuningPanel.tsx`, `configs.ts` | Fork the pattern. The editor is where levels get made |
| Server `orbitalConfigs` / orbital levels routes, `game_od_levels` | See "Server" |

## Fork, don't share (for now)

Two options:

1. **Copy and diverge.** Copy `orbital-dodger/` to `space-golf/`, delete what
   doesn't apply, and let the two drift apart. Dodger is in production with specs
   (`games-orbital-dodger`, `games-orbital-dodger-levels`), so nothing in Space Golf can
   break it.
2. **Extract a shared `orbital-core`**, the way `@repo/dungeon-engine` was pulled
   out of dungeon-tactics.

**Recommendation: copy and diverge first.** The whole point is to explore both
games, and a shared core would couple the experiments. If both games survive and
the gravity and ring code stays the same, extract it later. Dungeon-engine is the
precedent: it was extracted once it had a second consumer, not before.

## Course geometry

- Dodger's field is a fixed 400×720, and `LEVEL_LIMITS` mirrors the server.
  Space Golf's is 400 × H, with H set per level (say 720 to 3000).
- A camera is needed: follow the ship during a shot, and let the player drag to
  pan while aiming. Phaser's camera bounds and `startFollow` cover this.
- Wrap only on the x axis. The bottom and top are out of bounds, and the hole is
  near the top.

## Level document (sketch)

```ts
interface GolfLayout {
  v: 1
  height: number
  sides: 'bounce' | 'wrap'
  par: number
  forecast: number            // arc length shown, px (or Infinity = to the lock)
  tee: { planet: number; angleDeg: number; dir: 1 | -1 }
  hole: { planet: number }    // locking here finishes the hole
  planets: { x; y; r; color; ringHeight?; captureSpeed? }[]
  stars: { x; y }[]
  pieces: (
    | { kind: 'wind'; x; y; w; h; ax; ay }
    | { kind: 'bumper'; x; y; r; boost }
    | { kind: 'asteroids'; x; y; w; h; damage }
    | { kind: 'nebula'; x; y; r; drag }
    | { kind: 'wormhole'; a: {x;y}; b: {x;y} }
  )[]
}
```

## Server

- **Levels:** give Space Golf its own table (`game_sg_levels`?). The layout is a
  different document, and keeping it apart from `game_od_levels` means neither
  game's validation constrains the other. The routes follow the orbital levels
  pattern, and `openapi.yaml` must be updated with them.
- **Tuning configs:** the same pattern as `game_od_configs`, if a tuning panel is
  wanted. Many of Dodger's knobs go away, so this may not be needed at first.
- **Scores:** `game_scores` keyed per level, as Dodger's leaderboard does.
  "Score" might be the composite, or strokes with tie-breaks. See the open
  questions.

## Where it lives

- A new entry in `client-games/src/games/registry.ts`. It is inside the existing
  games app, so there is no new subdomain and the CLAUDE.md "keep in sync"
  checklist mostly does not apply. `openapi.yaml` and `llm-context.md` still need
  updating if API routes are added.
- Phaser is already externalized in client-games, so there are no build concerns.
- Tests go in `client-games`, which is already in the vitest include list.

## Suggested first slice

The smallest thing that answers "is this fun?":

1. `simulateShot` plus tests: planets, rings, speed-gate capture, bounce damage,
   side walls, and out of bounds going back to the last lie.
2. One fixed 400×720 hand-authored hole (no scrolling yet), a tee, a hole planet,
   and 3 stars.
3. Aiming: drag the release point, pull back for power, Fire. The forecast arc
   including the lock.
4. HUD: strokes, par, stars, hull, and Restart.

Leave scrolling, wind, bumpers, the editor, the server, and scores for the slices
after that.
