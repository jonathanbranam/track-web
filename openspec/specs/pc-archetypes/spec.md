**App**: dungeon-tactics-solo

## Purpose

Defines the PC archetypes in Dungeon Tactics Solo — melee, rogue, ranger, and magic user. Each archetype has a distinct move range, attack pattern, damage output, and visual color. All PCs start with 3 HP.

## Requirements

### Requirement: Ranger PC archetype
The system SHALL support a `ranger` PC archetype with move range 3, attack damage 1, and a straight-line ranged attack that requires a minimum gap of 1 tile (cannot target adjacent cells) and passes over all units between the ranger and the target. The ranger PC SHALL be rendered in green (0x2ecc71). Ranger attacks SHALL display a projectile tween traveling from the ranger to the target.

#### Scenario: Ranger move range
- **WHEN** the player selects a ranger PC and enters move-planning mode
- **THEN** up to 3 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Ranger attack targeting excludes adjacent
- **WHEN** the Attack action is active for a ranger PC
- **THEN** the immediately adjacent cells SHALL NOT be offered as attack targets

#### Scenario: Ranger attack targeting includes range 2+
- **WHEN** the Attack action is active for a ranger PC
- **THEN** cells at distance ≥ 2 along each cardinal SHALL be offered as attack targets

#### Scenario: Ranger attack passes over units
- **WHEN** a ranger PC attacks along a cardinal and units occupy cells between the ranger and the target
- **THEN** those intermediate units SHALL NOT be damaged; only the first unit/structure at distance ≥ 2 along that cardinal SHALL receive 1 damage

#### Scenario: Ranger projectile animation
- **WHEN** a ranger PC attack resolves
- **THEN** a projectile tween SHALL travel visually from the ranger's tile to the tile the attack resolves against, passing over intermediate tiles

#### Scenario: Ranger color
- **WHEN** a ranger PC is drawn on the grid
- **THEN** its fill color SHALL be green (0x2ecc71)

### Requirement: Magic User PC archetype
The system SHALL support a `magic-user` PC archetype with move range 3, attack damage 1 per affected tile, and an area-of-effect attack: the attack lands at distance 2 along a cardinal from the magic user's position, damaging the center tile and its 4 orthogonally adjacent tiles (a cross pattern). The player aims it by choosing any tile the cross covers, including the off-axis arms. The magic user PC SHALL be rendered in purple (0x9b59b6).

#### Scenario: Magic user move range
- **WHEN** the player selects a magic user PC and enters move-planning mode
- **THEN** up to 3 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Magic user attack targeting excludes adjacent
- **WHEN** the Attack action is active for a magic user PC
- **THEN** the immediately adjacent cell along each cardinal SHALL NOT be offered as an attack target

#### Scenario: Magic user AoE center placement
- **WHEN** the Attack action is active for a magic user PC
- **THEN** each offered cross SHALL be centered at distance 2 along a cardinal from the magic user's resolved position

#### Scenario: Magic user off-axis arms are targetable
- **WHEN** the Attack action is active for a magic user PC
- **THEN** the tiles to either side of each cross center SHALL be offered as attack targets, and choosing one SHALL resolve the cross that contains it

#### Scenario: Magic user AoE cross damage
- **WHEN** a magic user PC attack action resolves
- **THEN** each unit or structure on the AoE cross (center + up to 4 adjacent tiles) SHALL receive 1 damage; tiles outside the grid boundary are ignored

#### Scenario: Magic user AoE highlight during planning
- **WHEN** the Attack action is active for a magic user PC
- **THEN** all tiles of every offered cross SHALL be highlighted, not just the centers

#### Scenario: Magic user color
- **WHEN** a magic user PC is drawn on the grid
- **THEN** its fill color SHALL be purple (0x9b59b6)

### Requirement: PC HP starts at 3
All PC units SHALL start each game with 3 HP and be removed from the board when their HP reaches 0.

#### Scenario: PC starts with 3 HP
- **WHEN** the game initializes
- **THEN** every PC unit SHALL have hp = 3

#### Scenario: PC removed at 0 HP
- **WHEN** a PC unit receives damage that reduces its HP to 0 or below
- **THEN** that PC SHALL be removed from the board immediately

### Requirement: Melee PC archetype
The system SHALL support a `melee` PC archetype with move range 4, attack
damage 2, and attack targeting the single adjacent cell along the chosen
cardinal (range 1). The melee PC SHALL be rendered in blue (0x4a90e2).
Move range respects board obstacles and occupied tiles, and a melee PC
MAY move and then attack within the same turn, as two separate committed
actions.

#### Scenario: Melee move range
- **WHEN** the player selects a melee PC and enters move-planning mode
- **THEN** up to 4 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Melee movement respects obstacles
- **WHEN** the player selects a melee PC and enters move-planning mode, and a structure or another unit occupies a cell within its move range
- **THEN** that occupied cell SHALL NOT be a valid move destination, and no valid destination SHALL route a path through it

#### Scenario: Melee attack targeting
- **WHEN** the Attack action is active for a melee PC
- **THEN** only the four adjacent cells SHALL be offered as attack targets

#### Scenario: Melee attack damage
- **WHEN** a melee PC's attack action resolves against a unit at the target cell
- **THEN** that unit's HP SHALL decrease by 2

#### Scenario: Melee move-and-attack in one turn
- **WHEN** a melee PC commits a move to a new cell and then commits an attack from there in the same turn
- **THEN** the move SHALL charge its path length against the PC's movement budget, the attack SHALL resolve from the new cell, and the PC SHALL then be locked for the remainder of the turn

#### Scenario: Melee color
- **WHEN** a melee PC is drawn on the grid
- **THEN** its fill color SHALL be blue (0x4a90e2)

### Requirement: Rogue PC archetype
The system SHALL support a `rogue` PC archetype with move range 4, attack
damage 1, and attack targeting the single adjacent cell along the chosen
cardinal (range 1). The rogue PC SHALL be rendered in orange (0xe67e22).

#### Scenario: Rogue move range
- **WHEN** the player selects a rogue PC and enters move-planning mode
- **THEN** up to 4 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Rogue attack targeting
- **WHEN** the Attack action is active for a rogue PC
- **THEN** only the four adjacent cells SHALL be offered as attack targets

#### Scenario: Rogue attack damage
- **WHEN** a rogue PC's attack action resolves against a unit at the target cell
- **THEN** that unit's HP SHALL decrease by 1

#### Scenario: Rogue color
- **WHEN** a rogue PC is drawn on the grid
- **THEN** its fill color SHALL be orange (0xe67e22)
