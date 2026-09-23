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
Every planet SHALL attract the ship with a force proportional to the planet's area (the square of its radius) and inversely proportional to the square of the distance between them, scaled by a global gravity constant and a planet mass scale. The accelerations from all planets SHALL be summed. The squared distance used in the calculation SHALL be clamped to a minimum softening value, so that acceleration remains finite as the ship approaches a planet's center.

#### Scenario: Larger planets pull harder
- **WHEN** the ship is the same distance from two planets of different radii
- **THEN** the larger planet contributes the greater acceleration

#### Scenario: Pull increases as the ship nears a planet
- **WHEN** the ship moves closer to a planet
- **THEN** the acceleration that planet contributes increases with the inverse square of the distance

#### Scenario: Gravity from multiple planets combines
- **WHEN** more than one planet is present
- **THEN** the ship's acceleration is the vector sum of the contributions from every planet

#### Scenario: Acceleration stays finite near a planet center
- **WHEN** the distance between the ship and a planet center approaches zero
- **THEN** the computed acceleration is clamped by the softening distance and does not diverge

### Requirement: Hold-to-thrust control with a fuel budget
While the player holds a pointer down anywhere on the play area, the ship SHALL accelerate toward the pointer position at a fixed thrust magnitude, in addition to gravity, and SHALL continue to do so as the pointer is dragged. Thrust SHALL be applied only while fuel remains. The ship's speed SHALL be clamped to a maximum, and holding SHALL drain fuel in proportion to elapsed thrusting time from a fixed starting budget. Releasing the pointer SHALL stop thrust and stop fuel drain. A visible indicator SHALL show remaining fuel and SHALL change appearance as the reserve runs low.

#### Scenario: Holding accelerates the ship toward the pointer
- **WHEN** the player holds a pointer down at a position while fuel remains
- **THEN** the ship accelerates toward that position in addition to the gravitational acceleration

#### Scenario: Dragging redirects thrust
- **WHEN** the player drags the held pointer to a new position
- **THEN** the thrust direction updates to point toward the new position

#### Scenario: Releasing stops thrust
- **WHEN** the player releases the pointer
- **THEN** thrust is no longer applied and fuel stops draining; the ship continues under gravity alone

#### Scenario: Holding drains fuel
- **WHEN** the player holds the pointer down for a period of time
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
Score SHALL accrue continuously over time at a base rate everywhere in the play area, plus a proximity bonus that increases as the ship's distance to the nearest planet surface decreases, reaching its maximum when the ship is touching a surface and falling to zero at or beyond a configured proximity range. The bonus SHALL ramp non-linearly so that close orbits are worth disproportionately more than moderate approaches. Collectible stars SHALL be placed clear of planets; collecting one SHALL award a fixed point bonus and emit a brief visual effect. When every star in the current set has been collected, a new set SHALL be placed. The displayed score SHALL be the accrued total, shown as a whole number.

#### Scenario: Score accrues in open space
- **WHEN** the ship is far from every planet and the run is active
- **THEN** the score increases at the base rate as time passes

#### Scenario: Close orbits score faster
- **WHEN** the ship flies near a planet's surface rather than far from it
- **THEN** the score increases at a higher rate, up to the maximum proximity bonus at the surface

#### Scenario: Proximity bonus fades with distance
- **WHEN** the ship's distance to the nearest planet surface exceeds the proximity range
- **THEN** only the base rate applies and no proximity bonus is added

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
The game SHALL render a path projecting where gravity alone would carry the ship from its current position and velocity, ignoring any thrust currently being applied. The path SHALL be computed by forward-integrating the same gravity model used for the ship and SHALL terminate early when it reaches a configured forecast distance, when it intersects a planet, when it leaves the play area, or when it reaches a bounded step limit — whichever comes first. The path SHALL be drawn so it fades along its length, and SHALL NOT be drawn when the forecast distance is configured to zero.

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

### Requirement: Loss conditions
An active run SHALL end when any of the following occurs: the ship contacts a planet, the ship travels beyond the play area by more than a configured margin, or the remaining fuel reaches zero. When the run ends, the game SHALL report which of these caused it, and the end-of-run display SHALL state that reason.

#### Scenario: Crashing into a planet ends the run
- **WHEN** the distance between the ship and a planet's center becomes less than the sum of their radii
- **THEN** the run ends and the reason is reported as a crash

#### Scenario: Drifting out of bounds ends the run
- **WHEN** the ship travels beyond the play area by more than the configured margin
- **THEN** the run ends and the reason is reported as a crash

#### Scenario: Running out of fuel ends the run
- **WHEN** remaining fuel reaches zero while thrusting, with the ship clear of every planet
- **THEN** the run still ends and the reason is reported as out of fuel

#### Scenario: Leaving the visible area briefly does not end the run
- **WHEN** the ship passes just outside the visible play area but remains within the configured margin
- **THEN** the run continues and the ship may return under gravity

### Requirement: HUD, run control, and end-of-run flow
During an active run the HUD SHALL display the current score and the remaining fuel indicator, and SHALL provide a quit control that ends the run voluntarily and a control that opens the leaderboard without interrupting play. The quit control SHALL be hidden once a run has ended. When a run ends — whether by a loss condition or by quitting — the game SHALL display an overlay showing the reason the run ended, the final score, the leaderboard, and two restart controls: one that replays the **same** planet layout and one that generates a **new** layout. Either restart control SHALL reset score, fuel, ship position, velocity, and stars to their starting state.

#### Scenario: HUD shows score and fuel during play
- **WHEN** a run is in progress
- **THEN** the current score and a fuel indicator are visible

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
- **THEN** the same planet layout is kept, and the score, fuel, stars, and ship state reset to their starting values

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

### Requirement: Development-only tuning controls
The game SHALL expose controls to adjust its tuning parameters — gravity strength, planet mass scale, thrust, maximum speed, gravity softening distance, ship radius, planet count, maximum fuel, scoring base rate, proximity bonus, proximity range, and forecast distance — in development builds only. Adjustments SHALL take effect immediately on the running simulation, except planet count which SHALL apply to the next generated layout. The controls SHALL offer a reset that restores every parameter to its shipped default. In production builds the controls SHALL NOT be present.

#### Scenario: Tuning controls available in development
- **WHEN** the game runs in a development build
- **THEN** the tuning controls can be opened and each parameter can be adjusted

#### Scenario: Adjustments apply live
- **WHEN** gravity strength is changed during an active run in a development build
- **THEN** the ship's motion reflects the new value without restarting the run

#### Scenario: Planet count applies to the next layout
- **WHEN** planet count is changed during an active run
- **THEN** the current layout is unchanged and the new count takes effect when a new layout is generated

#### Scenario: Reset restores defaults
- **WHEN** the reset control is used in a development build
- **THEN** every tuning parameter returns to its shipped default value

#### Scenario: Controls absent in production
- **WHEN** the game runs in a production build
- **THEN** no tuning controls are shown and the gameplay uses the shipped default parameters
