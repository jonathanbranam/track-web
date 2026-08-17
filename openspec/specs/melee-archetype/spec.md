**App**: dungeon-tactics-solo

## Purpose

Defines the `melee` PC archetype in Dungeon Tactics Solo — a dedicated
capability split out of the shared `pc-archetypes` capability so melee's
requirement and its executable Gherkin scenarios (`features/melee.feature`)
live together. Move range, attack pattern, damage output, and visual
color are unchanged from `pc-archetypes`'s prior "Melee PC archetype"
requirement.

## Requirements

### Requirement: Melee PC archetype
The system SHALL support a `melee` PC archetype with move range 4, attack
damage 2, and attack targeting the single adjacent cell in the chosen
direction (range 1). The melee PC SHALL be rendered in blue (0x4a90e2).

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
