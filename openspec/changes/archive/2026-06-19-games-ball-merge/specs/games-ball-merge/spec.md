**App**: games

## ADDED Requirements

### Requirement: Three-sided container
The Ball Merge game SHALL render a container with a left wall, right wall, and floor, and an open top. Balls inside SHALL collide with the walls and floor and rest under gravity. The container SHALL be registered in the game registry as a `single-player` game with slug `ball-merge`.

#### Scenario: Balls are contained by the walls and floor
- **WHEN** a ball falls into the container and settles
- **THEN** it rests on the floor or on other balls, bounded by the left and right walls

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** Ball Merge is listed as a single-player game

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
The game SHALL maintain and display a running score that increases on each merge, with larger merges worth more. The game SHALL persist the highest score achieved on the device in `localStorage` and display it as the best score. The best score SHALL update only when the current score exceeds it.

#### Scenario: Score increases on merge
- **WHEN** a merge occurs
- **THEN** the displayed score increases by the merge's point value

#### Scenario: Best score persists across sessions
- **WHEN** a game ends with a score higher than the stored best
- **THEN** the new best score is written to `localStorage` and shown on the next visit

#### Scenario: Best score not lowered
- **WHEN** a game ends with a score at or below the stored best
- **THEN** the stored best score is unchanged

### Requirement: Loss when a ball falls outside the container
The game SHALL end when any ball comes to rest above the container's open top — i.e. a ball that overflows or settles on the rim instead of inside. A ball briefly passing through the opening as it is dropped SHALL NOT trigger a loss; only a ball that is above the top line and has effectively stopped moving SHALL trigger game over.

#### Scenario: Overflow ends the game
- **WHEN** a ball comes to rest with its body above the container's top line
- **THEN** the game ends and a game-over state is shown

#### Scenario: Dropping a ball does not falsely end the game
- **WHEN** a ball passes through the open top while still moving downward
- **THEN** the game does not end

### Requirement: Game over and restart
On game over the game SHALL display the final score and the best score and SHALL offer a restart control. Restarting SHALL clear all balls and reset the score to zero while preserving the best score.

#### Scenario: Game-over screen shown
- **WHEN** the game ends
- **THEN** the final score, the best score, and a restart control are displayed

#### Scenario: Restart resets the board
- **WHEN** the player chooses restart
- **THEN** all balls are removed, the score resets to zero, the best score is preserved, and a new ball is readied
