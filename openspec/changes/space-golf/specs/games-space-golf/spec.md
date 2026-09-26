# Spec Delta

**App**: games

## Purpose

The Space Golf game — a single-player, shot-by-shot puzzle game on the casual games platform, played like mini golf and pinball in space. The ship rests in orbit around a planet, the player lines up a shot whose full flight is predicted by a deterministic simulation, and the ship flies — bent by gravity, pushed and hurt by course pieces — until it locks into another orbit. The goal of each level is to collect as many stars as possible on the way to a wormhole that leads to the next level, spending few strokes and little hull.

## ADDED Requirements

### Requirement: Game registration and catalog entry
Space Golf SHALL be registered in the games registry as a `single-player` game with slug `space-golf` and display name **Space Golf**, and SHALL be mounted directly (not through the multiplayer lobby flow). The games catalog SHALL display it as a selectable card. Orbital Dodger SHALL remain registered and unchanged.

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** Space Golf is listed as a single-player game with its name and description, alongside Orbital Dodger

#### Scenario: Selecting the game mounts it directly
- **WHEN** the player selects the Space Golf card
- **THEN** the app navigates to the game route and shows the Space Golf level picker without passing through a lobby

### Requirement: Course and level data
A level SHALL be a course 400 units wide and between 720 and 4000 units tall, with the tee at the bottom and the wormhole near the top. A level SHALL define: a stable string id and a display name; its height; its side-edge mode, `bounce` or `wrap`; its tee (a planet, an angle on that planet's ring, and an orbit direction); its planets (position, radius, color); its stars; exactly one wormhole (position, radius); and any number of course pieces (solar wind zones, asteroid fields, radiation zones). A level MAY override the forecast length. Every planet in a shipped level SHALL have an orbit ring under the shipped tuning, no two planets SHALL overlap, and no star SHALL lie inside a planet.

#### Scenario: Shipped levels are well-formed
- **WHEN** the shipped levels are validated
- **THEN** every level has a unique id, a height within range, exactly one wormhole inside the course, a tee on a planet that has a ring, no overlapping planets, and no star inside a planet

#### Scenario: Shipped levels are completable
- **WHEN** a search over shots is run from each level's tee under the shipped tuning
- **THEN** some chain of shots, each ending in an orbit lock, reaches the level's wormhole

### Requirement: Level sequence and level picker
The game SHALL ship a fixed, ordered sequence of at least four hand-authored levels. Across the sequence, each course piece type (solar wind, asteroid field, radiation zone) and each side-edge mode (bounce, wrap) SHALL appear in at least one level. When the game starts it SHALL show a level picker listing every level in order; any level MAY be chosen, with no unlocking. The picker SHALL pre-select the level last played in this browser, and SHALL fall back to the first level when the remembered level no longer exists.

#### Scenario: Picker lists the sequence
- **WHEN** the game starts
- **THEN** the level picker lists every shipped level in sequence order and any of them can be started

#### Scenario: Last level is remembered
- **WHEN** the player played the third level, left, and later returns to Space Golf
- **THEN** the picker pre-selects the third level but does not start it automatically

#### Scenario: Stale remembered level
- **WHEN** the remembered level id is not in the shipped sequence
- **THEN** the picker pre-selects the first level

### Requirement: Gravity
During flight every planet SHALL attract the ship with an inverse-square pull proportional to the planet's area, scaled by a gravity constant, with the squared distance clamped to a minimum so that acceleration stays finite; pulls from all planets SHALL be summed. Influence zones SHALL apply so that, close to a planet, other planets do not pull, and their pull fades back in smoothly further out. The wormhole SHALL pull the ship by the same law with its own strength.

#### Scenario: Pull grows as the ship nears a planet
- **WHEN** the ship moves closer to a planet during flight
- **THEN** the acceleration that planet contributes increases with the inverse square of the distance

#### Scenario: A nearby planet dominates
- **WHEN** the ship is well inside a planet's influence zone
- **THEN** other planets contribute no acceleration

### Requirement: Lies and orbit rings
Every planet SHALL have an orbit ring at a height above its surface, with a circular orbit speed matched to that planet's pull. Between shots the ship SHALL rest on a ring — the **lie** — orbiting at the ring's speed in the lie's direction. A level SHALL begin with the ship on the tee's ring at the tee's angle and direction. While on a ring the ship SHALL NOT be affected by gravity, course pieces, or damage.

#### Scenario: Level starts at the tee
- **WHEN** a level starts
- **THEN** the ship is on the tee planet's ring at the tee's angle, orbiting in the tee's direction, with full hull, zero strokes and no stars collected

#### Scenario: Orbiting is safe
- **WHEN** the ship is resting on a ring for any length of time
- **THEN** its hull does not change and it stays on the ring

### Requirement: Shots
A shot SHALL be defined by a **release point** on the current lie's ring and a **power** between 0 and 1. The ship SHALL leave the ring at the release point travelling prograde — along the ring's tangent in the orbit direction — at the ring's orbit speed plus the power times a launch boost, clamped to the maximum speed. Each shot SHALL add one stroke. A shot whose power is below a minimum (the aim was dragged back to its start) SHALL be cancelled and SHALL NOT add a stroke.

#### Scenario: Direction comes from the release point
- **WHEN** two shots with the same power are released from opposite points on the same ring
- **THEN** they leave in opposite directions

#### Scenario: Harder shots leave faster
- **WHEN** two shots are released from the same point with different powers
- **THEN** the higher-power shot leaves at the higher speed, never above the maximum speed

#### Scenario: Cancelled aim
- **WHEN** the player drags back to the aim's starting point and lets go
- **THEN** no shot is taken and the stroke count is unchanged

### Requirement: Aim modes
The game SHALL offer two player settings, remembered per browser:

- **Release**: `timed` (default) or `planned`. In timed mode, pressing starts an aim, dragging away from the press point sets power by drag distance, and letting go fires from wherever the ship is on the ring at that moment. In planned mode, the player places a release marker by dragging along the ring, sets power by dragging elsewhere, and fires with a Fire button; the ship then continues around the ring to the marker and launches from there.
- **Pause while aiming**: off (default) or on. When off, the ship keeps orbiting while the player aims; in timed mode the forecast moves with it. When on, the orbit freezes while the player's finger is down and resumes when the aim is released or cancelled.

#### Scenario: Timed release fires from the ship's position
- **WHEN** release is timed, pause is off, and the player holds an aim while the ship orbits a quarter turn and then lets go
- **THEN** the shot leaves from the ship's position at the moment of letting go, and the forecast shown just before letting go is the path it flies

#### Scenario: Pause freezes the orbit
- **WHEN** release is timed, pause is on, and the player presses to aim
- **THEN** the ship stops moving on the ring until the aim is fired or cancelled

#### Scenario: Planned release winds round to the marker
- **WHEN** release is planned and the player places the marker a half turn ahead of the ship and taps Fire
- **THEN** the ship travels round the ring to the marker and launches from the marker

#### Scenario: Settings persist
- **WHEN** the player changes release to planned and reloads the game
- **THEN** release is still planned

### Requirement: Deterministic shot simulation
The whole flight of a shot SHALL be computed before the ship moves, from the course, the lie, the shot and the tuning, at a fixed time step. The same inputs SHALL always produce the same path, the same events (stars collected, bounces and their damage, zone damage) and the same outcome. The outcome SHALL be one of: **lock** on a planet's ring, **wormhole**, **out of bounds**, **adrift** (no other outcome within a maximum flight time), or **destroyed** (hull reached 0).

#### Scenario: Same shot, same result
- **WHEN** the same shot is simulated twice from the same lie with the same tuning
- **THEN** both simulations produce identical paths, events and outcomes

#### Scenario: Every flight ends
- **WHEN** a shot is simulated that neither locks, reaches the wormhole, leaves the course nor destroys the ship within the maximum flight time
- **THEN** its outcome is adrift

### Requirement: Forecast arc
While the player aims, the game SHALL draw the forecast: the leading stretch of the simulated flight for the current aim, up to the forecast length (the level's override, or the tuning default). The forecast SHALL be taken from the same simulation that the flight will follow, so it can never disagree with the flight. Within the drawn stretch, the forecast SHALL mark: stars the flight collects; each bounce point, with its hull damage; segments inside damaging zones; and the outcome if it is reached — a lock, drawn as the target ring highlighted with a lock marker; the wormhole highlighted; or an out-of-bounds marker at the course edge. The forecast SHALL update whenever the aim or the ship's position on the ring changes.

#### Scenario: Forecast shows the lock
- **WHEN** the current aim's flight locks onto another planet within the forecast length
- **THEN** the forecast ends at that planet's ring, the ring is highlighted, and a lock marker is drawn

#### Scenario: Forecast shows stars and damage
- **WHEN** the current aim's flight collects two stars and bounces off a planet within the forecast length
- **THEN** those two stars are highlighted and the bounce point is marked with the damage it will do

#### Scenario: Forecast is cut at its length
- **WHEN** the flight's outcome lies beyond the forecast length
- **THEN** the forecast stops at the forecast length and no outcome is marked

### Requirement: Flight follows the forecast
When a shot is fired, the ship SHALL follow the simulated path exactly, applying each event (star collected, damage) as the ship reaches it, and SHALL resolve the outcome when the path ends. The player SHALL NOT be able to aim again until the flight has resolved.

#### Scenario: The flight is the forecast
- **WHEN** a shot is fired whose forecast showed a lock on a planet after collecting one star
- **THEN** the ship flies the forecast path, collects that star, and locks onto that planet

### Requirement: Orbit capture
During flight, the ship SHALL lock onto a planet's ring when it is within the capture band of the ring's radius and its speed is at or below that ring's capture speed (a tuning multiple of the ring's orbit speed), whatever its heading. On capture the ship SHALL be placed on the ring at its current angle, orbiting in the direction of its motion around the planet, and that becomes the new lie. A ship faster than the capture speed SHALL pass through the band and fly on, bent by gravity. The ring the ship was launched from SHALL NOT capture it until the ship has first left that ring's band; after that it SHALL capture like any other.

#### Scenario: Slow arrival locks
- **WHEN** the ship crosses another planet's ring below that ring's capture speed
- **THEN** it locks onto the ring and the lie becomes that planet

#### Scenario: Fast arrival flies by
- **WHEN** the ship crosses a ring above its capture speed
- **THEN** it does not lock, and its path is bent by that planet's gravity

#### Scenario: A weak shot falls back
- **WHEN** a low-power shot leaves its ring's band, fails to escape, and falls back to the same ring below capture speed
- **THEN** the ship locks back onto its original planet, and the stroke still counts

### Requirement: Hull and damage
The ship SHALL have a hull of 100 at the start of each level; hull SHALL carry across shots within a level and SHALL NOT regenerate. Hull SHALL be reduced by: planet bounces; wall bounces; asteroid fields; radiation zones; and going out of bounds. Collision damage SHALL depend on the speed *into* the surface, above a threshold, so that a fast skim along a surface does little damage and a head-on hit does much more. Default tuning SHALL make typical bounces cost roughly 5–20 hull, so that destruction takes several bad shots or one very violent one.

#### Scenario: Head-on hurts more than a skim
- **WHEN** the ship hits a planet head-on, and in another flight skims the same planet at the same total speed at a shallow angle
- **THEN** the head-on hit does more damage

#### Scenario: Slow contact is free
- **WHEN** the ship touches a surface with inward speed below the damage threshold
- **THEN** it bounces without losing hull

### Requirement: Planet bounces
When the ship touches a planet's surface during flight, it SHALL bounce: its velocity component into the surface SHALL be reversed and scaled by a restitution factor, its component along the surface SHALL be kept, it SHALL be placed back on the surface, and it SHALL take collision damage. The flight SHALL continue after the bounce.

#### Scenario: Bounce and continue
- **WHEN** a flight hits a planet surface at speed
- **THEN** the ship rebounds away from the planet with reduced speed, takes damage, and continues flying

### Requirement: Course edges and out of bounds
In `bounce` mode, the left and right edges SHALL act as walls: the ship SHALL rebound off them like a planet surface and take wall collision damage. In `wrap` mode, leaving one side SHALL bring the ship in at the other at the same height and velocity. Leaving the course past the bottom or the top by more than a margin SHALL be **out of bounds**: the ship SHALL return to the lie it was shot from, at the release angle, and the player SHALL take one penalty stroke and a small hull penalty. Stars collected during an out-of-bounds shot SHALL be un-collected; hull lost during it SHALL stay lost. An **adrift** outcome SHALL be handled the same way, without the hull penalty.

#### Scenario: Side wall bounce
- **WHEN** the ship hits the side of a `bounce` level
- **THEN** it rebounds into the course and takes damage based on its speed into the wall

#### Scenario: Side wrap
- **WHEN** the ship leaves the right side of a `wrap` level
- **THEN** it appears at the left side at the same height, moving the same way

#### Scenario: Out of bounds returns to the last lie
- **WHEN** a shot from planet B collects a star and then flies off the top of the course
- **THEN** the ship is back on planet B's ring, the stroke count has gone up by two (the shot and the penalty), the star is available again, and the hull penalty has been applied

### Requirement: Course pieces
Course pieces SHALL act on the ship only during flight, and SHALL be part of the simulation, so their effects appear in the forecast.

- **Solar wind**: a rectangular zone with a fixed acceleration vector, applied while the ship is inside. It SHALL be drawn with streaks moving in the wind's direction.
- **Asteroid field**: a rectangular zone that applies drag and does damage in proportion to the distance flown inside it.
- **Radiation zone**: a circular zone that does damage in proportion to the time spent inside it.

#### Scenario: Wind pushes the ship
- **WHEN** a flight crosses a solar wind zone blowing to the right
- **THEN** the ship's path curves to the right while inside the zone, compared with the same shot on the same course without the zone

#### Scenario: Asteroids slow and damage
- **WHEN** a flight passes through an asteroid field
- **THEN** the ship leaves the field slower than it entered and with less hull, and a longer path through the field costs more hull

#### Scenario: Radiation punishes lingering
- **WHEN** two flights cross the same radiation zone over the same distance, one at twice the speed of the other
- **THEN** the faster flight takes about half the damage

### Requirement: Stars
A star SHALL be collected when the ship's flight passes within the ship's radius plus the star's radius of it. A collected star SHALL disappear and be counted, except as un-collected by an out-of-bounds or adrift outcome. The HUD SHALL show stars collected out of the level's total.

#### Scenario: Collecting a star
- **WHEN** a flight passes through a star
- **THEN** the star disappears and the HUD's star count goes up by one

### Requirement: Wormhole
Each level SHALL have one wormhole. A flight that comes within the wormhole's radius SHALL end with the **wormhole** outcome, whatever its speed, and the level SHALL be complete. The wormhole SHALL be drawn distinctly from planets and SHALL pull the ship.

#### Scenario: Entering the wormhole completes the level
- **WHEN** a flight reaches the wormhole
- **THEN** the flight ends there, the level is complete, and the level summary is shown

### Requirement: Destruction
When the ship's hull reaches 0 during a flight, the flight SHALL end at that point with the **destroyed** outcome. The game SHALL show that the ship was destroyed and offer to restart the level; restarting SHALL begin the level again from the tee with full hull, no strokes and no stars. A destroyed level SHALL NOT submit a score.

#### Scenario: Destroyed ship restarts the level
- **WHEN** a bounce takes the hull from 8 to 0
- **THEN** the flight ends at the bounce, the destroyed message is shown, and choosing Restart starts the level from the tee with 100 hull

### Requirement: Scoring
A completed level's score SHALL be:

`stars × starPoints + (allStarsBonus if every star was collected) + hull remaining × hullPoints − strokes × strokeCost − total power × powerCost`

floored at 0, where total power is the sum of every fired shot's power. The defaults SHALL be starPoints 100, allStarsBonus 200, hullPoints 1, strokeCost 25, powerCost 10, and SHALL be tunable. With the defaults, collecting stars SHALL be worth more than saving strokes: one star is worth four strokes.

#### Scenario: Stars beat a hole-in-one
- **WHEN** with default scoring one run finishes in 1 stroke with 1 of 8 stars, 100 hull and total power 1, and another finishes in 3 strokes with 6 of 8 stars, 80 hull and total power 2
- **THEN** the first scores 165 and the second scores 585

#### Scenario: All stars bonus
- **WHEN** a run collects every star in the level
- **THEN** its score includes the all-stars bonus

### Requirement: Heads-up display and controls
While playing, the game SHALL show the level name, the stroke count, stars collected out of total, and a hull bar with its value. It SHALL provide a **Restart** button that immediately restarts the current level from the tee (cancelling any flight in progress), a **Levels** button that leaves to the level picker without submitting a score, and a **Settings** button for the aim modes. In planned release mode it SHALL show a **Fire** button, enabled only while an aim with power is set. Buttons laid over the game canvas SHALL respond to taps on iOS.

#### Scenario: Restart mid-level
- **WHEN** the player has taken 3 strokes and collected 2 stars and taps Restart
- **THEN** the level begins again at the tee with 0 strokes, 0 stars and full hull

#### Scenario: Restart during a flight
- **WHEN** the player taps Restart while the ship is in flight
- **THEN** the flight is abandoned and the level restarts from the tee

#### Scenario: Overlay buttons work on iOS
- **WHEN** the player taps Restart on an iPhone
- **THEN** the level restarts

### Requirement: Camera and scouting
The view SHALL show the full 400-unit course width and scroll vertically. While the ship is resting, the view SHALL keep the ship's planet in view; during flight it SHALL follow the ship. The player SHALL be able to scout the course: in a **Look** mode (toggled by a button, unavailable during flight), dragging SHALL scroll the view without aiming, and leaving Look mode SHALL return the view to the ship. On desktop, the mouse wheel SHALL also scroll the view while the ship is resting.

#### Scenario: Following a flight
- **WHEN** a shot flies up the course beyond the current view
- **THEN** the view scrolls to keep the ship visible

#### Scenario: Scouting ahead
- **WHEN** the player turns on Look mode and drags down
- **THEN** the view scrolls up the course and no aim is started; turning Look off returns the view to the ship

### Requirement: Level summary and leaderboard
When a level is completed, the game SHALL show a summary with the stars collected out of total, strokes, hull remaining, total power, each term of the score, and the total score. It SHALL submit the score to the shared leaderboard with game slug `space-golf`, mode `classic`, and level set to the level's id, and SHALL show that level's leaderboard. The summary SHALL offer **Next level** (absent on the last level, which instead says the course is complete), **Replay**, and **Levels**. Entering the wormhole on the last level SHALL say that the course is complete.

#### Scenario: Completing a level submits its score
- **WHEN** the player completes the level with id `first-tee` scoring 420
- **THEN** a score of 420 is submitted for game `space-golf`, mode `classic`, level `first-tee`, and that level's leaderboard is shown

#### Scenario: Next level
- **WHEN** the player taps Next level on the summary of the first level
- **THEN** the second level starts at its tee

### Requirement: Tuning panel
The game SHALL provide a tuning panel, in every build, exposing the physics, capture, damage, forecast and scoring constants as live controls. Changes SHALL apply from the next shot, SHALL be remembered in this browser, and SHALL be resettable to the shipped defaults. Tuning SHALL NOT be stored on the server, and the leaderboard SHALL NOT distinguish runs by tuning.

#### Scenario: Tuning applies to the next shot
- **WHEN** the player raises the launch boost in the panel
- **THEN** the forecast for the current aim reflects the new value, and the next shot flies with it

#### Scenario: Reset tuning
- **WHEN** the player taps Reset in the tuning panel
- **THEN** every constant returns to its shipped default
