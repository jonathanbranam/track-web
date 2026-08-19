**App**: dungeon-tactics-solo

## MODIFIED Requirements

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
