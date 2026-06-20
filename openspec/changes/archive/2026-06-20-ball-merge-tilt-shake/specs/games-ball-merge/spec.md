**App**: games

## ADDED Requirements

### Requirement: Motion controls interaction
The Ball Merge game SHALL support the tilt and shake mechanics defined in `ball-merge-tilt-shake`. World gravity is no longer a fixed constant — it MAY be biased laterally while motion controls are enabled. The shake button and physical shake gesture SHALL be available as risk/reward mechanics: the upward burst component of the jostle can cause balls to overflow a full container, and each shake deducts points (see `ball-merge-tilt-shake` for cost). Motion control state SHALL persist across restarts (if motion controls were enabled, they remain enabled after restart).

#### Scenario: Motion controls persist on restart
- **WHEN** motion controls are enabled and the player restarts the game
- **THEN** motion controls remain enabled for the new game without requiring another toggle tap

#### Scenario: Game-over does not change motion control state
- **WHEN** the game ends by overflow or quit while motion controls are enabled
- **THEN** the toggle remains in the enabled state on the end-game screen

#### Scenario: Shake is a risk/reward mechanic
- **WHEN** the player triggers a shake with a container that is nearly full
- **THEN** the upward burst may push balls over the top, ending the game
