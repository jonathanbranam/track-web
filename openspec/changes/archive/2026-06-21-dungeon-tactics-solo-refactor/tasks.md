## 1. Create pure-logic modules from GridModel.ts

- [x] 1.1 Create `types.ts` — extract all types and interfaces (`GameState`, `Unit`, `Cell`, `PcAction`, `NpcAction`, `PcPlan`, `Direction`, `TurnPhase`, `PlanningPhase`, `PathFilter`, `UnitKind`, `TerrainType`); no project imports
- [x] 1.2 Create `map.ts` — export `GRID_COLS`, `GRID_ROWS`, `SPAWNER_POSITIONS`, `INITIAL_MAP`; import only from `types.ts`
- [x] 1.3 Create `pathfinding.ts` — export `inBounds`, `astar`, `pathToAdjacentCell`; import only from `types.ts` and `map.ts`
- [x] 1.4 Create `turn.ts` — export `occupiedKey`, `structureKeys`, `isTowerImmune`; import only from `types.ts` and `map.ts` (note: `endRound` moved to `npc.ts` to avoid circular dependency — it calls `computeNpcPlans`)
- [x] 1.5 Create `pc.ts` — export all PC planning helpers (`selectUnit`, `cancelSelection`, `beginPlanMove`, `beginPlanAttack`, `setPlanMove`, `setPlanAttack`, `clearPlan`, `clearPlanMove`, `clearPlanAttack`), queries (`validMoveDests`, `computeMoveWaypoint`, `attackSquares`), and resolution (`endPlayerTurn`, `resolvePcAction`); import from `types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts` only
- [x] 1.6 Create `npc.ts` — export `findAdjacentStructure`, `damageStructure`, `computeNpcPlans`, `initialState`, `endRound`, `beginNpcPlayback`, `resolveNpcAction`; import from `types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts` only; no import from `pc.ts`

## 2. Rename and update Phaser scene

- [x] 2.1 Copy `GridScene.ts` to `DungeonTacticsScene.ts`; rename the class from `GridScene` to `DungeonTacticsScene`; update the `super()` scene key from `'GridScene'` to `'DungeonTacticsScene'`
- [x] 2.2 Update imports in `DungeonTacticsScene.ts` — replace the single `./GridModel` import with targeted imports from `types.ts`, `map.ts`, `turn.ts`, and `pc.ts`
- [x] 2.3 Confirm no import of `phaser` exists in any of the six logic modules (`types.ts`, `map.ts`, `pathfinding.ts`, `turn.ts`, `pc.ts`, `npc.ts`)

## 3. Rename and update React component

- [x] 3.1 Copy `GridRenderingGame.tsx` to `DungeonTacticsGame.tsx`; rename the default export from `GridRenderingGame` to `DungeonTacticsGame`
- [x] 3.2 Update imports in `DungeonTacticsGame.tsx` — replace the single `./GridModel` import with targeted imports from `types.ts`, `map.ts`, `pc.ts`, `npc.ts`, and `turn.ts`; replace `./GridScene` import with `./DungeonTacticsScene`
- [x] 3.3 Update the `scene()` helper inside `DungeonTacticsGame.tsx` to look up `'DungeonTacticsScene'` (was `'GridScene'`)
- [x] 3.4 Update the `buildConfig` scene reference from `GridScene` to `DungeonTacticsScene`

## 4. Update registry and clean up

- [x] 4.1 Update `client-games/src/games/registry.ts` — change the lazy import path from `./dungeon-tactics-solo/GridRenderingGame` to `./dungeon-tactics-solo/DungeonTacticsGame`
- [x] 4.2 Delete `GridModel.ts`, `GridScene.ts`, and `GridRenderingGame.tsx` once the new files are confirmed correct

## 5. Verify

- [x] 5.1 Run `npm run build -w client-games` and confirm zero TypeScript errors
- [X] 5.2 Load the dungeon-tactics-solo game in the browser and verify gameplay is identical to pre-refactor (units move, attacks work, NPC turn plays back, reset works)
