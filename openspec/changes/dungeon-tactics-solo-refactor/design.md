## Context

The three files under `client-games/src/games/dungeon-tactics-solo/` retain prototype names (`Grid*`) and a monolithic model (`GridModel.ts`, 772 lines). One external consumer exists: `registry.ts` lazy-imports `GridRenderingGame`. No backend, API, or other client app is affected.

## Goals / Non-Goals

**Goals:**
- Rename `GridRenderingGame.tsx` → `DungeonTacticsGame.tsx` and `GridScene.ts` → `DungeonTacticsScene.ts`
- Split `GridModel.ts` into six focused modules with no cross-module circular dependencies
- Ensure Phaser has zero presence in any pure-game-logic file
- Update `registry.ts` to reference the renamed entry point

**Non-Goals:**
- No gameplay changes, new features, or performance optimization
- No changes to rendering logic, animation, or input handling
- No backend or other client app changes

## Decisions

### Module boundaries

`GridModel.ts` is split into six files. Dependency order (each file may only import from files above it):

| File | Exports | Imports from project |
|---|---|---|
| `types.ts` | All types and interfaces | _(none)_ |
| `map.ts` | `GRID_COLS`, `GRID_ROWS`, `SPAWNER_POSITIONS`, `INITIAL_MAP`, `initialState` | `types.ts` |
| `pathfinding.ts` | `astar`, `pathToAdjacentCell`, `inBounds` | `types.ts`, `map.ts` |
| `turn.ts` | `occupiedKey`, `structureKeys`, `isTowerImmune`, `endRound` | `types.ts`, `map.ts` |
| `pc.ts` | Planning helpers, `validMoveDests`, `computeMoveWaypoint`, `attackSquares`, `endPlayerTurn`, `resolvePcAction` | `types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts` |
| `npc.ts` | `findAdjacentStructure`, `damageStructure`, `computeNpcPlans`, `beginNpcPlayback`, `resolveNpcAction` | `types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts` |

`DungeonTacticsScene.ts` imports from `types.ts`, `map.ts`, `turn.ts` (for `isTowerImmune`), and `pc.ts` (for `validMoveDests`, `attackSquares`). No Phaser import appears in any of the six logic files.

`DungeonTacticsGame.tsx` imports from all six logic modules and `DungeonTacticsScene.ts`.

**Rationale for `isTowerImmune` in `turn.ts`:** It is used by both the NPC AI (`npc.ts`) and the Phaser scene (to render the immunity ring). Placing it in `npc.ts` would require the scene to import from the NPC module, which is semantically wrong. `turn.ts` is the natural shared layer for cross-cutting game-state queries.

**Rationale for `pathToAdjacentCell` as exported:** NPC pathfinding uses it directly; keeping it in `pathfinding.ts` alongside `astar` avoids a one-liner stub in `npc.ts`.

### No barrel / index file

A barrel `index.ts` would hide the module boundaries. Consumers import directly from the specific module they need.

### `registry.ts` update

The single changed import: `./dungeon-tactics-solo/GridRenderingGame` → `./dungeon-tactics-solo/DungeonTacticsGame`. The `default` export name inside the component file also changes from `GridRenderingGame` to `DungeonTacticsGame`, but since `registry.ts` uses a dynamic `import()` without destructuring, only the path matters.

## Risks / Trade-offs

- **Circular dependency risk** → Mitigation: strict layering (types → map → pathfinding/turn → pc/npc); enforced by the dependency table above. Any import that would create a cycle is a sign the function belongs in a lower layer.
- **Import churn** → `DungeonTacticsGame.tsx` will gain 5 additional import lines (currently one `./GridModel` import covers everything). This is expected and acceptable.
- **`computeNpcPlans` is private today** → It is called only from `initialState` and `endRound`. After the split, `initialState` (in `map.ts`) would need to call `computeNpcPlans` (in `npc.ts`), creating an upward dependency. Resolution: move `initialState` logic to accept `npcPlans` as a parameter computed by the caller, OR move `initialState` to `npc.ts`, OR accept that `map.ts` imports from `npc.ts` and break strict layering. **Preferred:** keep `initialState` in `map.ts` and export `computeNpcPlans` from `npc.ts`; callers (`DungeonTacticsGame.tsx`) call both and compose. `map.ts` gets a `buildInitialState` variant without npcPlans that `DungeonTacticsGame.tsx` completes.

  Simpler alternative: `initialState()` stays in `npc.ts` since it must call `computeNpcPlans`. `map.ts` exports only map data constants and `INITIAL_MAP`. **This is the chosen approach** — it eliminates the circular dependency cleanly.

## Open Questions

_(none — this is a mechanical refactor with no ambiguous design decisions)_
