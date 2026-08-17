## REMOVED Requirements

### Requirement: Melee PC archetype
**Reason**: Melee is being split out of the shared `pc-archetypes`
capability into its own dedicated `melee-archetype` capability, as part
of `dungeon-tactics-melee-archetype`'s Gherkin-extraction work (phase 08a
of the dungeon-harness plan). The requirement text and behavior are
unchanged — only its capability home moves.
**Migration**: See `openspec/specs/melee-archetype/spec.md`'s "Melee PC
archetype" requirement, which carries this requirement forward verbatim
(plus new Gherkin scenario coverage). No runtime behavior changes; no
code migration is needed. Ranger, magic-user, and rogue remain under
`pc-archetypes` for now.

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
