**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: Unit type discriminator field
The `Unit` interface SHALL include a `unitType` field of type `PcType | NpcType` where `PcType = 'melee' | 'ranger' | 'magic-user' | 'rogue'` and `NpcType = 'short-range' | 'long-range'`. Every unit in the game state SHALL have a `unitType` value at all times.

#### Scenario: Unit type present on all units
- **WHEN** inspecting any `Unit` object in `GameState.units`
- **THEN** its `unitType` field SHALL be one of the six defined archetype strings

#### Scenario: PcType values
- **WHEN** a unit has `kind: 'pc'`
- **THEN** its `unitType` SHALL be one of `'melee'`, `'ranger'`, `'magic-user'`, or `'rogue'`

#### Scenario: NpcType values
- **WHEN** a unit has `kind: 'npc'`
- **THEN** its `unitType` SHALL be one of `'short-range'` or `'long-range'`

### Requirement: HP field on Unit
The `Unit` interface SHALL include an `hp: number` field. All units start at 3 HP. Units with `hp <= 0` are removed from `GameState.units` at the end of the action that caused the damage.

#### Scenario: HP present on all units
- **WHEN** inspecting any `Unit` object in `GameState.units`
- **THEN** its `hp` field SHALL be a positive integer

#### Scenario: Unit removed when HP reaches zero
- **WHEN** an attack action resolves and reduces a unit's `hp` to 0 or below
- **THEN** that unit SHALL no longer appear in `GameState.units` after the action resolves

### Requirement: HP pip rendering on unit tiles
The scene SHALL render HP pips on each unit's tile using the same visual approach as structures: small filled rectangles stacked bottom-to-top on the left edge of the tile. Each pip represents 1 HP; filled pips use the unit's archetype color; empty pips show as an outlined rectangle. All units have a max of 3 pips.

#### Scenario: Full HP rendering
- **WHEN** a unit has hp = 3
- **THEN** 3 filled pips SHALL be drawn on the left edge of its tile

#### Scenario: Partial HP rendering
- **WHEN** a unit has hp = 2
- **THEN** 2 filled pips and 1 empty outlined pip SHALL be drawn on the left edge of its tile

#### Scenario: Pip color matches archetype
- **WHEN** HP pips are rendered for a unit
- **THEN** filled pips SHALL use the unit's archetype fill color (e.g., blue for melee, green for ranger)

### Requirement: Per-archetype move range
The `validMoveDests` function in `pc.ts` SHALL use a per-archetype move range instead of the hardcoded limit of 2. A `moveRange(unit)` helper SHALL return the correct value for each archetype: melee → 4, ranger → 3, magic-user → 3, rogue → 4, short-range → 3, long-range → 3. NPC pathfinding in `npc.ts` SHALL also respect the archetype move range when stepping along a path.

#### Scenario: Move range varies by archetype
- **WHEN** `validMoveDests` is called for a unit
- **THEN** the BFS step limit SHALL equal `moveRange(unit)` for that unit's archetype

### Requirement: Initial unit archetype assignments
`initialState` in `npc.ts` SHALL assign a `unitType` and `hp: 3` to every starting unit. The four PCs SHALL be assigned one of each archetype (melee, ranger, magic-user, rogue). The five NPCs SHALL include a mix of short-range and long-range types.

#### Scenario: All starting units have archetype and HP
- **WHEN** the game initializes via `initialState()`
- **THEN** every unit in `GameState.units` SHALL have a non-null `unitType` and `hp = 3`

#### Scenario: All four PC archetypes present at start
- **WHEN** the game initializes
- **THEN** exactly one `melee`, one `ranger`, one `magic-user`, and one `rogue` PC SHALL be present
