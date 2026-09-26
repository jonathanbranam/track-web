## ADDED Requirements

### Requirement: In-flight nudges
During a flight the player SHALL be able to nudge the ship with its thrusters. A press anywhere on the course starts a nudge. Dragging from the press point SHALL thrust in the drag's direction. Within a deadzone there SHALL be no thrust, so a tap does nothing. Past the deadzone the throttle SHALL ramp up with drag distance to full at a full-drag distance. The thrust SHALL act as an acceleration added to gravity and the course pieces at each simulation step. At full throttle it SHALL be a tunable nudge strength that is weak compared with a shot's launch boost by default. Nudging SHALL be unlimited. The ship SHALL record **fuel used**, the throttle integrated over simulated flight time, which the score charges for. A nudged ship SHALL still bounce, collect stars, take damage, lock onto rings, enter the wormhole and go out of bounds by the normal rules. Nudging SHALL NOT be available while resting, during a planned-mode wind-up, or in Look mode. While a finger is down in flight, the game SHALL draw the drag guide and the thrust direction on the ship. If a release is missed (for example, lifted outside the canvas), the thrust SHALL stop once the finger is no longer down.

#### Scenario: Drag direction steers
- **WHEN** the ship is flying straight up and the player presses and drags to the right past the deadzone
- **THEN** the ship's path curves to the right while the finger is held, compared with the same flight with no nudge

#### Scenario: A tap does not thrust
- **WHEN** the player taps the course during a flight without dragging past the deadzone
- **THEN** the path is unchanged and no fuel is used

#### Scenario: Letting go stops the thrust
- **WHEN** the player nudges for a moment and then lifts the finger
- **THEN** from that point the ship coasts under gravity and course pieces alone

#### Scenario: A nudge into a ring locks
- **WHEN** a nudge slows the ship below a ring's capture speed as it crosses that ring
- **THEN** the ship locks onto that ring

#### Scenario: A missed release does not latch thrust
- **WHEN** the finger is lifted outside the canvas and no release event arrives
- **THEN** thrust stops on the next frame

### Requirement: Slow motion while nudging
The game SHALL offer a **Slow motion while nudging** setting, on (default) or off, and a slow-motion speed between 0.1 and 1 (default 0.35). Both SHALL be remembered per browser. When the setting is on and a finger is down during a flight, the flight SHALL play at the slow-motion speed times the normal flight speed. When the finger lifts, normal speed SHALL resume. Slow motion SHALL change only how fast the flight plays, not its path: a nudge of the same throttle over the same simulated time SHALL have the same effect whether slow motion is on or off.

#### Scenario: Holding slows the flight
- **WHEN** slow motion is on at speed 0.25 and the player holds a finger down in flight
- **THEN** the ship moves at a quarter of its normal on-screen rate until the finger lifts

#### Scenario: Slow motion does not change physics
- **WHEN** the same shot is nudged with the same drag for the same simulated time, once with slow motion on and once off
- **THEN** both flights follow the same path

## MODIFIED Requirements

### Requirement: Shots
A shot SHALL be defined by a **release point** on the current lie's ring, a **power** between 0 and 1, and, for vector shots, a **direction**. A **prograde** shot SHALL leave the ring at the release point travelling prograde, along the ring's tangent in the orbit direction, at the ring's orbit speed plus the power times a launch boost, clamped to the maximum speed. A **vector** shot SHALL leave the ring at the release point with the ring's prograde orbital velocity plus an impulse of the power times the launch boost in the shot's direction, clamped to the maximum speed. Each shot SHALL add one stroke. A shot whose power is below a minimum (the aim was dragged back to its start) SHALL be cancelled and SHALL NOT add a stroke.

#### Scenario: Direction comes from the release point
- **WHEN** two prograde shots with the same power are released from opposite points on the same ring
- **THEN** they leave in opposite directions

#### Scenario: Harder shots leave faster
- **WHEN** two prograde shots are released from the same point with different powers
- **THEN** the higher-power shot leaves at the higher speed, never above the maximum speed

#### Scenario: A forward vector shot matches a prograde shot
- **WHEN** a vector shot is aimed exactly prograde and released from the same point with the same power as a prograde shot
- **THEN** both leave with the same velocity and fly the same path

#### Scenario: An outward vector shot lifts off the ring
- **WHEN** a vector shot is aimed straight away from the planet
- **THEN** the ship leaves with its orbital velocity plus an outward component, moving away from the planet

#### Scenario: A backward vector shot slows the orbit
- **WHEN** a vector shot is aimed retrograde with power large enough to cancel most of the orbital speed
- **THEN** the ship leaves slower than orbit speed and falls toward the planet

#### Scenario: Cancelled aim
- **WHEN** the player drags back to the aim's starting point and lets go
- **THEN** no shot is taken and the stroke count is unchanged

### Requirement: Aim modes
The game SHALL offer these player settings, remembered per browser:

- **Shot**: `prograde` (default) or `vector`. In prograde mode the power drag sets only the strength, and the shot leaves along the orbit. In vector mode the power drag sets both the strength (by drag distance, as in prograde mode) and the direction (the direction from the press point to the finger). While aiming a vector shot, the game SHALL draw an arrow from the ship in the shot's direction whose length grows with power.
- **Release**: `timed` (default) or `planned`. In timed mode, pressing starts an aim, dragging away from the press point sets power (and in vector mode the direction), and letting go fires from wherever the ship is on the ring at that moment. In planned mode, the player places a release marker by dragging along the ring, sets power (and in vector mode the direction) by dragging elsewhere, and fires with a Fire button; the ship then continues around the ring to the marker and launches from there.
- **Pause while aiming**: on (default) or off. When on, the orbit freezes while the player's finger is down and resumes when the aim is released or cancelled. When off, the ship keeps orbiting while the player aims; in timed mode the forecast moves with it.

Shot and release are independent: any combination SHALL work.

#### Scenario: Timed release fires from the ship's position
- **WHEN** release is timed, pause is off, and the player holds an aim while the ship orbits a quarter turn and then lets go
- **THEN** the shot leaves from the ship's position at the moment of letting go, and the forecast shown just before letting go is the path it flies

#### Scenario: Pause freezes the orbit
- **WHEN** release is timed, pause is on, and the player presses to aim
- **THEN** the ship stops moving on the ring until the aim is fired or cancelled

#### Scenario: Planned release winds round to the marker
- **WHEN** release is planned and the player places the marker a half turn ahead of the ship and taps Fire
- **THEN** the ship travels round the ring to the marker and launches from the marker

#### Scenario: Vector aim follows the drag
- **WHEN** shot is vector and the player presses and drags toward the left edge of the screen
- **THEN** the aim arrow points left from the ship, and the forecast shows a shot leaving with a leftward impulse added to the orbital velocity

#### Scenario: Vector shot with planned release
- **WHEN** shot is vector, release is planned, and the player places the marker, drags an impulse outward, and taps Fire
- **THEN** the ship winds round to the marker and leaves with the orbital velocity at the marker plus the outward impulse, along the forecast path

#### Scenario: Settings persist
- **WHEN** the player changes release to planned and shot to vector and reloads the game
- **THEN** release is still planned and shot is still vector

### Requirement: Deterministic shot simulation
A shot's flight SHALL be computed step by step at a fixed time step from the course, the lie, the shot, the tuning and any nudges applied during the flight. The same inputs, including the same nudge throttle at each step, SHALL always produce the same path, the same events (stars collected, bounces and their damage, zone damage) and the same outcome. The forecast and the flight SHALL use the same step rule, so a flight with no nudges is identical to a simulation of that shot made before it was fired. The outcome SHALL be one of: **lock** on a planet's ring, **wormhole**, **out of bounds**, **adrift** (no other outcome within a maximum flight time from launch), or **destroyed** (hull reached 0).

#### Scenario: Same shot, same result
- **WHEN** the same shot is simulated twice from the same lie with the same tuning and no nudges
- **THEN** both simulations produce identical paths, events and outcomes

#### Scenario: Same nudges, same result
- **WHEN** the same shot is simulated twice with the same nudge throttle applied at the same steps
- **THEN** both simulations produce identical paths, events, outcomes and fuel used

#### Scenario: Every flight ends
- **WHEN** a shot is simulated that neither locks, reaches the wormhole, leaves the course nor destroys the ship within the maximum flight time
- **THEN** its outcome is adrift

### Requirement: Forecast arc
While the player aims, the game SHALL draw the forecast: the leading stretch of the simulated flight for the current aim, assuming no nudges, up to the forecast length (the level's override, or the tuning default). The forecast SHALL be taken from the same simulation that the flight will follow, so it can never disagree with an un-nudged flight. Within the drawn stretch, the forecast SHALL mark: stars the flight collects; each bounce point, with its hull damage; segments inside damaging zones; and the outcome if it is reached — a lock, drawn as the target ring highlighted with a lock marker; the wormhole highlighted; or an out-of-bounds marker at the course edge. The forecast SHALL update whenever the aim or the ship's position on the ring changes. The forecast SHALL NOT be drawn during a flight.

#### Scenario: Forecast shows the lock
- **WHEN** the current aim's flight locks onto another planet within the forecast length
- **THEN** the forecast ends at that planet's ring, the ring is highlighted, and a lock marker is drawn

#### Scenario: Forecast shows stars and damage
- **WHEN** the current aim's flight collects two stars and bounces off a planet within the forecast length
- **THEN** those two stars are highlighted and the bounce point is marked with the damage it will do

#### Scenario: Forecast is cut at its length
- **WHEN** the flight's outcome lies beyond the forecast length
- **THEN** the forecast stops at the forecast length and no outcome is marked

#### Scenario: No forecast in flight
- **WHEN** a shot is fired
- **THEN** the forecast disappears and is not drawn again until the ship is resting and the player aims

### Requirement: Flight follows the forecast
When a shot is fired and not nudged, the ship SHALL follow the forecast's path exactly, applying each event (star collected, damage) as the ship reaches it, and SHALL resolve the outcome when the path ends. When the player nudges, the flight SHALL continue from the ship's current position and velocity under the nudge, by the same step rule. The player SHALL NOT be able to aim a new shot until the flight has resolved.

#### Scenario: The flight is the forecast
- **WHEN** a shot is fired whose forecast showed a lock on a planet after collecting one star, and the player does not nudge
- **THEN** the ship flies the forecast path, collects that star, and locks onto that planet

#### Scenario: A nudge departs from the forecast
- **WHEN** the player nudges partway through a flight
- **THEN** the ship leaves the forecast path from that point, and all later events and the outcome come from the nudged flight

### Requirement: Scoring
A completed level's score SHALL be:

`stars × starPoints + (allStarsBonus if every star was collected) + hull remaining × hullPoints − strokes × strokeCost − total power × powerCost − fuel used × fuelCost`

floored at 0, where total power is the sum of every fired shot's power, and fuel used is the sum of every flight's fuel used (full-throttle seconds of nudging, including flights that went out of bounds or adrift). The defaults SHALL be starPoints 100, allStarsBonus 200, hullPoints 1, strokeCost 25, powerCost 10, fuelCost 20, and SHALL be tunable. With the defaults, collecting stars SHALL be worth more than saving strokes: one star is worth four strokes.

#### Scenario: Stars beat a hole-in-one
- **WHEN** with default scoring one run finishes in 1 stroke with 1 of 8 stars, 100 hull, total power 1 and no fuel used, and another finishes in 3 strokes with 6 of 8 stars, 80 hull, total power 2 and no fuel used
- **THEN** the first scores 165 and the second scores 585

#### Scenario: All stars bonus
- **WHEN** a run collects every star in the level
- **THEN** its score includes the all-stars bonus

#### Scenario: Nudging costs score
- **WHEN** with default scoring a run that would score 585 used 2 seconds of full-throttle nudging
- **THEN** it scores 545

### Requirement: Heads-up display and controls
While playing, the game SHALL show the level name, the stroke count, stars collected out of total, and a hull bar with its value. It SHALL provide a **Restart** button that immediately restarts the current level from the tee (cancelling any flight in progress), a **Levels** button that leaves to the level picker without submitting a score, and a **Settings** button for the shot, release, pause and slow-motion settings. In planned release mode it SHALL show a **Fire** button, enabled only while an aim with power is set. Buttons laid over the game canvas SHALL respond to taps on iOS, and a tap on an overlay button during a flight SHALL NOT start a nudge.

#### Scenario: Restart mid-level
- **WHEN** the player has taken 3 strokes and collected 2 stars and taps Restart
- **THEN** the level begins again at the tee with 0 strokes, 0 stars and full hull

#### Scenario: Restart during a flight
- **WHEN** the player taps Restart while the ship is in flight
- **THEN** the flight is abandoned and the level restarts from the tee

#### Scenario: Overlay buttons work on iOS
- **WHEN** the player taps Restart on an iPhone
- **THEN** the level restarts

### Requirement: Level summary and leaderboard
When a level is completed, the game SHALL show a summary with the stars collected out of total, strokes, hull remaining, total power, fuel used, each term of the score, and the total score. It SHALL submit the score to the shared leaderboard with game slug `space-golf`, mode `classic`, and level set to the level's id, and SHALL show that level's leaderboard. The leaderboard SHALL NOT distinguish runs by shot mode or by whether nudges were used. The summary SHALL offer **Next level** (absent on the last level, which instead says the course is complete), **Replay**, and **Levels**. Entering the wormhole on the last level SHALL say that the course is complete.

#### Scenario: Completing a level submits its score
- **WHEN** the player completes the level with id `first-tee` scoring 420
- **THEN** a score of 420 is submitted for game `space-golf`, mode `classic`, level `first-tee`, and that level's leaderboard is shown

#### Scenario: Summary shows fuel
- **WHEN** the player completes a level after nudging during two flights
- **THEN** the summary shows the total fuel used and its fuel-cost term

#### Scenario: Next level
- **WHEN** the player taps Next level on the summary of the first level
- **THEN** the second level starts at its tee

### Requirement: Tuning panel
The game SHALL provide a tuning panel, in every build, exposing the physics, capture, damage, forecast, nudge (strength, deadzone, full-drag distance) and scoring constants, including the fuel cost, as live controls. Changes SHALL apply from the next shot (nudge constants from the next nudge), SHALL be remembered in this browser, and SHALL be resettable to the shipped defaults. Tuning SHALL NOT be stored on the server, and the leaderboard SHALL NOT distinguish runs by tuning.

#### Scenario: Tuning applies to the next shot
- **WHEN** the player raises the launch boost in the panel
- **THEN** the forecast for the current aim reflects the new value, and the next shot flies with it

#### Scenario: Reset tuning
- **WHEN** the player taps Reset in the tuning panel
- **THEN** every constant returns to its shipped default
