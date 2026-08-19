**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: Melee PC archetype
The system SHALL support a `melee` PC archetype with move range 4, attack
damage 2, and attack targeting the single adjacent cell in the chosen
direction (range 1). The melee PC SHALL be rendered in blue (0x4a90e2).
Move range respects board obstacles and occupied tiles, and a melee PC
MAY move and attack within the same turn.

#### Scenario: Melee move range
- **WHEN** the player selects a melee PC and enters move-planning mode
- **THEN** up to 4 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Melee movement respects obstacles
- **WHEN** the player selects a melee PC and enters move-planning mode, and a structure or another unit occupies a cell within its move range
- **THEN** that occupied cell SHALL NOT be a valid move destination, and no valid destination SHALL route a path through it

#### Scenario: Melee attack targeting
- **WHEN** the player selects attack direction for a melee PC
- **THEN** only the single adjacent cell in that direction SHALL be highlighted as the attack target

#### Scenario: Melee attack damage
- **WHEN** a melee PC's attack action resolves against a unit at the target cell
- **THEN** that unit's HP SHALL decrease by 2

#### Scenario: Melee move-and-attack in one turn
- **WHEN** a melee PC's turn action moves it to a new cell and then resolves an attack
- **THEN** the PC SHALL end the turn at the new cell with the attack resolved against the target from that new position

#### Scenario: Melee color
- **WHEN** a melee PC is drawn on the grid
- **THEN** its fill color SHALL be blue (0x4a90e2)

### Requirement: Rogue PC archetype
The system SHALL support a `rogue` PC archetype with move range 4, attack
damage 1, and attack targeting the single adjacent cell in the chosen
direction (range 1). The rogue PC SHALL be rendered in orange (0xe67e22).
The rogue archetype is a stub for future enhancement; its attack behavior
is melee-equivalent at 1 damage.

#### Scenario: Rogue move range
- **WHEN** the player selects a rogue PC and enters move-planning mode
- **THEN** up to 4 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Rogue attack targeting
- **WHEN** the player selects an attack direction for a rogue PC
- **THEN** only the single adjacent cell in that direction SHALL be highlighted as the attack target

#### Scenario: Rogue attack damage
- **WHEN** a rogue PC attack action resolves against a unit at the target cell
- **THEN** that unit's HP SHALL decrease by 1

#### Scenario: Rogue color
- **WHEN** a rogue PC is drawn on the grid
- **THEN** its fill color SHALL be orange (0xe67e22)
