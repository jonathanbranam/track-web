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
- **THEN** it SHALL export all PC planning helpers (`selectUnit`, `cancelSelection`, `beginPlanMove`, `beginPlanAttack`, `setPlanMove`, `setPlanAttack`, `clearPlan`, `clearPlanMove`, `clearPlanAttack`), queries (`validMoveDests`, `computeMoveWaypoint`, `attackSquares`), and resolution functions (`endPlayerTurn`, `resolvePcAction`)
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
