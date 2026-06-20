**App**: games

## ADDED Requirements

### Requirement: Motion controls interaction
The Ball Merge game SHALL support the tilt and shake mechanics defined in `ball-merge-tilt-shake`. World gravity is no longer a fixed constant — it MAY be biased laterally while motion controls are enabled. The shake button and physical shake gesture SHALL be available as risk/reward mechanics that can redirect falling balls or break up settled piles. These interactions SHALL persist across restarts (if motion controls were enabled, they remain enabled after restart).

#### Scenario: Motion controls persist on restart
- **WHEN** motion controls are enabled and the player restarts the game
- **THEN** motion controls remain enabled for the new game without requiring another toggle tap

#### Scenario: Game-over does not change motion control state
- **WHEN** the game ends by overflow or quit while motion controls are enabled
- **THEN** the toggle remains in the enabled state on the end-game screen
