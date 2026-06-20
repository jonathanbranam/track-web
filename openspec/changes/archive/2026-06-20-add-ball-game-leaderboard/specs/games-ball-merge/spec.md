**App**: games

## MODIFIED Requirements

### Requirement: Scoring and best score
The game SHALL maintain and display a running score that increases on each merge, with larger merges worth more. On game-over, the final score SHALL be submitted to the server leaderboard (see `ball-merge-leaderboard`). The server leaderboard is the sole scoreboard — no best score is stored or displayed locally.

#### Scenario: Score increases on merge
- **WHEN** a merge occurs
- **THEN** the displayed score increases by the merge's point value

#### Scenario: Score submitted to server on game-over
- **WHEN** a game ends
- **THEN** the final score is submitted to `POST /api/scores` with the current mode (`classic`) and level (`box`)

### Requirement: Game over and restart
On game over the game SHALL display the final score and a restart control, and SHALL show the server leaderboard panel (top-10 for the current mode and level). No local best score is shown. Restarting SHALL clear all balls and reset the score to zero.

#### Scenario: Game-over screen shown
- **WHEN** the game ends
- **THEN** the final score, the leaderboard panel, and a restart control are displayed; no local best score is shown

#### Scenario: Restart resets the board
- **WHEN** the player chooses restart
- **THEN** all balls are removed, the score resets to zero, and a new ball is readied

## REMOVED Requirements

### Requirement: Best score persists across sessions
**Reason**: The server leaderboard replaces per-device localStorage score tracking. Storing a local best is redundant and creates a second source of truth that can diverge across devices.
**Migration**: Remove `localStorage` reads/writes for `ball-merge:best` from `BallMergeGame.tsx`. The `BEST_KEY` constant and all references to it are deleted.
