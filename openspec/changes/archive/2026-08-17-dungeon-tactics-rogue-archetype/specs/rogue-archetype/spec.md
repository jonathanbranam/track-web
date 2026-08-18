## Purpose

Defines the `rogue` PC archetype in Dungeon Tactics Solo — a dedicated
capability split out of the shared `pc-archetypes` capability so rogue's
requirement and its executable Gherkin scenarios (`features/rogue.feature`)
live together. Move range, attack pattern, damage output, and visual
color are unchanged from `pc-archetypes`'s prior "Rogue PC archetype"
requirement.

## ADDED Requirements

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
