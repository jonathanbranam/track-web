# Space Golf: Ideas

This is a brainstorm. Nothing here is decided unless `open-questions.md` lists it under *Decided*.

## 1. The shot model

The biggest design question is what a shot *is*. Three candidates:

### A. Prograde release: release point + power (recommended)

The ship leaves the ring along its tangent. The player chooses two things:

- **Release point:** where on the ring to let go. You drag a marker around the ring.
- **Power:** how much speed to add on release. You pull back like a slingshot.

```
                 release point (drag around the ring)
                        ▼
              · · · ·  ●──────▶  tangent = shot direction
          ·           ·   ╲
        ·    PLANET     ·   ╲  power = pull-back length
        ·               ·
          ·           ·
              · · · ·
```

The tangent turns through a full 360° as you go around the ring, so **every
direction is available from some point on it**. Direction and launch position are
coupled, and that coupling is the puzzle. To go "up and right" you have to release
from a particular side of the planet. This is real orbital mechanics, where you
burn prograde at the right moment, and it gives exactly two knobs, the same as a
billiards cue (angle and force).

A **flip** toggle could reverse the orbit direction. That doubles your options at
the cost of one extra control. It could cost a stroke, or be free.

### B. Free aim from the current position

You aim in any direction, like a slingshot. This is simpler to learn, but orbits
become decoration, because the ring no longer matters to the shot.

### C. Timed release (Orbital Dodger style)

You tap to let go while the ship orbits. That is a timing skill and goes against
"slow and planned." Rejected.

**Timing is not a skill:** with A, time is frozen while you aim, or the ship keeps
orbiting purely for looks. When you fire, the ship finishes going round the ring to
your release point (a short wind-up) and then launches. You never have to time
anything.

## 2. Capture: "always locks"

Orbital Dodger captures only inside a narrow band: the right radius, a heading
within 30° of the tangent, and a speed within 45% of orbit speed. Space Golf
should be generous by default:

- Any crossing of a ring's capture band **below that planet's capture speed**
  locks the ship into orbit.
- **Above** the capture speed you fly past. The planet bends your path, which is a
  **gravity assist**. This is where pinball lives: a hard shot can whip around one
  planet on the way to another.
- Too fast *and* too close means you pass inside the ring and hit the surface.
  That is a bounce, and it hurts. So "too hard" has a natural price.

```
   speed at ring:   slow ────────── capture speed ────────── fast
   outcome:         LOCK                │              FLYBY (assist)
                                        │     ...and if the line dips
                                        │     below the ring: BOUNCE (hurt)
```

This gives each planet a visible **speed gate**. The forecast arc should show it,
for example by drawing the arc green where a lock would happen and amber where the
ship would fly past.

**A weak shot falls back.** Once the ship has left its own ring's band, it can be
recaptured by that same planet. A shot that is too soft drops back into orbit
where it started. Like a putt that rolls back to your feet, it costs a stroke and
changes nothing else.

## 3. The forecast arc

- It is much longer than Orbital Dodger's (260 px there). It should at least reach
  the lock, or a set length, whichever comes first.
- It **includes the lock**. If the arc ends in a capture, draw it running into the
  target ring, highlight that ring, and mark the lock point.
- Stars the arc passes through light up, so you can see what the line will
  collect.
- Bounces: show the first bounce point with a damage tick. Whether to show the
  path *after* a bounce is a difficulty setting.
- **The length is a per-level setting.** Tutorial holes show the whole path to the
  lock. Hard holes show only the first part, and you read the planets for the
  rest. Think of it as a putter versus a driver.

For this to be fair, **what you see must be exactly what happens**. See `tech.md`,
"Determinism".

## 4. Hull (instead of shields and fuel)

- **Hull:** 100 points. You carry it through the whole hole, and it is not refilled
  per shot.
- **Planet bounce:** damage scales with the speed going *into* the surface.
  Orbital Dodger already splits speed this way in `classifyImpact`: a fast skim
  along the surface hurts little, and a head-on hit hurts a lot.
- **Wall bounce** (on levels with bouncing edges): damage scales with the speed
  going into the wall.
- **Out of bounds:** you go back to the last lie with +1 stroke and a little
  damage, or none. See the open questions.
- **Hazards** (asteroids, debris): a fixed chip of damage each time you touch one.
- **Hull reaches 0:** the hole restarts. This should be rare. With 100 hull and
  typical bounces doing 5 to 20, dying takes several bad shots in one hole.
- **Repair pickups** could be a risk/reward item placed on a dangerous line.

## 5. Scoring

Golf language keeps it readable: **strokes against par**.

```
hole score = par bonus    (par − strokes) × P      under par is good
           + stars        collected × S
           + hull         remaining × H
           + power        tie-breaker: less total power (Δv) scores a little higher
```

- "Fuel" becomes **total power used**: the sum of every shot's power. It stays a
  quiet tie-breaker, because strokes are what matter.
- **Par** is authored per level. It could also be checked by a solver (see
  `tech.md`) so that it is never impossible.
- Possible medals: ⛳ under par · ★ all stars · ♥ no damage.

## 6. Course structure

- Vertical scroll. A field about 400 px wide and 1500 to 3000 px tall.
- **Tee** at the bottom (the start orbit) and **Hole** at the top: a wormhole or a
  "home" planet. Locking into its orbit finishes the hole.
- The camera follows the ship during a shot. While aiming, you can drag to pan and
  scout ahead.
- **Sides:** bounce (and hurt) or wrap. This is set per level. A course that wraps
  on its sides and scrolls vertically plays like Asteroids stood on end.
- **Bottom:** falling off the bottom is out of bounds. **Top:** above the Hole is
  also out of bounds.
- **A course** could be 9 holes, played in order with a total score, like a mini
  golf round.

## 7. Course pieces (pinball in space)

Each piece is checked against the determinism rule: **it must be predictable, so
that the forecast can include it.**

| Piece | Effect | Pinball / golf analogue | Notes |
|---|---|---|---|
| **Planet** | Gravity plus an orbit ring, and it hurts to hit | Cup / tee | The basic piece |
| **Solar wind** | A zone with a steady push in one direction | Slope, lane | The first new piece to build. Draw it as flowing streaks |
| **Bumper** | Bounces the ship with **extra** speed and does **no** damage | Pop bumper | Safe bounces make a nice contrast with planets, which hurt |
| **Asteroid belt** | A band that chips hull on contact | Rough / sand trap | A risk band with stars scattered through it |
| **Nebula** | Drag. It slows the ship | Sand, water | A way to lose speed so you can be captured |
| **Black hole** | Strong pull, no ring, and it hurts | Water hazard | You have to use the assist to get round it |
| **Repulsor** | Pushes away (negative gravity), and has no ring | Kicker | |
| **Wormhole pair** | Teleport, keeping velocity (possibly rotated) | Windmill tunnel | Very putt-putt |
| **Gate / lane** | Walls that funnel the ship | Rails, lanes | Walls bounce, and it hurts |
| **Moving planet** | Moves on a path over time | Windmill blades | Only works if time is frozen while you aim and the forecast simulates the motion. Later |
| **Star** | A pickup | Coins / targets | Often placed on the risky line |
| **Repair** | Restores hull | Extra ball | On a dangerous line |

## 8. Risk and reward

The pitch in one picture: two lines from the same lie.

```
                  ★  ★  ★
                ·˙  ASTEROIDS  ˙·        risky line: 3 stars,
              ·˙   ▒▒▒▒▒▒▒▒▒▒    ˙·      passes the belt, likely −15 hull
     ( P1 )·˙                      ˙·( P2 )
         ˙·.                     .·˙
             ˙·. . . . . . . . ·˙         safe line: 0 stars, clean lock
```

## 9. UI sketch (portrait phone)

```
┌─────────────────────────────┐
│ Hole 3 · Par 4   ⛳ 2  ★ 3/5 │  strokes · stars
│ ♥ ███████████░░░  78        │  hull
│                             │
│          ( HOLE )           │
│             ⋮               │  (scrolled course)
│      ★                      │
│   ( P3 )     ░░ wind ░░▶    │
│         ╲                   │
│          ╲  forecast arc    │
│   ★       ●  ← lock marker  │
│  ( P2 )                     │
│      ↖                      │
│       ● ← release point     │
│    ( P1 )  ═══ power        │
│                             │
│ [↺ Restart]  [⇄ Flip] [FIRE]│
└─────────────────────────────┘
```

- **Fire button, or fire on release?** A separate Fire button suits careful
  planning: you can adjust the aim as often as you like and then commit. A
  pull-and-release is quicker but easy to fire by accident. With a button, the
  pull-back sets power without firing.
- **Restart** asks for confirmation if you are under par.
- **Undo last shot?** This is not in putt-putt, but it would be friendly on
  practice holes. See the open questions.
