**App**: dungeon-tactics-solo

## Purpose

Defines a data-driven source of truth for Dungeon Tactics Solo unit behavior. Each archetype's
move range, max HP, attack damage, and attack footprint are described in a single `UnitDef` table
keyed by `unitType`, replacing per-archetype `switch`/equality branching. A single footprint
derivation drives both attack preview and resolution so previewed and damaged tiles always match,
and the admin override layer seeds its per-archetype defaults from this table.

## Requirements

### Requirement: Unit behavior is sourced from a data-defined definition table
The system SHALL describe each unit archetype's behavior in a single data structure (`UnitDef`) collected in one table keyed by archetype (`unitType`). The engine SHALL derive a unit's move range, max HP, attack damage, and attack footprint from that table. No `switch (unitType)` or `unitType === …` branching SHALL be used to determine unit stats or attack shape.

#### Scenario: Stats derived from the definition table
- **WHEN** the engine needs a unit's move range, max HP, or attack damage
- **THEN** the value SHALL come from that archetype's entry in the definition table

#### Scenario: No per-archetype branching for stats or attack shape
- **WHEN** the dungeon-tactics-solo logic modules are inspected
- **THEN** no `switch (unitType)` or `unitType === …` branch SHALL remain that determines a unit's stats or attack footprint

### Requirement: A single footprint derivation drives both attack preview and resolution
The set of tiles an attack covers SHALL be computed from one shared derivation based on the unit definition's propagation shape and targeting range. The attack preview (highlighted target tiles), the attack resolution (tiles that receive damage), **and the attack animation** SHALL all use this derivation, so no two of them can drift.

No client SHALL hardcode an archetype's range or attack shape for any purpose, including animation. Changing an archetype's targeting range SHALL therefore change what the animation depicts, without any client change.

#### Scenario: Preview and resolution cover the same tiles
- **WHEN** a unit's attack is previewed in a direction and then resolved in that same direction from the same origin
- **THEN** the tiles highlighted during preview SHALL be exactly the tiles considered for damage during resolution

#### Scenario: The animation depicts the tiles the attack resolves against
- **WHEN** an attack resolves and is animated
- **THEN** the tiles the animation depicts SHALL be the tiles the attack resolves against

#### Scenario: Editing a targeting range moves the animation with it
- **WHEN** an archetype's targeting range is edited and one of its units then attacks
- **THEN** the animation SHALL depict the attack at its new range, matching where damage lands

### Requirement: Existing archetypes behave identically after the refactor
The six existing archetypes SHALL be expressed as data whose values reproduce current behavior exactly, with no observable gameplay change.

#### Scenario: Move ranges unchanged
- **WHEN** a unit of each archetype enters move planning
- **THEN** melee and rogue SHALL offer up to 4 reachable tiles and ranger, magic-user, short-range, and long-range SHALL offer up to 3

#### Scenario: Attack damage unchanged
- **WHEN** an attack resolves against a unit
- **THEN** a melee attack SHALL deal 2 damage and every other archetype SHALL deal 1

#### Scenario: Max HP unchanged
- **WHEN** any unit is drawn
- **THEN** its max HP SHALL be 3 and it SHALL render 3 HP pips at full health

#### Scenario: Melee and rogue footprint
- **WHEN** a melee or rogue attack is aimed in a cardinal direction
- **THEN** only the single adjacent tile in that direction SHALL be the attack target

#### Scenario: Ranger footprint
- **WHEN** a ranger attack is aimed in a cardinal direction
- **THEN** the footprint SHALL be the straight line from distance 2 to the board edge, and resolution SHALL damage the first unit or structure in that line

#### Scenario: Magic-user footprint
- **WHEN** a magic-user attack is aimed in a cardinal direction
- **THEN** the footprint SHALL be the `plus` cross centered at distance 2 (center tile plus its 4 cardinal neighbors, clipped to the board), and each occupied tile SHALL receive 1 damage

#### Scenario: NPC archetype attacks unchanged
- **WHEN** the NPC AI selects and resolves an attack
- **THEN** a short-range NPC SHALL hit the first unit or structure at distance 1–2 in a cardinal direction, and a long-range NPC SHALL hit a unit or structure at distance ≥ 2 along a line that passes over intervening allied units

### Requirement: Definition table is the default source beneath the admin override layer
The session-scoped per-archetype stat overrides (admin mode) SHALL seed their default max HP and move range from the unit definition table rather than from independent constants, so per-archetype defaults have a single source of truth. The existing override behavior SHALL be preserved: stat reads remain delegated through the override accessors, and an admin edit SHALL still change the corresponding archetype's behavior.

#### Scenario: Defaults come from the definition table
- **WHEN** no admin override has been set for an archetype
- **THEN** its effective max HP and move range SHALL equal the values in the definition table

#### Scenario: Admin overrides still take effect
- **WHEN** an admin override changes an archetype's max HP or move range
- **THEN** the engine SHALL use the overridden value for that archetype, exactly as before this change

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
