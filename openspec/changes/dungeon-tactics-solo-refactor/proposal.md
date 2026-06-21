## Why

The dungeon-tactics-solo game was ported from a grid-rendering prototype and retains its prototype naming (`Grid*`) and a monolithic model file (`GridModel.ts`, 772 lines) that mixes unrelated concerns — types, map data, pathfinding, PC planning, NPC AI, and turn resolution — making it hard to navigate and extend. This refactor renames files to match the actual game name and splits the model into focused modules.

## What Changes

- Rename `GridRenderingGame.tsx` → `DungeonTacticsGame.tsx` (React orchestration component)
- Rename `GridScene.ts` → `DungeonTacticsScene.ts` (Phaser scene)
- Split `GridModel.ts` (772 lines) into focused modules:
  - `types.ts` — all shared types and interfaces (`GameState`, `Unit`, `Cell`, `PcAction`, `NpcAction`, `PcPlan`, `Direction`, `TurnPhase`, `PlanningPhase`, `PathFilter`)
  - `map.ts` — map constants, `INITIAL_MAP`, `SPAWNER_POSITIONS`, `initialState()`
  - `pathfinding.ts` — `astar()` and helpers (`inBounds`, `pathToAdjacentCell`)
  - `pc.ts` — PC planning helpers (`selectUnit`, `cancelSelection`, `beginPlanMove`, `beginPlanAttack`, `setPlanMove`, `setPlanAttack`, `clearPlan`, `clearPlanMove`, `clearPlanAttack`), queries (`validMoveDests`, `attackSquares`, `computeMoveWaypoint`), and resolution (`endPlayerTurn`, `resolvePcAction`)
  - `npc.ts` — NPC AI (`computeNpcPlans`), resolution (`beginNpcPlayback`, `resolveNpcAction`), and structure helpers (`isTowerImmune`, `damageStructure`, `findAdjacentStructure`)
  - `turn.ts` — shared turn transitions (`endRound`) and cross-cutting state queries (`occupiedKey`, `structureKeys`)
- Update all internal imports across the six new files and the renamed React/Phaser files
- No behavioral changes; this is a pure structural refactor

## Capabilities

### New Capabilities
- `dungeon-tactics-solo`: File structure and module organization for the dungeon-tactics-solo game

### Modified Capabilities
_(none — no requirement changes, purely implementation restructuring)_

## Impact

- All files under `client-games/src/games/dungeon-tactics-solo/` — deleted and replaced
- Any import of `GridRenderingGame` or `GridModel` in the games entry point or index files must be updated
- No API, backend, or other client app changes
