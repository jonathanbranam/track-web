**App**: games

## Purpose

The Ball Merge game — the first game in the casual games platform. A single-player, real-time Matter.js physics game: drop randomly-sized balls into a three-sided container, merge same-size balls into the next size up for points, and lose when a ball comes to rest above the open top. The player may also quit at any time. Score is shown in the HUD and submitted to the server leaderboard on game-end (natural overflow or quit); see `ball-merge-leaderboard` for the leaderboard spec.

## Requirements

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

### Requirement: Drop a randomly-sized ball from the top
The game SHALL present a drop position at the open top that the player can move horizontally across the container's width, and a control to release the held ball. Each held ball SHALL have a size drawn at random from the smaller end of the size range, so that larger balls are produced only through merging. After a ball is released, the next ball SHALL be readied at the drop position.

#### Scenario: Player aims and drops
- **WHEN** the player moves the drop position and releases the ball
- **THEN** the ball falls from that horizontal position under gravity into the container

#### Scenario: Next ball is readied
- **WHEN** a held ball is released
- **THEN** a new randomly-sized ball is readied at the drop position for the next drop

#### Scenario: Spawn sizes are limited to small balls
- **WHEN** a new ball is readied
- **THEN** its size is one of the smaller sizes in the range, never a large size

### Requirement: Same-size balls merge into the next size up
When two balls of the **same** size come into contact, the game SHALL remove both and create a single ball of the **next size up** at the point of contact, and SHALL award points for the merge. Balls of different sizes SHALL NOT merge. A ball at the largest size SHALL NOT merge further. Each ball SHALL participate in at most one merge per collision event, so a ball shared between two simultaneous same-size contacts is not consumed twice.

#### Scenario: Two equal balls merge
- **WHEN** two balls of the same size `n` (where `n` is not the largest) touch
- **THEN** both are removed and one ball of size `n + 1` appears at the contact point, and the score increases

#### Scenario: Different sizes do not merge
- **WHEN** two balls of different sizes touch
- **THEN** neither is removed and no merge occurs

#### Scenario: Largest size does not merge
- **WHEN** two balls of the largest size touch
- **THEN** they do not merge and remain as separate balls

#### Scenario: No double-consumption
- **WHEN** one ball is touched by two same-size balls in the same instant
- **THEN** it merges with only one of them and is not removed twice

### Requirement: Scoring and best score
The game SHALL maintain and display a running score that increases on each merge, with larger merges worth more. On game-over, the final score SHALL be submitted to the server leaderboard (see `ball-merge-leaderboard`) using the active level's id as the `level` field. The server leaderboard is the sole scoreboard — no best score is stored or displayed locally.

#### Scenario: Score increases on merge
- **WHEN** a merge occurs
- **THEN** the displayed score increases by the merge's point value

#### Scenario: Score submitted to server on game-end with active level id
- **WHEN** a game ends (natural overflow or player quit) while playing level `vase`
- **THEN** the final score is submitted to `POST /api/scores` with `mode = 'classic'` and `level = 'vase'`

### Requirement: Loss when a ball falls outside the container
The game SHALL end when any ball comes to rest above the container's open top — i.e. a ball that overflows or settles on the rim instead of inside. A ball briefly passing through the opening as it is dropped SHALL NOT trigger a loss; only a ball that is above the top line and has effectively stopped moving SHALL trigger game over.

#### Scenario: Overflow ends the game
- **WHEN** a ball comes to rest with its body above the container's top line
- **THEN** the game ends and a game-over state is shown

#### Scenario: Dropping a ball does not falsely end the game
- **WHEN** a ball passes through the open top while still moving downward
- **THEN** the game does not end

### Requirement: Quit at any time
The game SHALL provide a quit button in the HUD that the player can use to voluntarily end an active game at any time. Quitting SHALL submit the current score to the server (identical to the natural game-over path) and display the end-game overlay. The quit button SHALL be hidden once a game has ended (whether by overflow or by quitting).

#### Scenario: Quit button visible during active game
- **WHEN** a Ball Merge game is in progress
- **THEN** a quit button is visible in the HUD

#### Scenario: Quitting ends the game and submits score
- **WHEN** the player taps the quit button
- **THEN** the game stops, the current score is submitted, and the end-game overlay is shown

#### Scenario: Quit overlay is distinct from game-over
- **WHEN** the end-game overlay appears as a result of quitting
- **THEN** the heading indicates the player quit (e.g. "You Quit") rather than showing "Game Over"

### Requirement: Game over and restart
On game over (natural or quit) the game SHALL display the final score and a restart control, and SHALL show the server leaderboard panel (top-10 for the current mode and level). No local best score is shown. Restarting SHALL clear all balls and reset the score to zero.

#### Scenario: Game-over screen shown
- **WHEN** the game ends
- **THEN** the final score, the leaderboard panel, and a restart control are displayed; no local best score is shown

#### Scenario: Restart resets the board
- **WHEN** the player chooses restart
- **THEN** all balls are removed, the score resets to zero, and a new ball is readied
