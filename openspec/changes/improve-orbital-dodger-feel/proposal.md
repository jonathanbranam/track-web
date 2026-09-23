## Why

Playtesting Orbital Dodger on a phone surfaced four problems that make it feel unfair rather than hard. Level design can fix difficulty; it cannot fix these:

1. **Dying is too sudden.** Any planet contact ends the run instantly. A graze you could not see coming costs as much as flying straight into a planet, so failure reads as arbitrary rather than as a lesson.
2. **Orbiting is nearly impossible.** The scoring rewards tight orbits, but a stable orbit under true inverse-square gravity takes more precision than a finger on a phone has. The core strategy the game advertises is effectively unreachable.
3. **Controls break down near the screen edge.** Thrust points toward the finger. When the ship is near an edge, the finger cannot get "past" it, and when the finger is on top of the ship the direction flails and the ship is hidden.
4. **The ship gets lost off the edge.** It can drift well outside the visible area without the run ending, and then there is no way to tell where it is. Being able to bring it back from just past the border is good and should stay. Losing track of it is not.

## What Changes

- **Glancing-impact shields.** The ship starts each run with a small number of shield charges (about 3). A glancing contact with a planet uses up a charge instead of ending the run: the ship flashes red, is pushed out to the surface, and is knocked away along the surface with enough speed to break free of the planet. It is briefly immune to further hits. A direct, fast impact still destroys the ship, and so does any contact once the shields are gone.
- **Orbit capture rings.** Each planet shows a faint orbit ring a fixed height above its surface. If the ship crosses the ring while coasting (not thrusting), moving roughly along it at roughly the right speed, it locks into a perfect circular orbit. That is deliberately fake physics: the ship follows the ring exactly, burns no fuel, and ignores other planets. Pressing to thrust releases the lock. A locked orbit scores a proximity bonus that shrinks the longer the lock lasts, so an orbit is a safe place to rest, not a way to farm points.
- **Relative drag steering.** A new control mode: press anywhere and drag, and the ship thrusts in the direction of the drag, measured from where the press started. Where the ship is on screen no longer matters, so the edges stop being a problem and the finger never covers the ship. The existing direct mode (thrust toward the finger) stays as an option. In direct mode, a finger held over the ship keeps thrusting in the last direction instead of flailing. The mode can be switched in the dev panel so both can be playtested; relative drag ships as the default.
- **Off-screen ship indicator.** When the ship is outside the visible area, an arrow pinned to the nearest edge points to it. It shows how far away the ship is and warns more strongly as the ship nears the point of no return. The out-of-bounds margin and the ability to fly back in are unchanged.
- **Experimental world wrap.** A dev-panel edge mode, `wrap`, in which the ship leaves one edge and comes back in the opposite one. Gravity, the forecast path and orbit capture all wrap consistently. In wrap mode, flying out of bounds cannot end the run. `bounded`, with the indicator, stays the shipped default until playtesting says otherwise.
- **HUD:** shield charges are shown alongside fuel.
- **Tuning panel:** new parameters for shields, orbit capture, control mode and edge mode.

## Capabilities

### New Capabilities

None. All of this changes the one existing game capability.

### Modified Capabilities

- `games-orbital-dodger`:
  - **Loss conditions:** contact is lethal only for a direct impact or with no shields left, and out-of-bounds applies only in bounded mode.
  - **Hold-to-thrust control:** adds the control modes and the direct-mode deadzone.
  - **Proximity-weighted scoring:** the bonus decays while in a locked orbit.
  - **Gravity-only forecast path:** the path wraps in wrap mode and follows the ring while locked.
  - **HUD:** adds the shield display.
  - **Dev tuning controls:** adds the new parameters.
  - **Added requirements:** glancing-impact shields, orbit capture, the off-screen indicator, and world wrap.

## Impact

- **Code:** `client-games/src/games/orbital-dodger/`, meaning `physics.ts` (impact classification, orbit capture math, wrapped geometry and new tuning fields), `physics.test.ts`, `OrbitalDodgerScene.ts` (shield flash and immunity, orbit lock state, ring and indicator drawing, relative-drag input), `OrbitalDodgerGame.tsx` (shield HUD) and `TuningPanel.tsx`.
- **No** API, database, dependency or deploy changes. Phaser stays externalized.
- **Leaderboard:** scores still go to `orbital-dodger` / `classic` / `classic`. Runs will get longer and score higher than before this change. That is acceptable at this stage, because the board holds only a few test runs.
