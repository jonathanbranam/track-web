**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: The engine derives what a unit can threaten from its definition
The engine SHALL expose a query returning every tile a unit's attack could land on from a given position, derived from the same targeting rules the enemy AI uses to select its targets. Hosts SHALL NOT reconstruct this set from definition fields themselves.

Where an attack's targeting range is wider than the tiles it ultimately resolves against, the query SHALL report the tiles the unit could select as targets, not only the tiles a single resolution would cover, so that a host showing "what can reach me" does not understate a unit's danger.

#### Scenario: A ranged unit threatens across its whole targeting band
- **WHEN** the threatened tiles are queried for a unit whose targeting range spans several tiles along a line
- **THEN** every tile in that band SHALL be reported, not only the tile at its minimum range

#### Scenario: The query reflects an edited definition
- **WHEN** a unit archetype's targeting range is changed and the threatened tiles are queried again
- **THEN** the reported tiles SHALL reflect the new range without any host-side recalculation

### Requirement: Changing an archetype's maximum HP reconciles living units
The engine SHALL expose the rule that reconciles units in play when their archetype's maximum HP changes: each affected unit's current HP SHALL be adjusted by the change in its archetype's maximum, and SHALL never be reduced below 1, so that lowering a maximum can never kill a unit outright. Hosts SHALL apply this rule through the engine rather than implementing it themselves.

#### Scenario: Raising a maximum raises current HP by the same amount
- **WHEN** an archetype's maximum HP is raised by N and the reconciliation is applied
- **THEN** every unit of that archetype SHALL have its current HP raised by N

#### Scenario: Lowering a maximum never kills a unit
- **WHEN** an archetype's maximum HP is lowered by more than a wounded unit's current HP
- **THEN** that unit SHALL be left with 1 HP and SHALL remain on the board

#### Scenario: Unaffected archetypes are untouched
- **WHEN** the reconciliation is applied after changing one archetype
- **THEN** units of every other archetype SHALL keep their current HP unchanged
