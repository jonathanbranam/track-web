**App**: dungeon-tactics-solo

## MODIFIED Requirements

### Requirement: Initial unit archetype assignments
`initialState` in `npc.ts` SHALL assign a `unitType` and `hp: 3` to every starting unit.
The four PCs SHALL be assigned one of each archetype (melee, ranger, magic-user, rogue).
The five NPCs SHALL include a mix of short-range and long-range types. `initialState`
SHALL begin the game in the `placement` phase (turn 0) with the four PCs positioned at
their fixed default spawn tiles from the authored placement map — melee `(4,5)`, ranger
`(6,5)`, magic-user `(10,5)`, rogue `(13,5)` — rather than the legacy bottom-row
coordinates and the `player` phase. The `TurnPhase` type SHALL include `placement` in
addition to `player`, `pc-playback`, and `npc-playback`.

#### Scenario: All starting units have archetype and HP
- **WHEN** the game initializes via `initialState()`
- **THEN** every unit in `GameState.units` SHALL have a non-null `unitType` and `hp = 3`

#### Scenario: All four PC archetypes present at start
- **WHEN** the game initializes
- **THEN** exactly one `melee`, one `ranger`, one `magic-user`, and one `rogue` PC SHALL be present

#### Scenario: Game begins in the placement phase with PCs at fixed spawn tiles
- **WHEN** the game initializes via `initialState()`
- **THEN** `GameState.phase` SHALL be `placement`
- **AND** the melee PC SHALL be at `(4,5)`, the ranger at `(6,5)`, the magic-user at `(10,5)`, and the rogue at `(13,5)`
