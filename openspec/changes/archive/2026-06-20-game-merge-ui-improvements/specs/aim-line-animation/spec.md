**App**: games

## ADDED Requirements

### Requirement: Aim line dashes animate downward

The aim line in Ball Merge SHALL animate its dashes so they appear to flow continuously downward toward the container, reinforcing the direction of the drop. Animation SHALL be driven by a time-based phase offset applied in the scene's `update()` loop so that motion is smooth and frame-rate-independent. The animation SHALL run whenever the aim line is visible (i.e., during an active game before game over).

#### Scenario: Dashes flow downward during gameplay
- **WHEN** the game is active and the aim line is visible
- **THEN** the dashes appear to move downward continuously at a consistent speed

#### Scenario: Animation is frame-rate-independent
- **WHEN** the game runs at different frame rates
- **THEN** the perceived speed of the flowing dashes remains the same (time-based, not tick-based)

#### Scenario: Aim line is cleared on game over
- **WHEN** the game ends
- **THEN** the aim line is no longer drawn or animated
