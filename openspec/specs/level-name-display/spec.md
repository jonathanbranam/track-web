**App**: games

## Purpose

Specifies display of the active level name in the Ball Merge HUD so the player always knows which level they are playing.

## Requirements

### Requirement: Active level name is shown in the HUD during gameplay

The Ball Merge game SHALL display the human-readable name of the active level (e.g., "Box", "Vase", "Cauldron") in the top HUD bar at all times during an active game. The name SHALL update immediately when a new level is selected and a game starts. It SHALL remain visible through game over, so the player can see which level they just played when reviewing their score.

#### Scenario: Level name is visible during active play
- **WHEN** a Ball Merge game is in progress
- **THEN** the human-readable level name is shown in the top HUD

#### Scenario: Level name reflects the selected level
- **WHEN** the player selects "Vase" in the level picker and starts a game
- **THEN** the HUD shows "Vase", not the level id "vase" or any other level's name

#### Scenario: Level name is visible on the game-over screen
- **WHEN** the game ends
- **THEN** the level name remains visible in the HUD so the player knows which level they played
