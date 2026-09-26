# Space Golf: Open Questions

## Decided

- **(2026-09-26) Separate game, forked from Orbital Dodger.** Dodger stays as it
  is, and both get explored.
- **(2026-09-26) The framing is putt-putt plus pinball.** Turn-based shots
  from orbit to orbit, a vertical course, strokes and par, hull instead of lives,
  and going out of bounds returns you to the last orbit.
- **(2026-09-26) There is no fuel as a resource.** "Power used" survives only as a
  scoring measure.
- **(2026-09-26) There is a Restart button** to restart the level.
- **(2026-09-26) Name: Space Golf.**
- **(2026-09-26) Stars are the main goal; the wormhole is the exit.** The
  wormhole at the top of each level leads to the next level. Scoring must make
  a multi-shot, star-collecting route beat a direct hole-in-one by a wide
  margin (one star = four strokes by default). See the change spec.
- **(2026-09-26) Aim modes are player settings:** release *timed* (default,
  the ship keeps orbiting and you let go at the right moment) or *planned*
  (drag a release marker), and *pause while aiming* on (default) or off. The pause default was switched from off to on after first play (2026-09-26).
- **(2026-09-26) Dying is very rare;** hull 100, typical bounces cost 5–20.
- **(2026-09-26) Levels ship as client data** for v1. The editor and
  server-stored levels come later.
- Everything else is settled for v1 by the assumptions in
  `openspec/changes/archive/2026-09-26-space-golf/design.md`. The items below stay open for
  play-testing and later changes.

## Play-test findings from the build (2026-09-26)

- **Gravity reach had to grow.** With Dodger's reach of 100, even a weak shot
  escaped its planet, so "a weak shot falls back" never happened. The default
  is now 220.
- **Near-escape shots are adrift.** A shot just above capture speed stays bound
  but takes longer than the flight cap to come round, so it ends adrift (+1
  stroke, no hull penalty). The flight cap is 15 s and replay runs at 1.5×.
- **Hole-in-one is reachable on every shipped level.** Outside a planet's reach
  space is flat, so a straight shot can find the wormhole. Scoring punishes it
  (First Tee: 56 points with no stars). Level design or a star gate could make
  it rarer.

## Open

1. **Stars: required or optional?** "Collect all the stars" suggests the level
   ends when the last star is taken. "A riskier path gives more stars" suggests
   stars are optional and a Hole ends the level. Two shapes:
   - *Stars are the goal:* the level is done when every star is taken. No hole is
     needed.
   - *The Hole is the goal, stars are a bonus:* the risk/reward is cleaner, and it
     is closer to mini golf. The ★ medal goes to collecting them all.
2. **What is a shot?** Prograde release (release point + power, recommended in
   `ideas.md` §1), free aim, or something else? Is there a **Flip** for orbit
   direction, and does it cost anything?
3. **Is time frozen while aiming?** Recommended: yes, with the orbit animating for
   looks and the ship winding up to the release point when you fire.
4. **How long is the forecast?** Always all the way to the lock, or set per level
   (putter holes versus driver holes)? Does it show the path after a bounce?
5. **What does out of bounds cost?** A stroke only, a stroke plus hull, or nothing
   but lost progress? The same question applies to "adrift" (the step cap hit
   without a lock).
6. **What happens at 0 hull?** Restart the hole (recommended) or go back to the
   last lie with a big stroke penalty?
7. **Does hull carry across holes** in a multi-hole course, or is it full at every
   tee?
8. **What is the score formula?** Golf-style strokes first, or one composite
   number (strokes, stars, hull, power) for the leaderboard?
9. **Undo or mulligan?** Allow one per hole, allow it on practice only, or never?
10. **Side edges:** do we need both bounce and wrap per level, or just one to start?
11. **Which new piece comes first?** Solar wind is the natural pick, being a
    straight push that is easy to predict and to draw. Bumpers are the most
    pinball-like.
12. **Enemy ships that shoot at you.** A future piece: the shots would have
    to be deterministic so the forecast stays honest.
13. **Which aim mode should be the default** after play-testing?
