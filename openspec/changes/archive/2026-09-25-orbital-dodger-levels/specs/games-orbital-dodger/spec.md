**App**: games

## MODIFIED Requirements

### Requirement: Procedurally generated planet layout
Random level, and the starting geometry of **Create new** in the level editor, SHALL use a generated layout. A generated layout SHALL consist of up to a configured number of planets placed at random positions within the play area, each with a randomly chosen radius. Planets SHALL NOT overlap: every pair SHALL be separated by a clearance margin beyond the sum of their radii, so there is always navigable space between them. No planet SHALL be placed close enough to the play area's center point to occupy the ship's starting position. Placement SHALL complete in bounded time. When the requested planet count cannot be placed within that bound, generation SHALL relax the preferred clearance toward a non-zero floor and then SHALL omit the planets that still do not fit. It SHALL NOT emit a planet that overlaps another or that encroaches on the starting position. A crowded field therefore yields fewer planets, never an unplayable layout. Saved levels SHALL NOT be generated. They are played exactly as authored.

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

#### Scenario: Saved levels are not generated
- **WHEN** a run begins on a saved level
- **THEN** its planets are exactly the level's planets, whatever the current config's planet count

### Requirement: Proximity-weighted scoring and star pickups
Score SHALL accrue continuously over time at a base rate everywhere in the play area, plus a proximity bonus that increases as the ship's distance to the nearest planet surface decreases, reaching its maximum when the ship is touching a surface and falling to zero at or beyond a configured proximity range. The bonus SHALL ramp non-linearly so that close orbits are worth disproportionately more than moderate approaches. While the ship is locked in a captured orbit, the entire score rate (base rate and proximity bonus) SHALL be multiplied by a factor that is one at capture and falls linearly to zero as the ship travels a configured arc around the ring. Once that arc has been travelled, the locked orbit SHALL earn no points at all. The factor SHALL reset on the next capture, and SHALL start at one for a run that begins locked in orbit. Collectible stars SHALL be placed clear of planets on a generated layout, and SHALL be at the level's positions on a saved level. Collecting one SHALL award a fixed point bonus and emit a brief visual effect. On Random level, when every star in the current set has been collected, a new set SHALL be placed. On a saved level, stars SHALL NOT be replaced, and collecting the last one completes the level. The displayed score SHALL be the accrued total, shown as a whole number.

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
- **WHEN** the last uncollected star in the current set is collected on Random level
- **THEN** a new set of stars is placed at positions clear of the planets

#### Scenario: Stars do not respawn on a saved level
- **WHEN** the last uncollected star is collected on a saved level
- **THEN** no new stars are placed, and the run ends as Level Complete

#### Scenario: Stars are reachable
- **WHEN** a star is placed on a generated layout
- **THEN** it does not sit inside a planet or within its immediate surface clearance

### Requirement: HUD, run control, and end-of-run flow
During an active run the HUD SHALL display the current score, the remaining fuel indicator, and the remaining shield charges. On a saved level, and during a test run, it SHALL also display the number of stars remaining. The shield display SHALL update when a charge is consumed. While the empty-tank grace period is running, the HUD SHALL show the seconds remaining before the run ends. The HUD SHALL provide a quit control that ends the run voluntarily, and a control that opens the leaderboard without interrupting play. The quit control SHALL be hidden once a run has ended. When a run ends, whether by a loss condition, by completing the level, or by quitting, the game SHALL display an overlay showing the reason the run ended, the final score, and the leaderboard. It SHALL also show these controls:
- a restart control that replays the **same** geometry, available always
- a control that generates a **new** layout, on Random level only
- a control that returns to the level picker
- **Edit** on a saved level, and **Save as level** on Random level, each opening the level editor

Either restart control SHALL reset score, fuel, shield charges, orbit lock, ship position, velocity, and stars to their starting state. The end of a test run follows the level editor's rules instead.

#### Scenario: HUD shows score and fuel during play
- **WHEN** a run is in progress
- **THEN** the current score, a fuel indicator, and the remaining shield charges are visible

#### Scenario: HUD shows stars remaining on a saved level
- **WHEN** a run is in progress on a saved level
- **THEN** the number of uncollected stars is visible

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
- **THEN** the same planets and start are kept, and the score, fuel, shields, stars, and ship state reset to their starting values

#### Scenario: New layout regenerates the planets
- **WHEN** the player chooses a new layout after a Random level run ends
- **THEN** a freshly generated planet layout replaces the previous one and the run state resets

#### Scenario: No new layout on a saved level
- **WHEN** a run on a saved level ends
- **THEN** the overlay offers retry, the level picker and Edit, and does not offer a new layout

#### Scenario: Back to the level picker
- **WHEN** the player chooses the level picker after a run ends
- **THEN** the level picker is shown, and no run starts until a level is chosen

### Requirement: Leaderboard submission
On the end of a run, whether by a loss condition, by completing the level, or by quitting, the final score SHALL be submitted to the shared game score service under game slug `orbital-dodger` and mode `classic`. The level SHALL be `classic` for Random level, and `level-<id>` for a saved level, where `<id>` is the saved level's id. The leaderboard for that combination SHALL then be displayed, and the mid-run leaderboard SHALL show the same combination. A test run from the level editor SHALL NOT submit a score. Consistent with the existing score service, a score of zero SHALL NOT be submitted, and a failed submission SHALL be handled silently so the end-of-run overlay still renders. The server leaderboard SHALL be the sole scoreboard: no best score SHALL be stored on or read from the device.

#### Scenario: Score submitted on run end
- **WHEN** a Random level run ends with a score greater than zero
- **THEN** the score is submitted under game slug `orbital-dodger`, mode `classic`, and level `classic`, and the leaderboard is then fetched and displayed

#### Scenario: Saved level scores are kept per level
- **WHEN** a run on the saved level with id 7 ends with a score greater than zero
- **THEN** the score is submitted under level `level-7`, and the leaderboard shown is the one for `level-7`

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

### Requirement: Orbit capture rings
Each planet SHALL have an orbit ring: a circle concentric with the planet, at a height above its surface. When the planet has its own ring height, the ring SHALL use it. Otherwise the height SHALL scale with the planet's radius: the configured ring height applies to the largest planet, and no ring sits below a minimum height. The ring's orbit speed SHALL be the true circular orbit speed for that planet's pull at the ring's radius. If that speed would exceed the speed cap, the ring SHALL be raised until it does not, rather than using a speed the gravity model cannot sustain. With automatic heights, smaller planets therefore have lower and slower orbits than larger ones. The ring SHALL be drawn faintly while the ship is not locked to it and highlighted while it is. A ring that would cross another planet or its surface clearance SHALL be omitted, and, while influence zones are on, so SHALL a ring that does not fit inside its planet's inner influence zone. When the player is not pressing, and the ship is within a configured distance of a ring's radius, and its direction of motion is within a configured angle of the ring's tangent, and its speed is within a configured tolerance of the circular orbit speed for that ring, the ship SHALL lock into that orbit. While locked, the ship SHALL travel along the ring at a constant speed in the direction it was moving when captured, SHALL NOT consume fuel, and SHALL NOT be affected by any planet's gravity or by collision. Any press SHALL release the lock, except the first press of a run that begins in orbit, and the ship SHALL continue in free flight from its orbital position and velocity, with thrust applied if the press produces thrust. A press that produces no thrust (for example, a tap inside the relative-drag deadzone) therefore breaks orbit without burning fuel. After a release, the same ring SHALL NOT recapture the ship until it has left that ring's capture band. Orbit capture SHALL be switchable. While it is off, no rings SHALL be drawn and nothing SHALL be captured, and a ship that is locked when it is switched off SHALL continue in free flight from its orbital position and velocity.

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
- **WHEN** two planets of different radii both have automatic ring heights and both have rings
- **THEN** the smaller planet's ring sits closer to its surface and turns at a lower speed

#### Scenario: A planet's own ring height is used
- **WHEN** a planet has its own ring height of 30 and the resulting orbit speed is under the speed cap
- **THEN** its ring sits 30 above its surface, whatever the configured ring height

#### Scenario: An own ring height still obeys the ring rules
- **WHEN** a planet's own ring height would put its ring across another planet
- **THEN** that ring is not drawn and cannot capture the ship

#### Scenario: Capture switched off
- **WHEN** orbit capture is switched off
- **THEN** no orbit rings are drawn, a coasting ship is never captured, and a locked ship is released into free flight

#### Scenario: No immediate recapture
- **WHEN** the ship has just been released from a ring and the player lets go while still inside that ring's capture band
- **THEN** the ship is not recaptured by that ring until it has left the band

#### Scenario: Rings never cross another planet
- **WHEN** a planet's orbit ring would intersect another planet or its surface clearance
- **THEN** that ring is not drawn and cannot capture the ship

### Requirement: Run waits for the first press
Every run, whether first, retried, on a new layout or a test run, SHALL begin frozen. The layout, the stars, the ship at its start, the orbit rings and the forecast path SHALL be shown, with a prompt to touch to launch. The start SHALL be the center of the play area on Random level, and the level's start on a saved level or test run. From any point start, including the center start of Random level, the ship SHALL begin at rest, with no initial velocity. While frozen, the ship SHALL NOT move, and score SHALL NOT accrue, fuel SHALL NOT drain, and none of the loss conditions or grace timers SHALL advance. The player's first press on the play area SHALL start the simulation. From a point start, that press SHALL steer like any other press, so thrust applies from the first moment where the control mode produces it. From a start locked in orbit, that press SHALL only start the run. The quit control SHALL remain available while frozen.

#### Scenario: Nothing moves before the first press
- **WHEN** a run has started and the player has not yet pressed
- **THEN** the ship stays at its start position, the score stays at zero, the fuel stays full, and a launch prompt is shown

#### Scenario: The first press launches and steers
- **WHEN** the player presses and drags for the first time in a run from a point start
- **THEN** the prompt disappears, gravity starts acting, and the drag thrusts the ship

#### Scenario: A saved level starts at its start point
- **WHEN** a run begins on a saved level whose start is a point away from the center
- **THEN** the ship is shown at that point, and after the first press it begins from rest there

#### Scenario: Random level starts at rest
- **WHEN** a run begins on Random level and the player presses inside the deadzone without dragging
- **THEN** the ship begins at the center with no initial velocity and moves only under gravity

#### Scenario: Retry and new layout wait again
- **WHEN** the player retries or starts a new layout
- **THEN** the new run is frozen until the next press

### Requirement: Per-browser config selection
The controls SHALL offer a dropdown listing every saved config, with the Default first. Choosing a config SHALL apply its values under the same live-apply rules as individual adjustments, with one exception. A choice made while the run is waiting for its first press SHALL restart the frozen run with the chosen values. On Random level it SHALL also regenerate the layout so the chosen planet count takes effect at once. On a saved level or test run, the geometry SHALL be kept. Choosing a config while the level picker or level editor is open SHALL apply its values, and SHALL NOT change any geometry. If there are unsaved changes, choosing another config SHALL first ask for confirmation to discard them. The choice SHALL be remembered in that browser and used for later games. When the game is opened, it SHALL finish loading the configs before showing the level picker, showing a loading state until then. It SHALL NOT generate a layout or accept a launch with any parameters other than the selected config's. It SHALL then use the remembered config. If there is none, or the remembered config no longer exists, the game SHALL use the Default and clear the remembered choice. If the configs cannot be loaded, whether the request fails or takes more than 8 seconds, the game SHALL use the shipped default parameters and still be playable.

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
- **WHEN** a player on Random level selects a config with a different planet count while the run is waiting for the first press
- **THEN** the layout is regenerated with the selected config's planet count

#### Scenario: Selecting before the first press keeps a saved level
- **WHEN** a player on a saved level selects another config while the run is waiting for the first press
- **THEN** the planets, stars and start are unchanged, and the frozen run restarts with the selected config's fuel and shields

#### Scenario: Switching with unsaved changes asks first
- **WHEN** a player with unsaved changes chooses another config from the dropdown
- **THEN** they are asked to confirm discarding the changes, and cancelling keeps the current config and values

#### Scenario: Game start waits for configs
- **WHEN** the game is opened and the configs have not finished loading
- **THEN** a loading state is shown, no level picker, layout or launch is offered, and once loading finishes the level picker is shown with the selected config applied

#### Scenario: Configs unavailable
- **WHEN** the configs cannot be loaded from the server, because the request fails or takes more than 8 seconds
- **THEN** the game uses the shipped default parameters and is playable
