# Mimlings — Technical Sketch

How it would fit `client-games`. Idea stage — no decisions locked.

## Shape: pure sim, thin scene

Follow the split the other games already use (`orbital-dodger/physics.ts`,
`ball-merge/logic.ts`): gameplay rules in plain TypeScript with tests, Phaser
only renders and turns touches into gestures.

```
client-games/src/games/mimlings/
  sim.ts          world state + fixed-step tick(): needs, habit pick, steering, growth
  habits.ts       habit types, observe/reinforce/decay/mutate
  spatial.ts      uniform grid hash for neighbour + sight queries
  rng.ts          seeded RNG so runs (and tests) are reproducible
  sim.test.ts     "feed near a cluster for N ticks → give-weight rises"
                  "an isolated group keeps its habits"
  MimlingsScene.ts  Phaser: draws Mimlings, the hand, gesture recognition
  MimlingsGame.tsx  React wrapper + HUD; registered in games/registry.ts
```

```
 touch ──▶ MimlingsScene ──gesture──▶ sim.applyGesture()
                 ▲                          │
                 │                    sim.tick() @ fixed 10–20 Hz
                 └──── read state ◀─────────┘
             (interpolate positions at 60 fps)
```

The sim knows nothing about Phaser, so it can run headless in vitest (the
`client-games` tests are already in `vitest.config.mts`) and could be
fast-forwarded ("what happens after an hour?") for tuning.

## Performance (iPhone first)

- Target **~200–300 Mimlings** at 60 fps render.
- **No Matter.js bodies per creature** (Ball Merge uses Matter, but it has a
  handful of balls). Hand-rolled boids steering + grid-hash neighbour lookup
  keeps it O(n).
- Sim at a lower fixed rate than render; interpolate sprite positions.
- Sprites from one texture atlas; tints for culture colours rather than
  separate art per culture.
- Phaser is already externalized to the CDN in `client-games` (see root
  `CLAUDE.md`) — no new build weight on the t4g.micro.

## Gesture recognition

Phaser pointer events are enough:

| Gesture | Detection |
|---|---|
| tap | down→up < ~200 ms, < ~10 px movement |
| long-press | held > ~450 ms, little movement |
| drag / carry | down on a Mimling, then movement |
| fling | release velocity above a threshold while carrying |
| wiggle | cumulative turning angle of the path > ~2π in a short time |

Keep gesture detection in its own small pure module so thresholds are testable.

## Art

- PixelLab (MCP available) for a small round animal with 4-direction walk,
  idle, sleep, and a "pop" split frame. Neutral/light base colour so tints read.
- Hand: a soft cartoon hand + shadow, a few poses (open, pinch, point).
- Glyph bubbles (♥ ? ! ♪ zzz) as a tiny sprite sheet.

## Persistence (depends on an open question)

- **Session-only**: nothing on the server; maybe a best "harmony" score via the
  existing `game_scores` / leaderboard.
- **Persistent herd**: serialize the sim state to the server per user, and on
  return simulate the time away (capped). Needs a table + routes (+
  `openapi.yaml`). A lot more build — only if the Tamagotchi feel is the point.
