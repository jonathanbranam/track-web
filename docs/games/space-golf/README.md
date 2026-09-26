# Space Golf

> *Mini golf in space. Every planet is a tee.*

Named 2026-09-26. Archived OpenSpec change: `openspec/changes/archive/2026-09-26-space-golf/`.

A fork of **Orbital Dodger** for `client-games` that breaks most of that game's rules.
Orbital Dodger is real-time: you thrust, burn fuel, and dodge planets. Space Golf
is turn-based. The ship always rests in orbit around a planet. From there you line
up one **shot**, watch it fly, and it settles into the next orbit. You go from orbit
to orbit up a vertically scrolling course, picking up stars on the way. The aim is
the fewest shots with the most hull left.

Status: **v1 built** (2026-09-26) as the OpenSpec change `space-golf`: four
levels, both aim modes, hull, scoring and the leaderboard, playable at
`/game/space-golf`. Orbital Dodger stays as it is. The two games are forked, so
both can be explored. The v1 rules are in
`openspec/specs/games-space-golf/spec.md`. This folder
keeps the thinking behind them.

## The feel: putt-putt plus pinball

| Source | What we take |
|---|---|
| **Mini golf / putt-putt** | Strokes and par, obstacles as puzzles, a hard shot that goes out of bounds costs a stroke and you play again from where you were, a restart button |
| **Billiards** | Slow, planned shots. The aim line is the main thing you look at. All of the skill is in the setup |
| **Pinball** | Bumpers, kickers, lanes, and a table that goes *up* rather than draining down. The ball's own momentum does the work |
| **Orbital Dodger** | Inverse-square gravity, orbit rings and capture, the forecast line, glancing bounces off planets, the level editor |
| **Angry Birds / Worms** | Pull back to aim and release to shoot, with a shown trajectory |
| **Desert Golfing** | One shot at a time, each one short, a course you move along |

## Core loop

```
      ┌──────────────┐   aim (time frozen)   ┌──────────────┐
      │  IN ORBIT    │──────────────────────▶│   SHOT       │
      │  (a "lie")   │   release point +     │  (replayed   │
      │              │   power; the forecast │  from a pre- │
      └──────▲───────┘   arc shows the lock  │  computed    │
             │                               │  path)       │
             │  captured by a ring           └──────┬───────┘
             ├──────────────────────────────────────┤
             │  out of bounds / adrift              │  hit a planet or wall
             │  → back to the last lie, +1 stroke   │  → lose hull, keep flying
             │                                      │
             │          hull reaches 0 → restart level (rare)
             │          reach the Hole → hole done, score it
```

## The rules as first set out (2026-09-26)

These were refined later. Stars became the main goal, the wormhole became the level exit, and the aim modes became settings; see `open-questions.md`.

1. You can die, but only rarely. There is no fuel.
2. Movement is slow and planned, like billiards.
3. The ship always locks into orbit around a planet. You set up the next shot while it orbits.
4. The shot's result is drawn as a forecast arc, longer than Orbital Dodger's, and the arc includes the orbit lock at the end.
5. The goal is to collect the stars in as few shots as you can (and, as a secondary measure, with the least power).
6. Fewer shots and less power score higher. So does finishing with more hull.
7. Each level is a puzzle. A riskier line picks up more stars and brings you closer to getting hurt.
8. Bouncing off a planet hurts. Map edges either bounce (and hurt) or wrap.
9. A very hard shot can fly out of the map. When it does, you go back to your most recent orbit, not to the start of the level.
10. There is a **Restart** button for when your position has gone bad.
11. Courses scroll vertically, bottom to top.
12. Planets are not the only thing that moves the ship. There are also straight-line pushes (solar wind) and other pinball-style pieces.

## Files

- `README.md`: this pitch
- `ideas.md`: mechanics brainstorm covering the shot model, capture, forecast, hull, scoring, course pieces and level structure
- `tech.md`: how it forks from Orbital Dodger, what to reuse, and the determinism requirement
- `open-questions.md`: decisions not made yet
