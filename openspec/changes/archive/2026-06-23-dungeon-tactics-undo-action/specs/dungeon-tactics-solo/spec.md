**App**: dungeon-tactics-solo

## MODIFIED Requirements

### Requirement: PC move path planning via A*
When the player selects a destination for a PC's move, the game SHALL compute an A* path from the unit's current position to that cell, avoiding all structures and units other than the moving unit. The plan SHALL store the exact ordered step sequence. While the player is choosing a destination, the candidate route SHALL be rendered as a multi-segment polyline through every intermediate cell. The move SHALL commit immediately on selection (no deferred end-of-turn PC playback step); as it commits, the move SHALL be animated, visiting each cell in path order at a consistent per-tile speed.

#### Scenario: A* path avoids obstacles
- **WHEN** a player selects a move destination for a PC
- **THEN** the planned path SHALL route around all structures and all other units present at planning time, never passing through an occupied cell

#### Scenario: Path rendered as polyline
- **WHEN** a PC has a candidate move route shown
- **THEN** the planning overlay SHALL draw the route as a connected multi-segment line through each step, not as a straight diagonal or a single-elbow shortcut

#### Scenario: Animation follows path on immediate commit
- **WHEN** a PC move commits
- **THEN** the unit's animation SHALL step through each cell in the planned path in sequence as the move takes effect, with no separate batched playback phase
