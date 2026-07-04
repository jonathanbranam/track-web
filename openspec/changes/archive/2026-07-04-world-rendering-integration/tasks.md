## 1. Map data & pathfinding

- [x] 1.1 Extend `GameMap` (`script.ts`) with a walkable-tile grid and a named-location table (coordinate lookup by name), keeping the existing `sceneId`/`entities` fields
- [x] 1.2 Author at least one placeholder map as a hand-written Tiled-shaped JSON file under `client-talks/public/rpg/maps/` (small, per Phase 2's own scope), covering at least two named locations and one non-walkable tile
- [x] 1.3 Implement `pathfinding.ts`: A* over a map's walkable-tile grid, resolving a named location or another entity's position to a target coordinate; returns `null`/empty when no path exists
- [x] 1.4 Add a second placeholder area/map (or a second named region within the same map) to exercise `enterScene` switching between two distinct areas

## 2. Action & resting-state extensions

- [x] 2.1 Add `walkTo` to the `Action` union (`{ type: 'walkTo'; entity: string; target: string }`) and to `applyAction` in `precompute.ts`, calling into `pathfinding.ts` to resolve the final position headlessly
- [x] 2.2 Add `enterScene` to the `Action` union (`{ type: 'enterScene'; scene: string; at?: string }`) and to `applyAction`, updating the world model's active scene/area and entity position if `at` is given
- [x] 2.3 Add a `camera` field to `RestingState` (position, zoom) and compute it in `snapshotRestingState` (e.g. centered on the last-moved or protagonist entity) so `DirectorEngine` checkpoints carry camera data without reshaping existing fields
- [x] 2.4 Update the Phase 1 proving script (or add a new Phase 2 script) to include at least one `walkTo` and one `enterScene` action alongside existing action types

## 3. Phaser scene: tilemap & entity rendering

- [x] 3.1 Build out `TalkRpgScene.ts` (currently an empty stub): load the active map's tile grid and entity data on `create()`
- [x] 3.2 Implement the tile-rendering lookup: map each tile-grid cell to a solid-colored `Phaser.GameObjects.Rectangle` at its grid position (no tileset image)
- [x] 3.3 Implement the `EntityView` module: draws a colored rectangle + directional facing notch per entity, given `{ position, facing, animationState }`; toggles a bob/offset tween between `idle` and `walk` states
- [x] 3.4 Implement the resting-state-to-scene apply function: given a `RestingState`, sets every entity's `EntityView` position/facing/animation and the camera's position/zoom directly, with no tween — this is what `snapTo`/`back`/`skipTo` drive
- [x] 3.5 Implement the Phaser camera: `startFollow` on the active entity during live playback; re-armed (possibly on a different entity) and position/zoom set directly whenever a resting state is applied

## 4. Action executors: walk, walkTo, enterScene

- [x] 4.1 Replace the Phase 1 `WalkExecutor`'s no-op-on-Phaser stepping with real tile-by-tile movement on the live `TalkRpgScene` (via `EntityView`), while keeping the same final position `applyAction` computes
- [x] 4.2 Implement a `WalkToExecutor`: resolves the path via `pathfinding.ts` at execution time, then walks it step-by-step identically to `WalkExecutor`
- [x] 4.3 Implement an `EnterSceneExecutor`: switches the active area's tile/entity/camera data in place on `TalkRpgScene`, without a Phaser scene-manager transition
- [x] 4.4 Wire the new executors into `createExecutor` (`executors.ts`) alongside the existing `walk`/`pause`/dialogue executors

## 5. Experience wiring

- [x] 5.1 Mount `PhaserGame`/`TalkRpgScene` from `RpgExperience.tsx` in place of the Phase 1 `PlaceholderStage` DOM renderer, wired to the same `useDirector()` resting-state contract
- [x] 5.2 Confirm existing input bindings (`next`/`back`/`pause`/`resume` via keyboard, click, and the on-screen control bar) continue to work unchanged against the new Phaser-backed renderer

## 6. Tests

- [x] 6.1 Unit tests for `pathfinding.ts`: reaches every named location and NPC-adjacent tile on the placeholder map's walkable grid; returns no path for an intentionally unreachable test tile
- [x] 6.2 Unit tests extending `precompute.test.ts`: a script using `walk`/`walkTo`/`enterScene` produces resting-state snapshots with the expected final entity position/facing/scene and camera fields
- [x] 6.3 Unit test: running the same `walkTo` action through the headless precompute pass and through the live `WalkToExecutor`'s path-resolution step produces identical final positions
- [x] 6.4 Verify `directorEngine.test.ts`'s existing `back()`/`skipTo()` tests still pass unchanged now that `RestingState` carries a `camera` field

## 7. Verification

- [x] 7.1 Run `npm run test` and confirm all tests pass, including the extended `client-talks` suite
- [x] 7.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [ ] 7.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): the protagonist walks the placeholder town on rails including one pathfound `walkTo`, `enterScene` switches areas cleanly, and `back()`/`skipTo()` snap the camera/entities instantly with no replay artifact — matching Phase 2's milestone in `phased-implementation.md`
