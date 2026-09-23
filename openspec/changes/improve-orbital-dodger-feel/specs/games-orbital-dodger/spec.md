**App**: games

## ADDED Requirements

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
Each planet SHALL have an orbit ring: a circle concentric with the planet at a configured height above its surface. The ring SHALL be drawn faintly while the ship is not locked to it and highlighted while it is. A ring that would cross another planet or its surface clearance SHALL be omitted. When the ship is not thrusting, and it is within a configured distance of a ring's radius, and its direction of motion is within a configured angle of the ring's tangent, and its speed is within a configured tolerance of the circular orbit speed for that ring, the ship SHALL lock into that orbit. While locked, the ship SHALL travel along the ring at a constant speed in the direction it was moving when captured, SHALL NOT consume fuel, and SHALL NOT be affected by any planet's gravity or by collision. A press that starts thrust SHALL release the lock, and the ship SHALL continue in free flight from its orbital position and velocity, with thrust applied. After a release, the same ring SHALL NOT recapture the ship until it has left that ring's capture band.

#### Scenario: Coasting onto the ring captures the ship
- **WHEN** the ship, not thrusting, crosses a planet's orbit ring moving close to tangent at close to the circular orbit speed
- **THEN** the ship locks onto the ring and the ring is highlighted

#### Scenario: A poor approach is not captured
- **WHEN** the ship crosses an orbit ring heading steeply toward or away from the planet, or at a speed far from the circular orbit speed
- **THEN** the ship is not captured and continues under normal gravity

#### Scenario: Thrusting through a ring does not capture
- **WHEN** the ship crosses an orbit ring while the player is holding thrust
- **THEN** the ship is not captured

#### Scenario: Locked orbit is stable and free
- **WHEN** the ship is locked in orbit and the player does not press
- **THEN** the ship keeps circling at the ring's radius indefinitely, no fuel drains, and the run does not end from the orbit itself

#### Scenario: Pressing breaks orbit
- **WHEN** the player presses to thrust while the ship is locked
- **THEN** the lock is released, and the ship continues from its orbital velocity with thrust applied

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
The game SHALL support two edge modes: **bounded** and **wrap**. Bounded SHALL be the shipped default. In bounded mode the ship MAY travel beyond the visible area, up to the out-of-bounds margin, and fly back. In wrap mode, a ship leaving one edge SHALL reappear at the opposite edge with its velocity preserved. Gravity SHALL be computed from the shortest displacement across the wrapped field, so its pull does not jump when the ship crosses an edge. The forecast path and orbit capture SHALL use the same wrapped geometry. In wrap mode, leaving the play area SHALL NOT end the run.

#### Scenario: Bounded is the default
- **WHEN** the game runs with shipped defaults
- **THEN** the edge mode is bounded

#### Scenario: Wrap carries the ship across the edge
- **WHEN** the edge mode is wrap and the ship passes beyond the right edge
- **THEN** the ship reappears at the left edge with the same velocity

#### Scenario: Wrapped gravity is continuous at the seam
- **WHEN** the edge mode is wrap and the ship crosses an edge near a planet close to the opposite edge
- **THEN** the gravitational acceleration just before and just after the crossing is the same to within a small integration tolerance

#### Scenario: Wrap mode cannot drift out of bounds
- **WHEN** the edge mode is wrap
- **THEN** the run never ends with the out-of-bounds reason

## MODIFIED Requirements

### Requirement: Hold-to-thrust control with a fuel budget
While the player holds a pointer down anywhere on the play area, the ship SHALL accelerate, up to a fixed maximum thrust, in a direction and at a throttle set by the active control mode, in addition to gravity, and SHALL keep updating that direction as the pointer is dragged. Two control modes SHALL be supported:
- **Relative drag** (the shipped default): the thrust direction SHALL be the direction from where the press began to the pointer's current position. While the pointer is within a small deadzone of where the press began, no thrust SHALL be applied and no fuel SHALL drain. Beyond the deadzone, the throttle SHALL rise non-linearly with drag distance, starting gentle and reaching full thrust at a configured full-thrust drag distance, so a small drag is a nudge rather than a full burn.
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
Score SHALL accrue continuously over time at a base rate everywhere in the play area, plus a proximity bonus that increases as the ship's distance to the nearest planet surface decreases, reaching its maximum when the ship is touching a surface and falling to zero at or beyond a configured proximity range. The bonus SHALL ramp non-linearly so that close orbits are worth disproportionately more than moderate approaches. While the ship is locked in a captured orbit, the entire score rate (base rate and proximity bonus) SHALL be multiplied by a factor that is one at capture and falls linearly to zero as the ship travels a configured arc around the ring (180 degrees by default). Once that arc has been travelled, the locked orbit SHALL earn no points at all. The factor SHALL reset on the next capture. Collectible stars SHALL be placed clear of planets; collecting one SHALL award a fixed point bonus and emit a brief visual effect. When every star in the current set has been collected, a new set SHALL be placed. The displayed score SHALL be the accrued total, shown as a whole number.

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
An active run SHALL end when any of the following occurs: the ship suffers a fatal planet contact (a direct impact, or any contact with no shield charges remaining outside a grace period); in bounded mode, the ship travels beyond the play area by more than a configured margin; or a configured grace period (5 seconds by default) has elapsed since the remaining fuel reached zero. While that grace period runs, the ship SHALL keep flying under gravity (and MAY be captured into orbit or collect stars) but SHALL NOT thrust. When the run ends, the game SHALL report which of these caused it, and the end-of-run display SHALL state that reason.

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

### Requirement: Development-only tuning controls
The game SHALL expose controls for its tuning parameters in development builds only. The parameters are:
- gravity strength, planet mass scale, thrust, maximum speed, gravity softening distance and ship radius
- planet count, maximum fuel and the empty-tank grace period
- scoring base rate, proximity bonus, proximity range and forecast distance
- starting shield charges, lethal impact speed, shield knock-away speed and shield grace period
- orbit ring height, orbit capture distance tolerance, angle tolerance and speed tolerance, and the locked-orbit scoring arc
- control mode, control deadzone and full-thrust drag distance
- edge mode

Adjustments SHALL take effect immediately on the running simulation, with two exceptions: planet count SHALL apply to the next generated layout, and starting shield charges SHALL apply from the next run. The controls SHALL offer a reset that restores every parameter to its shipped default. In production builds the controls SHALL NOT be present.

#### Scenario: Tuning controls available in development
- **WHEN** the game runs in a development build
- **THEN** the tuning controls can be opened and each parameter can be adjusted

#### Scenario: Adjustments apply live
- **WHEN** gravity strength is changed during an active run in a development build
- **THEN** the ship's motion reflects the new value without restarting the run

#### Scenario: Control and edge modes switch live
- **WHEN** the control mode or edge mode is changed during an active run in a development build
- **THEN** the next press, or the next edge crossing, follows the newly selected mode without restarting the run

#### Scenario: Planet count applies to the next layout
- **WHEN** planet count is changed during an active run
- **THEN** the current layout is unchanged and the new count takes effect when a new layout is generated

#### Scenario: Reset restores defaults
- **WHEN** the reset control is used in a development build
- **THEN** every tuning parameter returns to its shipped default value

#### Scenario: Controls absent in production
- **WHEN** the game runs in a production build
- **THEN** no tuning controls are shown and the gameplay uses the shipped default parameters
