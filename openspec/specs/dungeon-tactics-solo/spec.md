**App**: dungeon-tactics-solo

## Purpose

Defines requirements for the Dungeon Tactics Solo game: a standalone single-player entry in the games registry backed by the grid-rendering implementation.

## Requirements

### Requirement: Dungeon Tactics Solo entry in games registry
The system SHALL include a `dungeon-tactics-solo` entry in `registry.ts` with name "Dungeon Tactics", description matching the game's turn-based tactical nature, and category `single-player`. The entry SHALL have a `mount` component pointing to the game component (no lobby, no `lobbySlug`). The entry SHALL appear before the `prototypes` entry in the `games` array.

#### Scenario: Dungeon Tactics Solo appears on the games home page
- **WHEN** a user opens the games home page at `/`
- **THEN** a card for "Dungeon Tactics" with category `single-player` is listed and tappable

#### Scenario: Tapping the card navigates directly into the game
- **WHEN** a user taps the Dungeon Tactics card
- **THEN** the app navigates to `/game/dungeon-tactics-solo` and the game component mounts without a lobby

#### Scenario: Game component mounts with standard chrome
- **WHEN** a user navigates to `/game/dungeon-tactics-solo`
- **THEN** the game page renders with the standard back link ("← Games" to `/`) and the game title in the header

### Requirement: Game source at dungeon-tactics-solo directory
The system SHALL locate the Dungeon Tactics Solo source files at `client-games/src/games/dungeon-tactics-solo/`. The component and scene files (`DungeonTacticsGame.tsx`, `DungeonTacticsScene.ts`) reside in this directory along with the six logic modules (`types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts`, `pc.ts`, `npc.ts`).

#### Scenario: Build succeeds after directory move
- **WHEN** the source files are at the new path and the registry lazy-import is updated
- **THEN** `npm run build` completes without errors

#### Scenario: Game functions identically after move
- **WHEN** a user plays the game at `/game/dungeon-tactics-solo`
- **THEN** all gameplay (grid rendering, move/attack planning, PC playback, NPC playback, round reset) behaves identically to the former prototype

### Requirement: Game files named for the game, not the prototype
All source files under `client-games/src/games/dungeon-tactics-solo/` SHALL be named to reflect the game "Dungeon Tactics" rather than the generic prototype prefix "Grid". The two Phaser/React entry points SHALL be named `DungeonTacticsScene.ts` and `DungeonTacticsGame.tsx`.

#### Scenario: Entry point file names
- **WHEN** listing files under `dungeon-tactics-solo/`
- **THEN** no file whose name begins with `Grid` SHALL exist

#### Scenario: Registry import uses new name
- **WHEN** `registry.ts` lazy-imports the game component
- **THEN** the import path SHALL reference `DungeonTacticsGame`, not `GridRenderingGame`

### Requirement: Game logic split into focused modules
The game logic previously in `GridModel.ts` SHALL be distributed across six dedicated modules: `types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts`, `pc.ts`, and `npc.ts`. Each module SHALL contain only the exports described in the design.

#### Scenario: Types module
- **WHEN** inspecting `types.ts`
- **THEN** it SHALL export all shared types and interfaces (`GameState`, `Unit`, `Cell`, `PcAction`, `NpcAction`, `PcPlan`, `Direction`, `TurnPhase`, `PlanningPhase`, `PathFilter`, `UnitKind`, `TerrainType`) and SHALL import nothing from other project files

#### Scenario: Map module
- **WHEN** inspecting `map.ts`
- **THEN** it SHALL export `GRID_COLS`, `GRID_ROWS`, `SPAWNER_POSITIONS`, and `INITIAL_MAP`
- **THEN** it SHALL NOT export `initialState` (moved to `npc.ts`)

#### Scenario: Pathfinding module
- **WHEN** inspecting `pathfinding.ts`
- **THEN** it SHALL export `inBounds`, `astar`, and `pathToAdjacentCell`
- **THEN** it SHALL import only from `types.ts` and `map.ts`

#### Scenario: Turn module
- **WHEN** inspecting `turn.ts`
- **THEN** it SHALL export `occupiedKey`, `structureKeys`, `isTowerImmune`, and `endRound`
- **THEN** it SHALL import only from `types.ts` and `map.ts`

#### Scenario: PC module
- **WHEN** inspecting `pc.ts`
- **THEN** it SHALL export all PC planning helpers (`selectUnit`, `cancelSelection`, `beginPlanMove`, `beginPlanAttack`, `setPlanMove`, `setPlanAttack`, `clearPlan`, `clearPlanMove`, `clearPlanAttack`), queries (`validMoveDests`, `computeMovePath`, `attackSquares`), and resolution functions (`endPlayerTurn`, `resolvePcAction`)
- **THEN** it SHALL NOT import from `npc.ts` or any Phaser package

#### Scenario: NPC module
- **WHEN** inspecting `npc.ts`
- **THEN** it SHALL export `findAdjacentStructure`, `damageStructure`, `computeNpcPlans`, `initialState`, `beginNpcPlayback`, and `resolveNpcAction`
- **THEN** it SHALL NOT import from `pc.ts` or any Phaser package

### Requirement: Phaser isolated to the scene file
No Phaser import SHALL appear in `types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts`, `pc.ts`, or `npc.ts`. Phaser SHALL be imported only in `DungeonTacticsScene.ts`.

#### Scenario: Game logic files are Phaser-free
- **WHEN** grepping for `from 'phaser'` or `import * as Phaser` across the six logic modules
- **THEN** zero matches SHALL be found

#### Scenario: Scene file retains Phaser
- **WHEN** inspecting `DungeonTacticsScene.ts`
- **THEN** it SHALL import from `phaser` as it did before

### Requirement: Behavior is unchanged after refactor
The refactor SHALL be purely structural. All game rules, animations, input handling, and state transitions SHALL behave identically to the pre-refactor implementation.

#### Scenario: No logic changes
- **WHEN** comparing the exported function bodies before and after the refactor
- **THEN** no function's logic SHALL have changed; only its file location and import paths SHALL differ

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
The `validMoveDests` function in `pc.ts` SHALL use a per-archetype move range instead of any hardcoded limit. A `moveRange(unit)` helper SHALL return the correct value for each archetype: melee → 4, ranger → 3, magic-user → 3, rogue → 4, short-range → 3, long-range → 3. NPC pathfinding in `npc.ts` SHALL also respect the archetype move range when stepping along a path.

#### Scenario: Move range varies by archetype
- **WHEN** `validMoveDests` is called for a unit
- **THEN** the BFS step limit SHALL equal `moveRange(unit)` for that unit's archetype

### Requirement: PC move path planning via A*
When the player selects a destination for a PC's move, the game SHALL compute an A* path from the unit's current position to that cell, avoiding all structures and units other than the moving unit. The plan SHALL store the exact ordered step sequence. While the player is choosing a destination, the candidate route SHALL be rendered as a multi-segment polyline through every intermediate cell. The move SHALL commit immediately on selection (no deferred end-of-turn PC playback step); as it commits, the move SHALL be animated, visiting each cell in path order at a consistent per-tile speed.

#### Scenario: A* path avoids obstacles
- **WHEN** a player selects a move destination for a PC
- **THEN** the planned path SHALL route around all structures and all other units present at planning time, never passing through an occupied cell

#### Scenario: Path rendered as polyline
- **WHEN** a PC has a candidate move route shown
- **THEN** the planning overlay SHALL draw the route as a connected multi-segment line through each step, not as a straight diagonal or a single-elbow shortcut

#### Scenario: Animation follows path on immediate commit
- **WHEN** a PC move commits
- **THEN** the unit's animation SHALL step through each cell in the planned path in sequence as the move takes effect, with no separate batched playback phase

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
