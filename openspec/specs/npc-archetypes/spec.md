**App**: dungeon-tactics-solo

## Purpose

Defines the two NPC (enemy) archetypes in Dungeon Tactics Solo. Each archetype has a distinct move range, attack pattern, damage output, and visual color. All NPCs start with 3 HP.

## Requirements

### Requirement: Short-range NPC archetype
The system SHALL support a `short-range` NPC archetype with move range 3, attack damage 1, and a straight-line attack that can hit targets at distance 1–2 in any cardinal direction. The short-range NPC SHALL be rendered in red (0xe24a4a). The short-range NPC attack hits the first unit or structure within 2 tiles; it does not pass over intervening units.

#### Scenario: Short-range NPC move range
- **WHEN** the NPC AI plans movement for a short-range NPC
- **THEN** the NPC SHALL move at most 3 tiles along its path toward the target

#### Scenario: Short-range NPC attacks adjacent target
- **WHEN** a short-range NPC has a unit or structure at distance 1 in a cardinal direction
- **THEN** the NPC AI SHALL plan an attack on that target dealing 1 damage

#### Scenario: Short-range NPC attacks at distance 2
- **WHEN** a short-range NPC has no target at distance 1 but has a unit or structure at distance 2 in a cardinal direction with no obstruction between them
- **THEN** the NPC AI SHALL plan an attack on that target dealing 1 damage

#### Scenario: Short-range NPC does not shoot over units
- **WHEN** a unit occupies the tile between a short-range NPC and a farther target in a straight line
- **THEN** the attack SHALL NOT pass through the intervening unit; only the closer unit SHALL be the valid target

#### Scenario: Short-range NPC color
- **WHEN** a short-range NPC is drawn on the grid
- **THEN** its fill color SHALL be red (0xe24a4a)

### Requirement: Long-range NPC archetype
The system SHALL support a `long-range` NPC archetype with move range 3, attack damage 1, and a straight-line ranged attack that requires a minimum gap of 1 tile (cannot attack adjacent targets) and passes over all units between the NPC and the target tile. The long-range NPC SHALL be rendered in amber (0xcc8800). Long-range NPC attacks SHALL display a projectile tween traveling from the NPC to the target.

#### Scenario: Long-range NPC move range
- **WHEN** the NPC AI plans movement for a long-range NPC
- **THEN** the NPC SHALL move at most 3 tiles along its path toward the target

#### Scenario: Long-range NPC cannot attack adjacent
- **WHEN** a long-range NPC has a unit or structure at distance 1
- **THEN** the NPC AI SHALL NOT plan an attack on that target; the NPC SHALL move instead

#### Scenario: Long-range NPC attacks at distance 2 or more
- **WHEN** a long-range NPC has a unit or structure at distance ≥ 2 in a cardinal direction
- **THEN** the NPC AI SHALL plan an attack on that target dealing 1 damage, passing over all intervening units

#### Scenario: Long-range NPC projectile passes over units
- **WHEN** a long-range NPC attack resolves and units occupy tiles between the NPC and the target
- **THEN** those intermediate units SHALL NOT be damaged; only the target at distance ≥ 2 SHALL receive 1 damage

#### Scenario: Long-range NPC projectile animation
- **WHEN** a long-range NPC attack resolves during playback
- **THEN** a projectile tween SHALL travel visually from the NPC's tile to the target tile

#### Scenario: Long-range NPC color
- **WHEN** a long-range NPC is drawn on the grid
- **THEN** its fill color SHALL be amber (0xcc8800)

### Requirement: NPC HP starts at 3
All NPC units SHALL start each game with 3 HP and be removed from the board when their HP reaches 0.

#### Scenario: NPC starts with 3 HP
- **WHEN** the game initializes
- **THEN** every NPC unit SHALL have hp = 3

#### Scenario: NPC removed at 0 HP
- **WHEN** an NPC unit receives damage that reduces its HP to 0 or below
- **THEN** that NPC SHALL be removed from the board immediately

### Requirement: NPC movement via committed A* path
When the NPC AI plans movement, it SHALL use A* pathfinding to find the shortest route toward the target, treating other NPCs and PCs as passable for routing purposes but stopping at structures. The path SHALL be trimmed to the NPC's move range. This exact step sequence SHALL be committed to the NPC's action at planning time and not re-computed during playback. During the planning overlay, the intended route SHALL be drawn as a multi-segment polyline. During NPC playback, the NPC SHALL execute each committed step in order, stopping immediately at the first step that is occupied or blocked by something that changed since planning. If a move-attack was planned, the attack SHALL execute regardless of how far the NPC was able to move.

#### Scenario: NPC path computed via A*
- **WHEN** the NPC AI plans movement toward a target
- **THEN** the route SHALL be the shortest orthogonal path, treating structures as impassable and other units as passable

#### Scenario: NPC intended route drawn as polyline
- **WHEN** the planning overlay is shown and an NPC has a move or move-attack planned
- **THEN** the NPC's intended route SHALL be drawn as a connected multi-segment line through the committed step sequence, not as a diagonal line to the destination

#### Scenario: NPC stops at first blocked step during playback
- **WHEN** an NPC move action executes and a committed step is blocked
- **THEN** the NPC SHALL stop at the last successfully reached cell and not skip to an open cell beyond the obstacle

#### Scenario: Attack executes despite blocked movement
- **WHEN** an NPC has a move-attack planned and its movement is fully or partially blocked during playback
- **THEN** the attack SHALL still execute against the originally planned target

### Requirement: Initial NPC archetype assignments
The starting units in `initialState` SHALL include both NPC archetypes. The default layout SHALL assign short-range and long-range types to the initial NPC slots.

#### Scenario: Initial NPC types present
- **WHEN** the game initializes
- **THEN** at least one `short-range` NPC and at least one `long-range` NPC SHALL be present on the board
