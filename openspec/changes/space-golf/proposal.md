# Proposal

## Why

Orbital Dodger is a real-time survival game: thrust, fuel, dodge. Playing it
surfaced a different game hiding inside its orbit rings and forecast line — a
slow, planned, shot-by-shot game where the ship rests in orbit and the skill is
in the setup. That game breaks most of Dodger's rules (no fuel, almost no death,
turn-based shots, a vertical course), so rather than bend Dodger into it, we fork
the code and build **Space Golf** alongside it so both can be explored.

The pitch: mini golf plus pinball in space. The ship always settles into orbit
around a planet. From there the player lines up a shot, watches it fly — bent by
gravity, pushed by solar wind, chipped by asteroids — and settles into the next
orbit. The goal is to collect as many stars as possible on the way to a wormhole
that carries the ship to the next level. Racing straight for the wormhole scores
badly; the good score comes from a multi-shot route that sweeps up stars while
keeping the hull intact.

## What Changes

- New single-player game **Space Golf** (slug `space-golf`) in `client-games`,
  registered in the games catalog and mounted directly.
- The Orbital Dodger folder is **copied** to `client-games/src/games/space-golf/`
  and diverges from there. No code is shared between the two games; Orbital
  Dodger is unchanged.
- **Lies and shots.** The ship rests on a planet's orbit ring (a *lie*). A shot
  launches it prograde (along the ring's tangent) with a chosen power. Every
  direction is available from some point on the ring, so *where* you release is
  the aim.
- **Aim modes** (player settings, remembered per browser):
  - *Release*: **timed** — the ship keeps orbiting and the shot leaves from
    wherever the ship is when you fire; or **planned** — you drag a release
    marker around the ring and the ship winds round to it before launching.
  - *Pause while aiming*: on — the orbit freezes while your finger is down; off —
    it keeps moving and the forecast swings with it.
- **Deterministic shot simulation.** A pure function computes the whole flight
  (path, events, outcome) at a fixed time step. The forecast arc draws its first
  stretch; firing replays exactly that path. What you see is what happens.
- **Orbit capture on a speed gate.** Crossing a ring below its capture speed locks
  the ship into orbit (whatever its heading); faster, it flies by with a gravity
  assist. A too-weak shot falls back into its own planet's orbit.
- **Hull, not lives or fuel.** 100 hull. Planet bounces, wall bounces, asteroid
  fields and radiation zones damage it. Reaching 0 restarts the level — tuned to
  be rare. A shot that leaves the course returns the ship to its last lie with a
  stroke and a small hull penalty, and the shot's stars are un-collected.
- **Course pieces**: planets, stars, a **wormhole** (the level exit), **solar
  wind** zones, **asteroid fields**, **radiation zones**.
- **Vertical courses.** Levels are 400 px wide and up to several screens tall;
  the camera follows the ship and the player can pan to scout while aiming. Side
  edges either bounce (and hurt) or wrap, per level.
- **Scoring** favours stars first, then few strokes, then hull left, then low
  total power. A hole-in-one that skips stars scores far worse than a three-shot
  route that collects them.
- **Level sequence.** A built-in, hand-authored sequence of levels shipped as
  client data; entering a level's wormhole goes to the next. A level picker, a
  **Restart** button, a HUD, and an end-of-level summary. Scores are submitted
  per level to the existing leaderboard (`/api/scores`).
- A tuning panel for play-testing the physics and scoring constants.
- Design notes live in `docs/games/space-golf/`.

Out of scope for this change (planned follow-ups): level editor and server-stored
levels, bumpers, wormhole pairs, enemy ships that shoot at you, moving planets,
fast-forward, multi-level course totals.

## Capabilities

### New Capabilities
- `games-space-golf`: the Space Golf game — course and level data, lies and
  shots, aim modes, deterministic shot simulation and forecast, orbit capture,
  hull and damage, out-of-bounds handling, course pieces, wormhole exit, scoring,
  HUD, restart, camera, level sequence and leaderboard submission.

### Modified Capabilities
<!-- None. The registry requirement in games-app-shell is generic; Orbital Dodger is untouched. -->

## Impact

- **New code**: `client-games/src/games/space-golf/` (pure simulation modules
  with tests, a Phaser scene, a React wrapper, settings and tuning panels, level
  data) and one entry in `client-games/src/games/registry.ts`.
- **Server/API**: none. Scores use the existing `POST /api/scores` and
  `GET /api/scores/leaderboard` with `gameSlug: 'space-golf'`. No new tables, no
  `openapi.yaml` change.
- **Tests**: new vitest files under `client-games/`, already in the include list.
- **Build**: Phaser is already externalized in `client-games`; no new
  dependencies.
- **Docs**: `docs/games/space-golf/`, `llm-context.md` games list,
  `docs/games/planning.md` follow-ups.
