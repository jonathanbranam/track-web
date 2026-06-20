**App**: games

## MODIFIED Requirements

### Requirement: Configurable container shape
The Ball Merge game SHALL render a container whose shape is determined by the active level definition (see `ball-merge-levels`). The container SHALL have a closed base and sides formed by the level's segment list, and an open top at the level's `topY` coordinate. Balls inside SHALL collide with the container walls and floor and rest under gravity. The container SHALL be registered in the game registry as a `single-player` game with slug `ball-merge`.

#### Scenario: Balls are contained by the walls and floor
- **WHEN** a ball falls into the container and settles
- **THEN** it rests on the floor or on other balls, bounded by the container walls defined by the active level

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** Ball Merge is listed as a single-player game

#### Scenario: Container shape matches selected level
- **WHEN** the player starts a game with level `bowl` selected
- **THEN** the container renders the bowl geometry (U-shaped walls) rather than a rectangular box

### Requirement: Scoring and best score
The game SHALL maintain and display a running score that increases on each merge, with larger merges worth more. On game-over, the final score SHALL be submitted to the server leaderboard (see `ball-merge-leaderboard`) using the active level's id as the `level` field. The server leaderboard is the sole scoreboard — no best score is stored or displayed locally.

#### Scenario: Score increases on merge
- **WHEN** a merge occurs
- **THEN** the displayed score increases by the merge's point value

#### Scenario: Score submitted to server on game-end with active level id
- **WHEN** a game ends (natural overflow or player quit) while playing level `vase`
- **THEN** the final score is submitted to `POST /api/scores` with `mode = 'classic'` and `level = 'vase'`
