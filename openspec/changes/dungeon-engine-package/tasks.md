## 1. Create the package

- [x] 1.1 Create `packages/dungeon-engine/` with a `package.json` mirroring
      `packages/auth` — name `@repo/dungeon-engine`, `private: true`,
      `type: module`, `main` and `exports` pointing at `./src/index.ts`, no
      build script, no dependencies
- [x] 1.2 Add `packages/dungeon-engine` to `workspaces` in the root
      `package.json`
- [x] 1.3 Add `@repo/dungeon-engine: "*"` to `client-games/package.json`
      dependencies and run an install so the workspace link exists

## 2. Move the pure rules modules

- [x] 2.1 Move `types.ts`, `turn.ts`, `pc.ts`, `npc.ts`, `pathfinding.ts`,
      `attackFootprint.ts`, `unitDefs.ts`, `bundledMap.ts`, and
      `contentTypes.ts` from `client-games/src/games/dungeon-tactics-solo/`
      into `packages/dungeon-engine/src/`, keeping their relative imports
      intact and making no logic edits
- [x] 2.2 Move their tests — `attackFootprint.test.ts`, `npc.test.ts`,
      `undo.test.ts`, `unitDefs.test.ts`, `placement.test.ts` — alongside them

## 3. Split the definition store

- [x] 3.1 Move `defStore.ts` into `packages/dungeon-engine/src/`, keeping the
      module-level store, `getDef`/`getMaxHp`/`getMoveRange`/`getAllDefs`,
      `setDef`/`setMaxHp`/`setMoveRange`, `clampDef`, `withMinRange`/
      `withMaxRange`, `diffDefs`, `applyLoaded`, and `reset`
- [x] 3.2 Remove `loadFromServer`, `loadScenario`, `loadedScenario`, the
      `localStorage` active-scenario helpers, and the `client-games/src/api`
      import from the moved module; export `applyLoaded` so a host can drive it
- [x] 3.3 Create `client-games/src/games/dungeon-tactics-solo/defStoreLoader.ts`
      holding the removed logic verbatim — `loadFromServer`, `loadScenario`,
      `loadedScenario`, the `localStorage` pointer, and `GAME_SLUG` — importing
      the package for `applyLoaded`
- [x] 3.4 Split `defStore.test.ts`: apply/clamp/diff/read assertions stay with
      the package; fetch, fallback, and active-scenario-memory assertions move
      to a loader test in `client-games`

## 4. Split the content store

- [x] 4.1 Move `contentStore.ts` into `packages/dungeon-engine/src/`, keeping
      `deserialize`, the active-content state, `gridCols`/`gridRows`/
      `boardCells`, and the spawn-zone getters
- [x] 4.2 Remove `loadFromServer` and the `client-games/src/api` import from the
      moved module; expose the apply path a host calls after fetching
- [x] 4.3 Create
      `client-games/src/games/dungeon-tactics-solo/contentStoreLoader.ts`
      holding the removed fetch/fallback logic verbatim
- [x] 4.4 Split `contentStore.test.ts` along the same line — deserialize and
      getter assertions with the package, fetch/fallback assertions with the
      loader

## 5. Define the public surface

- [x] 5.1 Write `packages/dungeon-engine/src/index.ts` re-exporting the public
      surface: the types, `initialState`, `beginPlanMove`/`setPlanMove`/
      `resolvePcAction` and the rest of the PC action API, `validMoveDests`,
      `attackSquares`, `remainingMove`, `hasAttacked`, `undoLastMove`,
      `computeNpcTurns`, `resolveNpcAction`, `endRound`, `attackFootprint`,
      the pathfinding helpers, the bundled `unitDefs` table, and both stores'
      getters/setters/appliers
- [x] 5.2 Confirm no module inside the package imports from `client-games`

## 6. Update the consumers

- [x] 6.1 Update `DungeonTacticsScene.ts`, `EditorScene.ts`, `boardRender.ts`,
      `DungeonTacticsGame.tsx`, `ScenarioEditor.tsx`, `MapSelectDialog.tsx`,
      `editorModel.ts`, `mapBounds.ts`, and `hud/` to import from
      `@repo/dungeon-engine`, and to call the new loader modules where they
      previously called `loadFromServer`/`loadScenario`
- [x] 6.2 Update the studio pages — `UnitDesignerPage.tsx`, `MapEditorPage.tsx`,
      `MapEditorHud.tsx`, `MapListPage.tsx` — and
      `unitDesignerPersistence.test.ts` the same way
- [x] 6.3 Update the Gherkin step definitions under
      `client-games/src/games/dungeon-tactics-solo/features/steps/` to import
      from the package
- [x] 6.4 Update `editorModel.test.ts` and any remaining test in `client-games`
      that imported a moved module

## 7. Prove it runs in Node

- [x] 7.1 Add a node-environment test in `packages/dungeon-engine` that imports
      only the barrel, builds a board, places PCs and NPCs, resolves moves and
      attacks for both sides, and ends a round — asserting the same results the
      browser host produces
- [x] 7.2 Assert in that test that the package touches no browser global, so
      reintroducing `fetch`/`localStorage`/DOM access inside the package fails
      the suite
- [x] 7.3 Add `packages/dungeon-engine/src/**/*.test.ts` to `include` in the
      root `vitest.config.mts`

## 8. Verify

- [x] 8.1 `npm test` passes, including every moved and split test
- [x] 8.2 `npm run test:dungeon-tactics` passes (the Gherkin suite is unchanged
      apart from step-definition imports)
- [x] 8.3 `npm run build:games` completes with zero TypeScript errors
- [x] 8.4 Play the game manually: start a match, move and attack with a PC,
      let the enemy phase resolve, and confirm behavior is unchanged
- [x] 8.5 Open both studio editors — map editor and unit designer — and confirm
      loading, editing, saving, and scenario selection still work, including
      the remembered active-scenario selection across a reload
