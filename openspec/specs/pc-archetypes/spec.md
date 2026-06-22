**App**: dungeon-tactics-solo

## Purpose

Defines the four PC archetypes in Dungeon Tactics Solo. Each archetype has a distinct move range, attack pattern, damage output, and visual color. All PCs start with 3 HP.

## Requirements

### Requirement: Melee PC archetype
The system SHALL support a `melee` PC archetype with move range 4, attack damage 2, and attack targeting the single adjacent cell in the chosen direction (range 1). The melee PC SHALL be rendered in blue (0x4a90e2).

#### Scenario: Melee move range
- **WHEN** the player selects a melee PC and enters move-planning mode
- **THEN** up to 4 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Melee attack targeting
- **WHEN** the player selects attack direction for a melee PC
- **THEN** only the single adjacent cell in that direction SHALL be highlighted as the attack target

#### Scenario: Melee attack damage
- **WHEN** a melee PC's attack action resolves against a unit at the target cell
- **THEN** that unit's HP SHALL decrease by 2

#### Scenario: Melee color
- **WHEN** a melee PC is drawn on the grid
- **THEN** its fill color SHALL be blue (0x4a90e2)

### Requirement: Ranger PC archetype
The system SHALL support a `ranger` PC archetype with move range 3, attack damage 1, and a straight-line ranged attack that requires a minimum gap of 1 tile (cannot target adjacent cells) and passes over all units between the ranger and the target. The ranger PC SHALL be rendered in green (0x2ecc71). Ranger attacks SHALL display a projectile tween traveling from the ranger to the target.

#### Scenario: Ranger move range
- **WHEN** the player selects a ranger PC and enters move-planning mode
- **THEN** up to 3 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Ranger attack targeting excludes adjacent
- **WHEN** the player selects an attack direction for a ranger PC
- **THEN** the immediately adjacent cell in that direction SHALL NOT be a valid attack target

#### Scenario: Ranger attack targeting includes range 2+
- **WHEN** the player selects an attack direction for a ranger PC
- **THEN** cells at distance ≥ 2 in that direction SHALL be highlighted as valid attack targets

#### Scenario: Ranger attack passes over units
- **WHEN** a ranger PC attacks in a direction and units occupy cells between the ranger and the target
- **THEN** those intermediate units SHALL NOT be damaged; only the first unit/structure at distance ≥ 2 in that direction SHALL receive 1 damage

#### Scenario: Ranger projectile animation
- **WHEN** a ranger PC attack resolves during playback
- **THEN** a projectile tween SHALL travel visually from the ranger's tile to the target tile, passing over intermediate tiles

#### Scenario: Ranger color
- **WHEN** a ranger PC is drawn on the grid
- **THEN** its fill color SHALL be green (0x2ecc71)

### Requirement: Magic User PC archetype
The system SHALL support a `magic-user` PC archetype with move range 3, attack damage 1 per affected tile, and an area-of-effect attack: the player aims in a straight-line direction with a minimum 1-tile gap, and on resolution the AoE lands at distance 2 in that direction — damaging the center tile and its 4 orthogonally adjacent tiles (a cross pattern). The magic user PC SHALL be rendered in purple (0x9b59b6).

#### Scenario: Magic user move range
- **WHEN** the player selects a magic user PC and enters move-planning mode
- **THEN** up to 3 reachable orthogonal cells SHALL be highlighted as valid destinations

#### Scenario: Magic user attack targeting excludes adjacent
- **WHEN** the player selects an attack direction for a magic user PC
- **THEN** the immediately adjacent cell in that direction SHALL NOT be a valid attack target

#### Scenario: Magic user AoE center placement
- **WHEN** the player selects an attack direction for a magic user PC
- **THEN** the AoE center SHALL be fixed at distance 2 in that direction from the magic user's resolved position

#### Scenario: Magic user AoE cross damage
- **WHEN** a magic user PC attack action resolves
- **THEN** each unit or structure on the AoE cross (center + up to 4 adjacent tiles) SHALL receive 1 damage; tiles outside the grid boundary are ignored

#### Scenario: Magic user AoE highlight during planning
- **WHEN** the player selects an attack direction for a magic user PC
- **THEN** the 5 tiles of the AoE cross SHALL be highlighted distinctly (not just the center)

#### Scenario: Magic user color
- **WHEN** a magic user PC is drawn on the grid
- **THEN** its fill color SHALL be purple (0x9b59b6)

### Requirement: Rogue PC archetype
The system SHALL support a `rogue` PC archetype with move range 4, attack damage 1, and attack targeting the single adjacent cell in the chosen direction (range 1). The rogue PC SHALL be rendered in orange (0xe67e22). The rogue archetype is a stub for future enhancement; its attack behavior is melee-equivalent at 1 damage.

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

### Requirement: PC HP starts at 3
All PC units SHALL start each game with 3 HP and be removed from the board when their HP reaches 0.

#### Scenario: PC starts with 3 HP
- **WHEN** the game initializes
- **THEN** every PC unit SHALL have hp = 3

#### Scenario: PC removed at 0 HP
- **WHEN** a PC unit receives damage that reduces its HP to 0 or below
- **THEN** that PC SHALL be removed from the board immediately
