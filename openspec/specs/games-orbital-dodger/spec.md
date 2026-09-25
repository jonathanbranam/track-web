**App**: games

## Purpose

The Orbital Dodger game — a single-player, real-time survival game on the casual games platform. The player pilots a ship through a field of planets that exert inverse-square gravitational pull, holding to thrust toward their finger while spending a finite fuel budget. Points accrue continuously and are weighted by how close the ship flies to a planet's surface, so tight orbits score far better than drifting in open space. A run ends on collision, on leaving the play area, or when fuel is exhausted, and the final score is submitted to the shared server leaderboard.

## Requirements

### Requirement: Game registration and catalog entry
The Orbital Dodger game SHALL be registered in the games registry as a `single-player` game with slug `orbital-dodger`, and SHALL be mounted directly (not through the multiplayer lobby flow). The games catalog SHALL display it as a selectable card.

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** Orbital Dodger is listed as a single-player game with its name and description

#### Scenario: Selecting the game mounts it directly
- **WHEN** the player selects the Orbital Dodger card
- **THEN** the app navigates to the game route and mounts the game canvas without passing through a lobby

### Requirement: Procedurally generated planet layout
Each layout SHALL consist of up to a configured number of planets placed at random positions within the play area, each with a randomly chosen radius. Planets SHALL NOT overlap: every pair SHALL be separated by a clearance margin beyond the sum of their radii, so there is always navigable space between them. No planet SHALL be placed close enough to the play area's center point to occupy the ship's starting position. Placement SHALL complete in bounded time. When the requested planet count cannot be placed within that bound, generation SHALL relax the preferred clearance toward a non-zero floor and then SHALL omit the planets that still do not fit — it SHALL NOT emit a planet that overlaps another or that encroaches on the starting position. A crowded field therefore yields fewer planets, never an unplayable layout.

#### Scenario: Planets do not overlap
- **WHEN** a layout is generated
- **THEN** no two planets intersect, and each pair is separated by at least the clearance margin beyond the sum of their radii

#### Scenario: Ship start position is clear
- **WHEN** a layout is generated
- **THEN** no planet covers or sits immediately adjacent to the center of the play area, so the ship does not begin inside or touching a planet

#### Scenario: Generation terminates
- **WHEN** the play area is too crowded for the requested planet count to be placed without overlap
- **THEN** layout generation completes in bounded time and the game still starts

#### Scenario: A crowded field yields fewer planets, not a broken layout
- **WHEN** the play area is too crowded for the requested planet count
- **THEN** fewer planets than requested are placed, and every planet that was placed still satisfies both the non-overlap and clear-start constraints

### Requirement: Inverse-square gravity
Every planet SHALL attract the ship with a force proportional to the planet's area (the square of its radius) and inversely proportional to the square of the distance between them, scaled by a global gravity constant and a planet mass scale. The accelerations from all planets SHALL be summed, subject to the influence zones and gravity reach below. The squared distance used in the calculation SHALL be clamped to a minimum softening value, so that acceleration remains finite as the ship approaches a planet's center.

**Influence zones** (switchable in development builds): each planet SHALL have an influence radius, the distance toward its most competitive neighbour at which the two planets pull equally. Within a configured inner fraction of that radius, other planets SHALL NOT pull on the ship. Between the inner fraction and the zone's edge, their pull SHALL fade back in smoothly, so the field has no sudden change. Outside every zone, and whenever zones are off, all planets SHALL pull at full strength.

**Gravity reach** (optional): when a reach is configured, a planet's pull SHALL fade smoothly to zero at that distance from its surface.

#### Scenario: Larger planets pull harder
- **WHEN** the ship is the same distance from two planets of different radii
- **THEN** the larger planet contributes the greater acceleration

#### Scenario: Pull increases as the ship nears a planet
- **WHEN** the ship moves closer to a planet
- **THEN** the acceleration that planet contributes increases with the inverse square of the distance

#### Scenario: Gravity from multiple planets combines
- **WHEN** more than one planet is present and the ship is outside every influence zone, or influence zones are off
- **THEN** the ship's acceleration is the vector sum of the contributions from every planet

#### Scenario: Neighbours are ignored deep inside a planet's zone
- **WHEN** influence zones are on and the ship is within the inner part of a planet's influence zone
- **THEN** only that planet pulls on the ship

#### Scenario: Gravity reach cuts off distant pull
- **WHEN** a gravity reach is configured and the ship is farther than that from a planet's surface
- **THEN** that planet contributes no acceleration

#### Scenario: Acceleration stays finite near a planet center
- **WHEN** the distance between the ship and a planet center approaches zero
- **THEN** the computed acceleration is clamped by the softening distance and does not diverge

### Requirement: Hold-to-thrust control with a fuel budget
While the player holds a pointer down anywhere on the play area, the ship SHALL accelerate, up to a fixed maximum thrust, in a direction and at a throttle set by the active control mode, in addition to gravity, and SHALL keep updating that direction as the pointer is dragged. Two control modes SHALL be supported:
- **Relative drag**: the thrust direction SHALL be the direction from where the press began to the pointer's current position. While the pointer is within a small deadzone of where the press began, no thrust SHALL be applied and no fuel SHALL drain. Beyond the deadzone, the throttle SHALL rise non-linearly with drag distance, starting gentle and reaching full thrust at a configured full-thrust drag distance, so a small drag is a nudge rather than a full burn.
- **Direct**: the thrust direction SHALL be the direction from the ship toward the pointer. While the pointer is within a small deadzone of the ship, thrust SHALL continue in the most recent direction rather than following the pointer's small offsets. Direct mode SHALL always apply full thrust.

Thrust SHALL be applied only while fuel remains. The ship's speed SHALL be clamped to a maximum. Fuel SHALL drain in proportion to the time thrust is applied multiplied by the throttle, from a fixed starting budget, so full thrust drains one second of fuel per second. Releasing the pointer SHALL stop thrust and stop fuel drain. A visible indicator SHALL show remaining fuel and SHALL change appearance as the reserve runs low. While the pointer is held, the game SHALL show a guide for the current thrust direction: in relative-drag mode, drawn from the press origin to the pointer.

#### Scenario: Relative drag thrusts along the drag direction
- **WHEN** the control mode is relative drag and the player presses at one point and drags beyond the deadzone toward the lower left
- **THEN** the ship accelerates toward the lower left, regardless of where the ship is on screen

#### Scenario: Relative drag works with the ship at the edge
- **WHEN** the control mode is relative drag, the ship is at the left edge of the play area, and the player drags leftward from a press in the middle of the screen
- **THEN** the ship accelerates leftward

#### Scenario: A small drag gives gentle thrust
- **WHEN** the control mode is relative drag and the player drags just past the deadzone
- **THEN** the ship accelerates at a small fraction of full thrust and drains fuel at the same fraction

#### Scenario: A long drag gives full thrust
- **WHEN** the control mode is relative drag and the player drags at least the full-thrust drag distance
- **THEN** the ship accelerates at full thrust

#### Scenario: Relative drag deadzone
- **WHEN** the control mode is relative drag and the pointer is held within the deadzone of the press origin
- **THEN** no thrust is applied and no fuel drains

#### Scenario: Holding accelerates the ship toward the pointer
- **WHEN** the control mode is direct and the player holds a pointer down away from the ship while fuel remains
- **THEN** the ship accelerates toward that position in addition to the gravitational acceleration

#### Scenario: Direct mode holds direction when the finger covers the ship
- **WHEN** the control mode is direct and the pointer is within the deadzone of the ship while held
- **THEN** thrust continues in the most recent direction rather than swinging with the pointer's small offsets

#### Scenario: Dragging redirects thrust
- **WHEN** the player drags the held pointer to a new position
- **THEN** the thrust direction updates according to the active control mode

#### Scenario: Releasing stops thrust
- **WHEN** the player releases the pointer
- **THEN** thrust is no longer applied and fuel stops draining; the ship continues under gravity alone

#### Scenario: Holding drains fuel
- **WHEN** the player holds the pointer down at full thrust for a period of time
- **THEN** the remaining fuel decreases by that elapsed time and the fuel indicator updates

#### Scenario: Speed is capped
- **WHEN** gravity and thrust would accelerate the ship beyond the maximum speed
- **THEN** the ship's velocity is scaled back to the maximum speed while preserving direction

#### Scenario: Low fuel is signalled
- **WHEN** remaining fuel falls below a low-reserve threshold
- **THEN** the fuel indicator changes appearance to warn the player

#### Scenario: Holding with no fuel does nothing
- **WHEN** the player holds the pointer down after fuel has reached zero
- **THEN** no thrust is applied

### Requirement: Proximity-weighted scoring and star pickups
Score SHALL accrue continuously over time at a base rate everywhere in the play area, plus a proximity bonus that increases as the ship's distance to the nearest planet surface decreases, reaching its maximum when the ship is touching a surface and falling to zero at or beyond a configured proximity range. The bonus SHALL ramp non-linearly so that close orbits are worth disproportionately more than moderate approaches. While the ship is locked in a captured orbit, the entire score rate (base rate and proximity bonus) SHALL be multiplied by a factor that is one at capture and falls linearly to zero as the ship travels a configured arc around the ring. Once that arc has been travelled, the locked orbit SHALL earn no points at all. The factor SHALL reset on the next capture. Collectible stars SHALL be placed clear of planets; collecting one SHALL award a fixed point bonus and emit a brief visual effect. When every star in the current set has been collected, a new set SHALL be placed. The displayed score SHALL be the accrued total, shown as a whole number.

#### Scenario: Score accrues in open space
- **WHEN** the ship is far from every planet and the run is active
- **THEN** the score increases at the base rate as time passes

#### Scenario: Close orbits score faster
- **WHEN** the ship flies near a planet's surface rather than far from it
- **THEN** the score increases at a higher rate, up to the maximum proximity bonus at the surface

#### Scenario: Proximity bonus fades with distance
- **WHEN** the ship's distance to the nearest planet surface exceeds the proximity range
- **THEN** only the base rate applies and no proximity bonus is added

#### Scenario: Locked-orbit scoring fades out
- **WHEN** the ship has travelled half the configured arc since being captured
- **THEN** it earns half the score rate it would earn at the same position in free flight

#### Scenario: A long locked orbit earns nothing
- **WHEN** the ship has travelled the full configured arc or more since being captured and is still locked
- **THEN** the score does not increase at all

#### Scenario: Collecting a star awards points
- **WHEN** the ship overlaps an uncollected star
- **THEN** the star is marked collected, the score increases by the star bonus, and a brief particle effect appears at the star's position

#### Scenario: Stars respawn as a set
- **WHEN** the last uncollected star in the current set is collected
- **THEN** a new set of stars is placed at positions clear of the planets

#### Scenario: Stars are reachable
- **WHEN** a star is placed
- **THEN** it does not sit inside a planet or within its immediate surface clearance

### Requirement: Gravity-only forecast path
The game SHALL render a path projecting where gravity alone would carry the ship from its current position and velocity, ignoring any thrust currently being applied. The path SHALL be computed by forward-integrating the same gravity model used for the ship, including wrapped geometry in wrap mode, and SHALL terminate early when it reaches a configured forecast distance, when it intersects a planet, when it reaches a bounded step limit, or, in bounded mode only, when it leaves the play area, whichever comes first. In wrap mode the path SHALL continue across edges and SHALL be drawn without a line spanning the field at the seam. While the ship is locked in orbit, the forecast SHALL NOT be drawn, because the highlighted ring shows the path. The path SHALL be drawn so it fades along its length, and SHALL NOT be drawn when the forecast distance is configured to zero.

#### Scenario: Forecast shows the coming trajectory
- **WHEN** the ship is moving under gravity
- **THEN** a fading path is drawn from the ship along the trajectory gravity alone would produce

#### Scenario: Forecast ignores active thrust
- **WHEN** the player is holding to thrust
- **THEN** the forecast path still shows the gravity-only trajectory, not the thrust-adjusted one

#### Scenario: Forecast stops at a collision
- **WHEN** the projected trajectory would intersect a planet within the forecast distance
- **THEN** the drawn path ends at that planet rather than continuing through it

#### Scenario: Forecast computation is bounded
- **WHEN** the projected trajectory neither collides nor leaves the play area
- **THEN** the projection stops at the forecast distance or the step limit, so per-frame cost stays bounded

#### Scenario: Forecast wraps in wrap mode
- **WHEN** the edge mode is wrap and the projected trajectory crosses an edge
- **THEN** the path continues from the opposite edge, and no segment is drawn across the field

#### Scenario: Forecast hidden while locked
- **WHEN** the ship is locked in a captured orbit
- **THEN** no forecast path is drawn

### Requirement: Loss conditions
An active run SHALL end when any of the following occurs: the ship suffers a fatal planet contact (a direct impact, or any contact with no shield charges remaining outside a grace period); in bounded mode, the ship travels beyond the play area by more than a configured margin; or a configured grace period has elapsed since the remaining fuel reached zero. While that grace period runs, the ship SHALL keep flying under gravity (and MAY be captured into orbit or collect stars) but SHALL NOT thrust. When the run ends, the game SHALL report which of these caused it, and the end-of-run display SHALL state that reason.

#### Scenario: Crashing into a planet ends the run
- **WHEN** the ship contacts a planet with a direct impact, or with no shield charges and no grace period
- **THEN** the run ends and the reason is reported as a crash

#### Scenario: A glancing contact with shields does not end the run
- **WHEN** the ship contacts a planet with a glancing impact while shield charges remain
- **THEN** the run continues

#### Scenario: Drifting out of bounds ends the run
- **WHEN** the edge mode is bounded and the ship travels beyond the play area by more than the configured margin
- **THEN** the run ends and the reason is reported as out of bounds

#### Scenario: Running out of fuel ends the run
- **WHEN** remaining fuel has been zero for the full grace period, with the ship clear of every planet
- **THEN** the run ends and the reason is reported as out of fuel

#### Scenario: An empty tank is not immediately fatal
- **WHEN** remaining fuel reaches zero while thrusting
- **THEN** the run continues, the ship coasts under gravity, and it can still crash, drift out of bounds, or collect stars until the grace period elapses

#### Scenario: Leaving the visible area briefly does not end the run
- **WHEN** the edge mode is bounded and the ship passes just outside the visible play area but remains within the configured margin
- **THEN** the run continues, the off-screen indicator is shown, and the ship may return under gravity or thrust

### Requirement: HUD, run control, and end-of-run flow
During an active run the HUD SHALL display the current score, the remaining fuel indicator, and the remaining shield charges. The shield display SHALL update when a charge is consumed. While the empty-tank grace period is running, the HUD SHALL show the seconds remaining before the run ends. The HUD SHALL provide a quit control that ends the run voluntarily, and a control that opens the leaderboard without interrupting play. The quit control SHALL be hidden once a run has ended. When a run ends, whether by a loss condition or by quitting, the game SHALL display an overlay showing the reason the run ended, the final score, the leaderboard, and two restart controls: one that replays the **same** planet layout and one that generates a **new** layout. Either restart control SHALL reset score, fuel, shield charges, orbit lock, ship position, velocity, and stars to their starting state.

#### Scenario: HUD shows score and fuel during play
- **WHEN** a run is in progress
- **THEN** the current score, a fuel indicator, and the remaining shield charges are visible

#### Scenario: Empty-tank countdown is shown
- **WHEN** fuel has reached zero and the run has not yet ended
- **THEN** the HUD shows the seconds remaining in the grace period, counting down

#### Scenario: Shield display updates on a glancing hit
- **WHEN** a glancing impact consumes a shield charge
- **THEN** the HUD shows one fewer shield charge

#### Scenario: Quit ends the run voluntarily
- **WHEN** the player activates the quit control during an active run
- **THEN** the run ends, the end-of-run overlay is shown, and the heading indicates the player quit rather than crashed

#### Scenario: Quit control hidden after the run ends
- **WHEN** a run has ended by any means
- **THEN** the quit control is no longer offered

#### Scenario: Leaderboard is reachable mid-run
- **WHEN** the player opens the leaderboard during an active run
- **THEN** the leaderboard is displayed, the run is not ended, and the panel can be dismissed to return to play

#### Scenario: End overlay reports the reason and score
- **WHEN** a run ends because fuel was exhausted
- **THEN** the overlay states that the run ended out of fuel and shows the final score as a whole number

#### Scenario: Retry replays the same layout
- **WHEN** the player chooses to retry after a run ends
- **THEN** the same planet layout is kept, and the score, fuel, shields, stars, and ship state reset to their starting values

#### Scenario: New layout regenerates the planets
- **WHEN** the player chooses a new layout after a run ends
- **THEN** a freshly generated planet layout replaces the previous one and the run state resets

### Requirement: Leaderboard submission
On the end of a run — whether by a loss condition or by quitting — the final score SHALL be submitted to the shared game score service under game slug `orbital-dodger`, mode `classic`, and level `classic`, and the leaderboard for that combination SHALL then be displayed. Consistent with the existing score service, a score of zero SHALL NOT be submitted, and a failed submission SHALL be handled silently so the end-of-run overlay still renders. The server leaderboard SHALL be the sole scoreboard: no best score SHALL be stored on or read from the device.

#### Scenario: Score submitted on run end
- **WHEN** a run ends with a score greater than zero
- **THEN** the score is submitted under game slug `orbital-dodger`, mode `classic`, and level `classic`, and the leaderboard is then fetched and displayed

#### Scenario: Submission precedes the leaderboard fetch
- **WHEN** a run ends with a score greater than zero
- **THEN** the submission completes before the leaderboard fetch begins, so the player's own new score can appear in the displayed ranking

#### Scenario: Zero score is not submitted
- **WHEN** a run ends with a score of zero
- **THEN** no submission is made and the leaderboard is fetched immediately

#### Scenario: Failed submission degrades gracefully
- **WHEN** the score submission fails due to a network or server error
- **THEN** the end-of-run overlay still renders and the leaderboard area shows an error or empty state without crashing

#### Scenario: No local best score
- **WHEN** a run ends with a score higher than any previous run on that device
- **THEN** no best score is written to or displayed from device storage; only the server leaderboard is shown

### Requirement: Glancing-impact shields
Each run SHALL begin with a configured number of shield charges. When the ship contacts a planet, the impact SHALL be classified by the ship's speed along the line from the planet's center to the ship (its inward normal speed). An impact SHALL be **glancing** when that inward normal speed is at or below a configured lethal impact speed, and **direct** otherwise. A glancing impact with at least one shield charge remaining SHALL consume one charge and SHALL NOT end the run. Instead the ship SHALL be repositioned just outside the planet's surface, its inward velocity SHALL be removed, and it SHALL be given an outward push plus a push along the surface, in the direction it was already sliding, strong enough to carry it clear of that planet. For a short grace period after a glancing impact, further planet contacts SHALL NOT consume charges or end the run, and the ship SHALL visibly flash red for that period. A direct impact, or any contact when no shield charges remain and no grace period is active, SHALL end the run as a crash.

#### Scenario: Glancing hit consumes a shield instead of ending the run
- **WHEN** the ship touches a planet with inward normal speed below the lethal impact speed and has at least one shield charge
- **THEN** the run continues, one shield charge is consumed, and the ship flashes red

#### Scenario: Glancing hit knocks the ship clear
- **WHEN** a glancing impact is resolved
- **THEN** the ship is outside the planet's surface and its velocity has an outward component and a component along the surface, in the direction it was already sliding

#### Scenario: Direct hit is still fatal
- **WHEN** the ship touches a planet with inward normal speed above the lethal impact speed
- **THEN** the run ends as a crash regardless of remaining shield charges

#### Scenario: No shields left means contact is fatal
- **WHEN** the ship touches a planet with zero shield charges and no grace period active
- **THEN** the run ends as a crash

#### Scenario: Grace period prevents chained hits
- **WHEN** the ship contacts a planet again during the grace period after a glancing impact
- **THEN** no additional shield charge is consumed and the run does not end

#### Scenario: Shields reset with the run
- **WHEN** the player retries or starts a new layout
- **THEN** the shield charges are restored to the configured starting number

### Requirement: Orbit capture rings
Each planet SHALL have an orbit ring: a circle concentric with the planet, at a height above its surface that scales with the planet's radius (the configured ring height applies to the largest planet, and no ring sits below a minimum height). The ring's orbit speed SHALL be the true circular orbit speed for that planet's pull at the ring's radius. If that speed would exceed the speed cap, the ring SHALL be raised until it does not, rather than using a speed the gravity model cannot sustain. Smaller planets therefore have lower and slower orbits than larger ones. The ring SHALL be drawn faintly while the ship is not locked to it and highlighted while it is. A ring that would cross another planet or its surface clearance SHALL be omitted, and, while influence zones are on, so SHALL a ring that does not fit inside its planet's inner influence zone. When the player is not pressing, and the ship is within a configured distance of a ring's radius, and its direction of motion is within a configured angle of the ring's tangent, and its speed is within a configured tolerance of the circular orbit speed for that ring, the ship SHALL lock into that orbit. While locked, the ship SHALL travel along the ring at a constant speed in the direction it was moving when captured, SHALL NOT consume fuel, and SHALL NOT be affected by any planet's gravity or by collision. Any press SHALL release the lock, and the ship SHALL continue in free flight from its orbital position and velocity, with thrust applied if the press produces thrust. A press that produces no thrust (for example, a tap inside the relative-drag deadzone) therefore breaks orbit without burning fuel. After a release, the same ring SHALL NOT recapture the ship until it has left that ring's capture band. Orbit capture SHALL be switchable. While it is off, no rings SHALL be drawn and nothing SHALL be captured, and a ship that is locked when it is switched off SHALL continue in free flight from its orbital position and velocity.

#### Scenario: Coasting onto the ring captures the ship
- **WHEN** the player is not pressing and the ship crosses a planet's orbit ring moving close to tangent at close to the circular orbit speed
- **THEN** the ship locks onto the ring and the ring is highlighted

#### Scenario: A poor approach is not captured
- **WHEN** the ship crosses an orbit ring heading steeply toward or away from the planet, or at a speed far from the circular orbit speed
- **THEN** the ship is not captured and continues under normal gravity

#### Scenario: Pressing through a ring does not capture
- **WHEN** the ship crosses an orbit ring while the player is pressing, whether or not the press produces thrust
- **THEN** the ship is not captured

#### Scenario: Locked orbit is stable and free
- **WHEN** the ship is locked in orbit and the player does not press
- **THEN** the ship keeps circling at the ring's radius indefinitely, no fuel drains, and the run does not end from the orbit itself

#### Scenario: Pressing breaks orbit
- **WHEN** the player presses while the ship is locked
- **THEN** the lock is released, and the ship continues from its orbital velocity, with thrust applied if the press produces thrust

#### Scenario: A released orbit keeps orbiting
- **WHEN** influence zones are on and the player releases a locked orbit without thrusting
- **THEN** the ship keeps circling the planet at close to the ring's radius under normal gravity

#### Scenario: Smaller planets orbit lower and slower
- **WHEN** two planets of different radii both have rings
- **THEN** the smaller planet's ring sits closer to its surface and turns at a lower speed

#### Scenario: Capture switched off
- **WHEN** orbit capture is switched off
- **THEN** no orbit rings are drawn, a coasting ship is never captured, and a locked ship is released into free flight

#### Scenario: No immediate recapture
- **WHEN** the ship has just been released from a ring and the player lets go while still inside that ring's capture band
- **THEN** the ship is not recaptured by that ring until it has left the band

#### Scenario: Rings never cross another planet
- **WHEN** a planet's orbit ring would intersect another planet or its surface clearance
- **THEN** that ring is not drawn and cannot capture the ship

### Requirement: Off-screen ship indicator
While the ship's position is outside the visible play area, the game SHALL draw an indicator on the edge of the visible area, at the point nearest the ship, pointing toward the ship. The indicator SHALL convey how far the ship is beyond the edge, and SHALL escalate its warning appearance as that distance approaches the out-of-bounds margin. The indicator SHALL NOT be drawn while the ship is within the visible area.

#### Scenario: Indicator appears when the ship leaves view
- **WHEN** the ship moves past an edge of the visible play area
- **THEN** an indicator appears on that edge at the point nearest the ship, pointing toward it

#### Scenario: Indicator conveys distance
- **WHEN** the ship moves farther beyond the edge
- **THEN** the indicator's distance cue changes to reflect the greater distance, and its warning appearance increases as the ship approaches the out-of-bounds margin

#### Scenario: Indicator hides when the ship returns
- **WHEN** the ship re-enters the visible play area
- **THEN** the indicator is no longer drawn

### Requirement: Selectable edge mode
The game SHALL support two edge modes: **bounded** and **wrap**. In bounded mode the ship MAY travel beyond the visible area, up to the out-of-bounds margin, and fly back. In wrap mode, a ship leaving one edge SHALL reappear at the opposite edge with its velocity preserved. Gravity SHALL be computed from the shortest displacement across the wrapped field, so its pull does not jump when the ship crosses an edge. The forecast path and orbit capture SHALL use the same wrapped geometry. In wrap mode, leaving the play area SHALL NOT end the run.

#### Scenario: Wrap carries the ship across the edge
- **WHEN** the edge mode is wrap and the ship passes beyond the right edge
- **THEN** the ship reappears at the left edge with the same velocity

#### Scenario: Wrapped gravity is continuous at the seam
- **WHEN** the edge mode is wrap and the ship crosses an edge near a planet close to the opposite edge
- **THEN** the gravitational acceleration just before and just after the crossing is the same to within a small integration tolerance

#### Scenario: Wrap mode cannot drift out of bounds
- **WHEN** the edge mode is wrap
- **THEN** the run never ends with the out-of-bounds reason

### Requirement: Run waits for the first press
Every run, whether first, retried or on a new layout, SHALL begin frozen. The layout, the stars, the ship at its start position, the orbit rings and the forecast path SHALL be shown, with a prompt to touch to launch. While frozen, the ship SHALL NOT move, and score SHALL NOT accrue, fuel SHALL NOT drain, and none of the loss conditions or grace timers SHALL advance. The player's first press on the play area SHALL start the simulation, and that press SHALL steer like any other press, so thrust applies from the first moment where the control mode produces it. The quit control SHALL remain available while frozen.

#### Scenario: Nothing moves before the first press
- **WHEN** a run has started and the player has not yet pressed
- **THEN** the ship stays at its start position, the score stays at zero, the fuel stays full, and a launch prompt is shown

#### Scenario: The first press launches and steers
- **WHEN** the player presses and drags for the first time in a run
- **THEN** the prompt disappears, gravity starts acting, and the drag thrusts the ship

#### Scenario: Retry and new layout wait again
- **WHEN** the player retries or starts a new layout
- **THEN** the new run is frozen until the next press

### Requirement: Tuning controls
The game SHALL expose controls for its tuning parameters in every build, development and production alike. The controls SHALL be closed by default and opened from a settings button, and SHALL NOT cover the play area until opened. The parameters are:
- gravity strength, planet mass scale, thrust, maximum speed, gravity softening distance and ship radius
- influence zones on or off, the influence inner fraction, and gravity reach
- planet count, maximum fuel and the empty-tank grace period
- scoring base rate, proximity bonus, proximity range, star bonus and forecast distance
- starting shield charges, lethal impact speed, shield knock-away speed, along-surface kick and shield grace period
- orbit capture on or off, orbit ring height, orbit capture distance tolerance, angle tolerance and speed tolerance, and the locked-orbit scoring arc
- control mode, control deadzone and full-thrust drag distance
- edge mode

Adjustments SHALL take effect immediately on the running simulation, with two exceptions: planet count SHALL apply to the next generated layout, and starting shield charges SHALL apply from the next run. The controls SHALL offer a reset that puts every parameter back to its shipped default. A reset changes only the values in play and SHALL NOT modify any saved config.

#### Scenario: Tuning controls available in production
- **WHEN** the game runs in a production build
- **THEN** the settings button is shown, and opening it lets each parameter be adjusted

#### Scenario: Controls closed by default
- **WHEN** the game is opened
- **THEN** the tuning controls are closed and only the settings button is visible over the play area

#### Scenario: Adjustments apply live
- **WHEN** gravity strength is changed during an active run
- **THEN** the ship's motion reflects the new value without restarting the run

#### Scenario: Control and edge modes switch live
- **WHEN** the control mode, edge mode or influence-zone toggle is changed during an active run
- **THEN** the next press, or the next edge crossing, follows the newly selected mode without restarting the run

#### Scenario: Planet count applies to the next layout
- **WHEN** planet count is changed during an active run
- **THEN** the current layout is unchanged and the new count takes effect when a new layout is generated

#### Scenario: Reset restores shipped defaults without saving
- **WHEN** the reset control is used
- **THEN** every tuning parameter returns to its shipped default value, and no saved config changes

### Requirement: Saved tuning configs
The game SHALL store named tuning configs on the server, shared by all players. Every signed-in player SHALL be able to:
- **create** a new config with a name, holding the values currently in play
- **rename** any config except the Default
- **save** the values currently in play over any config
- **delete** any config except the Default, after confirming

Config names SHALL be non-empty after trimming, at most 40 characters, and unique regardless of case. A create or rename that breaks these rules SHALL be refused with a message, and nothing SHALL change. A stored config SHALL be applied over the shipped defaults, so a parameter the config does not hold, or holds with the wrong type, takes its shipped default value. The controls SHALL show when the values in play differ from the selected config's saved values, and SHALL offer to revert to the saved values.

#### Scenario: Create a config from current values
- **WHEN** a player adjusts thrust and creates a config named "Floaty"
- **THEN** "Floaty" appears in the config list holding the adjusted thrust, and it becomes the selected config

#### Scenario: Duplicate name refused
- **WHEN** a player creates or renames a config to "floaty" while a config named "Floaty" exists
- **THEN** the action is refused with a message that the name is taken, and no config changes

#### Scenario: Rename a config
- **WHEN** a player renames "Floaty" to "Low Gravity"
- **THEN** the config list shows "Low Gravity" with the same saved values

#### Scenario: Save over a non-default config
- **WHEN** a player has "Low Gravity" selected, changes gravity strength, and saves
- **THEN** "Low Gravity" holds the new gravity strength for every player who loads it afterwards, and no confirmation is asked

#### Scenario: Unsaved changes are indicated
- **WHEN** a player changes a parameter so it no longer matches the selected config's saved value
- **THEN** the controls show that there are unsaved changes

#### Scenario: Revert unsaved changes
- **WHEN** the player chooses to revert
- **THEN** every parameter returns to the selected config's saved value, and the unsaved-changes indicator clears

#### Scenario: Delete a config
- **WHEN** a player deletes "Low Gravity" and confirms
- **THEN** "Low Gravity" is removed from the config list for every player

#### Scenario: Parameter missing from a stored config
- **WHEN** a config saved before a parameter existed is loaded
- **THEN** that parameter takes its shipped default value and every other parameter takes its saved value

### Requirement: Protected Default config
A config marked as the Default SHALL always exist. On a fresh database it SHALL start out equal to the shipped default parameters. It is what a player with no selection gets. Saving over the Default SHALL first ask for confirmation with the message "This will replace the default config for all players", and SHALL NOT save unless the player confirms. The Default SHALL NOT be deleted or renamed. The controls SHALL NOT offer these actions for it, and the server SHALL refuse them.

#### Scenario: Default exists on a fresh install
- **WHEN** the game loads its configs against a new database
- **THEN** a config named "Default" is listed, and its values equal the shipped defaults

#### Scenario: Saving over the Default asks for confirmation
- **WHEN** a player with the Default selected saves
- **THEN** a confirmation reading "This will replace the default config for all players" is shown before anything is saved

#### Scenario: Confirmed save replaces the Default
- **WHEN** the player confirms that prompt
- **THEN** the Default holds the new values, and a new player afterwards starts with them

#### Scenario: Cancelled save leaves the Default unchanged
- **WHEN** the player cancels that prompt
- **THEN** the Default's saved values are unchanged, and the values in play stay as the player set them, marked as unsaved

#### Scenario: Default cannot be deleted or renamed
- **WHEN** the Default is the selected config
- **THEN** no delete or rename action is offered, and a delete or rename request for it sent directly to the server is refused

### Requirement: Per-browser config selection
The controls SHALL offer a dropdown listing every saved config, with the Default first. Choosing a config SHALL apply its values under the same live-apply rules as individual adjustments, except that a choice made while the run is waiting for its first press SHALL regenerate the layout so the chosen planet count takes effect at once. If there are unsaved changes, choosing another config SHALL first ask for confirmation to discard them. The choice SHALL be remembered in that browser and used for later games. When the game is opened, it SHALL finish loading the configs before starting, showing a loading state until then. It SHALL NOT generate a layout or accept a launch with any parameters other than the selected config's. It SHALL then start with the remembered config. If there is none, or the remembered config no longer exists, the game SHALL start with the Default and clear the remembered choice. If the configs cannot be loaded, whether the request fails or takes more than 8 seconds, the game SHALL start with the shipped default parameters and still be playable.

#### Scenario: Selection persists across games
- **WHEN** a player selects "Low Gravity", then reloads the game later
- **THEN** the game starts with "Low Gravity" applied and shown as selected

#### Scenario: New player gets the Default
- **WHEN** a player who has never selected a config opens the game
- **THEN** the Default config is applied and shown as selected

#### Scenario: Remembered config was deleted
- **WHEN** a player's remembered config has been deleted, by them or by another player, and they open the game
- **THEN** the Default config is applied and shown as selected

#### Scenario: Deleting the selected config falls back to Default
- **WHEN** a player deletes the config they have selected
- **THEN** the Default config is applied and becomes the selected config

#### Scenario: Selecting before the first press regenerates the layout
- **WHEN** a player selects a config with a different planet count while the run is waiting for the first press
- **THEN** the layout is regenerated with the selected config's planet count

#### Scenario: Switching with unsaved changes asks first
- **WHEN** a player with unsaved changes chooses another config from the dropdown
- **THEN** they are asked to confirm discarding the changes, and cancelling keeps the current config and values

#### Scenario: Game start waits for configs
- **WHEN** the game is opened and the configs have not finished loading
- **THEN** a loading state is shown, no layout is shown and no run can be launched, and once loading finishes the first layout is generated with the selected config's parameters, including its planet count

#### Scenario: Configs unavailable
- **WHEN** the configs cannot be loaded from the server, because the request fails or takes more than 8 seconds
- **THEN** the game starts with the shipped default parameters and is playable

### Requirement: Tuning controls beside the play area on wide screens
When the tuning controls open, the game (its view, HUD and in-game overlays, meaning the leaderboard and end of run) SHALL move left to use the free screen space beside it, without changing size. It SHALL move by the smaller of two amounts: the width of the controls, and the free horizontal space around the game. So when there is room for the game beside the controls, it SHALL be centered in the space left of them and not covered at all. When there is some room but not enough, it SHALL sit against the left edge so the controls cover as little of it as possible. When there is no free space, as on a phone, it SHALL NOT move, and the controls open over it. When the controls close, the game SHALL return to being centered on the whole screen. Resizing the window while the controls are open SHALL update the position. Moving the game SHALL NOT restart, pause or otherwise change the run.

#### Scenario: Wide window shows the controls beside the game
- **WHEN** the tuning controls are opened in a window with at least the controls' width of free space beside the game
- **THEN** the game, HUD and overlays are centered in the space left of the controls, at the same size as before, and no part of them is under the controls

#### Scenario: Medium window moves the game as far left as it can
- **WHEN** the tuning controls are opened in a window with some free space beside the game, but less than the controls' width
- **THEN** the game keeps its size and sits against the left edge, and the controls cover only the part that still does not fit

#### Scenario: Phone screen overlays as before
- **WHEN** the tuning controls are opened on a screen the game already fills from side to side
- **THEN** the game does not move, and the controls open over its right side

#### Scenario: Closing the controls recenters the game
- **WHEN** the tuning controls are closed
- **THEN** the game is centered on the whole window again

#### Scenario: Resizing with the controls open
- **WHEN** the window is resized while the tuning controls are open
- **THEN** the game's position updates to the same rule for the new size, without the game changing size relative to its fit for that window

#### Scenario: Moving the game does not affect the run
- **WHEN** the game moves because the controls open or close during an active run
- **THEN** the run continues uninterrupted, and a press on the moved game view steers toward the right place on the field
