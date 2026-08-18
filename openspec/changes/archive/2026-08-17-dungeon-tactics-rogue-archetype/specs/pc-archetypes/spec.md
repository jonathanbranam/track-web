## REMOVED Requirements

### Requirement: Rogue PC archetype
**Reason**: Rogue is being split out of the shared `pc-archetypes`
capability into its own dedicated `rogue-archetype` capability, as part
of `dungeon-tactics-rogue-archetype`'s Gherkin-extraction work (phase 08a
of the dungeon-harness plan). The requirement text and behavior are
unchanged — only its capability home moves.
**Migration**: See `openspec/specs/rogue-archetype/spec.md`'s "Rogue PC
archetype" requirement, which carries this requirement forward verbatim
(plus new Gherkin scenario coverage). No runtime behavior changes; no
code migration is needed. Ranger and magic-user remain under
`pc-archetypes` for now.

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
