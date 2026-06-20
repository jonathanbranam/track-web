**App**: games

## Purpose

A library of named container shapes for the Ball Merge game, each defining distinct interior geometry for the physics container, plus a level picker UI that lets the player choose a container before each game. Difficulty labels surface harder levels in the picker. Scores are fully scoped per level so each shape has its own leaderboard.

## Requirements

### Requirement: Level library with 6–8 container shapes
The game SHALL define a library of at least 6 and at most 8 named level definitions. Each definition SHALL include a unique kebab-case id, a display name, an optional difficulty classification (`hard` or `danger`), the container geometry (expressed as a list of wall segments), the overflow line Y coordinate, the drop zone Y coordinate, and the minimum and maximum X bounds for the drop position. The following levels SHALL be included: `box`, `bowl`, `vase`, `cauldron`, `test-tube`, `diamond`, `hex`, and `pit`.

#### Scenario: All levels present in library
- **WHEN** the level library is loaded
- **THEN** it contains exactly the ids `box`, `bowl`, `vase`, `cauldron`, `test-tube`, `diamond`, `hex`, and `pit`

#### Scenario: Each level has required fields
- **WHEN** any level definition is read from the library
- **THEN** it has a non-empty `id`, a non-empty `name`, a non-empty `segments` list, a `topY` value, a `dropY` value, a `dropMinX`, and a `dropMaxX`

#### Scenario: Difficulty labels present on hard levels
- **WHEN** the level definitions are read
- **THEN** `vase`, `cauldron`, and `hex` have `difficulty: 'hard'`; `test-tube` and `diamond` have `difficulty: 'danger'`; `box`, `bowl`, and `pit` have no difficulty field

### Requirement: Level picker shown before each game
Before the Phaser canvas is initialized the game SHALL display a level picker overlay showing all available levels. The player SHALL select a level before a game can begin. The picker SHALL default to the `box` level. The picker SHALL remain visible until the player explicitly selects a level and confirms.

#### Scenario: Picker shown on initial load
- **WHEN** the Ball Merge game component mounts for the first time
- **THEN** the level picker overlay is displayed and the Phaser canvas has not yet started

#### Scenario: Default selection is box
- **WHEN** the level picker renders for the first time
- **THEN** the `box` level is pre-selected

#### Scenario: Game starts after level selection
- **WHEN** the player selects a level and confirms
- **THEN** the Phaser canvas mounts with that level's geometry active and the picker is dismissed

### Requirement: Level cards with difficulty badges
Each level in the picker SHALL be displayed as a selectable card showing the level's display name. Levels with `difficulty: 'hard'` SHALL show an amber "Hard" badge. Levels with `difficulty: 'danger'` SHALL show a red "Danger" badge. Levels with no difficulty SHALL show no badge.

#### Scenario: Hard badge shown
- **WHEN** a level with `difficulty: 'hard'` is rendered in the picker
- **THEN** an amber "Hard" badge is visible on its card

#### Scenario: Danger badge shown
- **WHEN** a level with `difficulty: 'danger'` is rendered in the picker
- **THEN** a red "Danger" badge is visible on its card

#### Scenario: No badge for standard levels
- **WHEN** a level with no difficulty is rendered in the picker
- **THEN** no difficulty badge appears on its card

### Requirement: Change Level on game-over and restart
The game-over overlay SHALL include a "Change Level" button in addition to "Play Again". Pressing "Change Level" SHALL return the player to the level picker overlay. Pressing "Play Again" SHALL restart the game with the currently selected level without reopening the picker.

#### Scenario: Play Again restarts with current level
- **WHEN** the player presses "Play Again" on the game-over overlay
- **THEN** the game restarts using the same level that was active when the game ended

#### Scenario: Change Level opens picker
- **WHEN** the player presses "Change Level" on the game-over overlay
- **THEN** the level picker overlay is shown, pre-selected to the level just played

#### Scenario: Selecting a new level from game-over starts a fresh game
- **WHEN** the player selects a different level in the picker after game-over and confirms
- **THEN** the Phaser canvas reinitializes with the new level's geometry and score resets to zero

### Requirement: Scores and leaderboard scoped per level
The selected level's id SHALL be passed to `POST /api/scores` as the `level` field on game-end (natural overflow or quit). The leaderboard fetch SHALL use the same level id so the leaderboard displayed corresponds to the active level. Each level maintains an independent leaderboard.

#### Scenario: Score submitted with selected level id
- **WHEN** a Ball Merge game ends on level `vase`
- **THEN** the score is submitted with `level = 'vase'`

#### Scenario: Leaderboard fetched for active level
- **WHEN** the game-over overlay fetches the leaderboard after a game on level `hex`
- **THEN** the leaderboard request includes `level = 'hex'`

#### Scenario: Leaderboard shows level-specific scores only
- **WHEN** the leaderboard is displayed for level `bowl`
- **THEN** scores from other levels do not appear
