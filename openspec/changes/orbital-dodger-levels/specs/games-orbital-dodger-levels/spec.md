**App**: games

## Purpose

Authored levels for Orbital Dodger: fixed arrangements of planets, stars and a start that every player plays the same way. It covers storing and sharing them, choosing one before each game, building and editing them in an in-game editor, starting a run in orbit, and completing a level by collecting all its stars.

## ADDED Requirements

### Requirement: Saved levels
The game SHALL store named levels on the server, shared by all players. A level SHALL hold only geometry:
- a start: either a point, or an orbit around one of the level's planets at a given angle and direction
- its planets, each with a position, a radius, a color, and an optional ring height
- its stars, each with a position

A level SHALL NOT hold or reference any tuning values. Every signed-in player SHALL be able to **create** a level with a name, **rename** a level, **save** new geometry over a level, and **delete** a level after confirming. Level names SHALL follow the config name rules: non-empty after trimming, at most 40 characters, and unique regardless of case. The server SHALL refuse a level that has no stars, has a position outside the play area, has a radius or ring height outside the allowed range, has an orbit start naming a planet the level does not have, or exceeds the allowed number of planets or stars. A refused create, rename or save SHALL show a message and change nothing. There is no default level, and the list of levels MAY be empty.

#### Scenario: Create a level
- **WHEN** a player saves a new level named "Twin Wells" from the editor
- **THEN** "Twin Wells" appears in the level list for every player, holding the planets, stars and start that were in the editor

#### Scenario: Duplicate level name refused
- **WHEN** a player creates or renames a level to "twin wells" while a level named "Twin Wells" exists
- **THEN** the action is refused with a message that the name is taken, and no level changes

#### Scenario: Rename a level
- **WHEN** a player renames "Twin Wells" to "Gate"
- **THEN** the level list shows "Gate" with the same geometry

#### Scenario: Save over a level
- **WHEN** a player edits "Gate" and saves over it
- **THEN** every player who plays "Gate" afterwards gets the new geometry

#### Scenario: Delete a level
- **WHEN** a player deletes "Gate" and confirms
- **THEN** "Gate" is removed from the level list for every player

#### Scenario: A level without stars is refused
- **WHEN** a level with no stars is saved, whether from the editor or by a request sent directly to the server
- **THEN** the save is refused with a message, and nothing is stored

#### Scenario: Malformed geometry is refused
- **WHEN** a request sent directly to the server holds a planet outside the play area, or an orbit start naming a planet the level does not have
- **THEN** the request is refused, and nothing is stored

#### Scenario: Levels are independent of configs
- **WHEN** a player plays the same level twice under two different tuning configs
- **THEN** the planets, stars and start are identical both times, and only the tuning differs

### Requirement: Level picker at game start
When the game is opened, it SHALL finish loading the configs and the levels, showing a loading state until then, and SHALL then show a level picker. No run SHALL start until a level is chosen. The picker SHALL list, in this order:
- **Random level**
- **Create new**
- every saved level by name, each offering Play and Edit

The level last played in that browser SHALL be pre-selected, but SHALL NOT start by itself. If the remembered level no longer exists, Random level SHALL be pre-selected and the remembered choice SHALL be cleared. If the levels cannot be loaded, because the request fails or takes more than 8 seconds, the picker SHALL still offer Random level and Create new, with a message that saved levels are unavailable. The picker SHALL also be reachable from the end-of-run overlay.

#### Scenario: The picker is shown before any run
- **WHEN** a player opens the game and loading has finished
- **THEN** the level picker is shown, and no run has started

#### Scenario: Picker order
- **WHEN** the picker is shown with saved levels "Gate" and "Twin Wells"
- **THEN** it lists Random level, then Create new, then "Gate" and "Twin Wells", each with Play and Edit

#### Scenario: Last level pre-selected
- **WHEN** a player last played "Gate", then opens the game later
- **THEN** "Gate" is pre-selected in the picker and does not start until the player chooses to play it

#### Scenario: Remembered level was deleted
- **WHEN** the level a player last played has been deleted, and they open the game
- **THEN** Random level is pre-selected

#### Scenario: Levels unavailable
- **WHEN** the levels cannot be loaded from the server
- **THEN** the picker offers Random level and Create new, and shows that saved levels are unavailable

#### Scenario: Playing a saved level
- **WHEN** a player chooses Play on "Gate"
- **THEN** a run on "Gate" begins, frozen until the first press

#### Scenario: Playing Random level
- **WHEN** a player chooses Random level
- **THEN** a run begins on a freshly generated layout, frozen until the first press

### Requirement: Level completion
On a saved level, and when test-playing a level in the editor, stars SHALL NOT be replaced once collected. Collecting the last uncollected star SHALL end the run with the reason "Level Complete". This end SHALL be reported and handled like any other run end: the end-of-run overlay SHALL show the completion heading and the final score, and the score SHALL be submitted. During a run on a saved level, the HUD SHALL show how many stars remain. Random level SHALL NOT complete.

#### Scenario: Collecting every star completes the level
- **WHEN** the ship collects the last uncollected star on a saved level
- **THEN** the run ends, the overlay heading reads "Level Complete", and the final score, including that star's bonus, is shown

#### Scenario: Stars do not respawn on a level
- **WHEN** the ship collects a star on a saved level and others remain
- **THEN** no new star appears, and the remaining count in the HUD goes down by one

#### Scenario: Random level never completes
- **WHEN** the ship collects the last star of the current set on Random level
- **THEN** the run continues and a new set of stars is placed

### Requirement: Level editor
The game SHALL provide a level editor. It opens from **Create new** or **Edit** in the picker, from **Edit** on the end-of-run overlay of a saved level, and from **Save as level** on the end-of-run overlay of Random level. While the editor is open, the simulation SHALL be frozen: nothing moves, and no score, fuel or loss condition advances. The editor SHALL show the planets, the stars, the start, and the orbit rings the current tuning config produces. The designer SHALL be able to:
- add a planet at a chosen point, move it by dragging, delete it, and set its radius, its color, and its ring height (automatic, or a set height)
- add a star at a chosen point, move it by dragging, and delete it
- move the start by dragging, or set the start in orbit around a chosen planet, with an angle and a direction
- test-play the current geometry
- save as a new level with a name, or save over the level being edited

Positions SHALL be kept inside the play area. The editor SHALL NOT refuse a placement for being close to or overlapping something else. It SHALL instead warn when a planet overlaps the start or sits inside the usual start clearance, and when two planets overlap. When the current config produces no ring for a planet, the editor SHALL say why: orbit capture is off, the ring crosses another planet, the ring does not fit the planet's influence zone, or no ring height keeps the orbit under the speed cap. **Create new** SHALL open on a freshly generated layout, using the current config's planet count, with a point start at the center. **Save as level** SHALL open on the Random layout just played, as a new level that has not been saved. Leaving the editor with unsaved changes SHALL first ask for confirmation.

#### Scenario: Create new starts from a random layout
- **WHEN** a player chooses Create new
- **THEN** the editor opens on a generated layout with the current config's planet count, a set of stars, and a start at the center

#### Scenario: Add, move and delete a planet
- **WHEN** the designer adds a planet, drags it to a new point, and then deletes it
- **THEN** the planet appears where it was added, follows the drag, and is gone after the delete

#### Scenario: Edit a planet's radius and ring height
- **WHEN** the designer sets a planet's radius to 40 and its ring height to 30
- **THEN** the planet is drawn at radius 40, and its ring, if the current config produces one, sits 30 above its surface

#### Scenario: Automatic ring height
- **WHEN** a planet's ring height is set to automatic
- **THEN** its ring height follows the planet's radius, as it does for generated planets

#### Scenario: Add, move and delete a star
- **WHEN** the designer adds a star, drags it, and deletes it
- **THEN** the star appears, follows the drag, and is removed

#### Scenario: Move the start
- **WHEN** the designer drags the start to a new point
- **THEN** the start is shown at that point, and a run on the level begins there

#### Scenario: A close start warns but is allowed
- **WHEN** the designer places the start within the usual start clearance of a planet
- **THEN** a warning is shown, and the level can still be test-played and saved

#### Scenario: A dropped ring explains itself
- **WHEN** the current config has orbit capture on and a planet's ring would cross another planet
- **THEN** that planet shows no ring, and the editor states that its ring crosses another planet

#### Scenario: Save as level from a Random run
- **WHEN** a Random run ends and the player chooses Save as level
- **THEN** the editor opens on that run's planets, stars and start, as a new level that has not been saved

#### Scenario: Deleting the orbited planet
- **WHEN** the start is in orbit around a planet and the designer deletes that planet
- **THEN** the start becomes a point start at the position it was shown at

#### Scenario: Leaving with unsaved changes asks first
- **WHEN** the designer has unsaved changes and leaves the editor
- **THEN** they are asked to confirm discarding the changes, and cancelling keeps the editor open with the changes intact

### Requirement: Test-playing from the editor
Test-playing SHALL run the editor's current geometry, saved or not, under the current tuning config, following the same rules as a run on a saved level, including level completion. A test run SHALL NOT submit a score. When a test run ends, the end-of-run overlay SHALL offer to go back to the editor, with the geometry exactly as it was before the test, or to retry the test.

#### Scenario: Test-play an unsaved level
- **WHEN** the designer test-plays geometry that has not been saved
- **THEN** a run begins on that geometry, frozen until the first press

#### Scenario: Test runs submit no score
- **WHEN** a test run ends with a score greater than zero
- **THEN** no score is submitted

#### Scenario: Back to the editor after a test
- **WHEN** a test run ends and the designer chooses to go back to the editor
- **THEN** the editor shows the same geometry as before the test, with its unsaved changes intact

### Requirement: Starting in orbit
A level whose start is in orbit SHALL begin each run frozen, with the ship on that planet's orbit ring at the level's angle, locked to the ring and set to travel in the level's direction. The first press SHALL start the run and SHALL otherwise be ignored: it SHALL NOT break the lock, thrust, or burn fuel, for as long as it is held. After that press ends, the ship SHALL be in an ordinary locked orbit, and the next press SHALL break it as usual. If the current config produces no ring for that planet, the ship SHALL instead begin at the planet's ring height at the level's angle, moving along the tangent in the level's direction at the circular orbit speed, in free flight. The first press SHALL then launch and steer like any first press.

#### Scenario: A run begins locked in orbit
- **WHEN** a run begins on a level whose start orbits a planet, and the current config gives that planet a ring
- **THEN** the ship is shown on the ring at the level's angle, the ring is highlighted, and nothing moves until the first press

#### Scenario: The first press only starts the run
- **WHEN** the player presses and drags for the first time on an in-orbit start
- **THEN** the ship starts circling on the ring, no thrust is applied, no fuel is used, and the ship stays locked after the press ends

#### Scenario: The second press breaks orbit
- **WHEN** the player presses again after the first press has ended
- **THEN** the lock is released as for any locked orbit

#### Scenario: No ring under the current config
- **WHEN** a run begins on an in-orbit start while the current config has orbit capture off
- **THEN** the ship begins at the planet's ring height, moving tangentially at the circular orbit speed in free flight, and the first press launches and steers it
