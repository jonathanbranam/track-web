## 1. Editor model (pure logic — no Phaser)

- [x] 1.1 Add an editor-model module with `applyTool(map, tool, brush, tile) → ContentMap`: paint terrain, place/replace/remove object, toggle enemy-zone tile, toggle player-zone tile, erase
- [x] 1.2 Add `resizeMap(map, cols, rows) → { map, dropped }`: grow fills new tiles with the region's first terrain; crop drops out-of-bounds objects/zone tiles and reports counts
- [x] 1.3 Add `blankMap(region, size)` builder for new maps
- [x] 1.4 Add a client mirror of `mapSchema` validation (grid matches size, in-bounds objects/zones, terrain ∈ region `terrainTypes`, `playerSpawnZone.length > PC count`) returning per-tile problems
- [x] 1.5 Unit-test all of the above (no Phaser in the loop)

## 2. Phaser editor scene

- [x] 2.1 Extract terrain/object draw routines shared with `DungeonTacticsScene` into a helper both scenes call (so editor and play render identically and both inherit sprites later)
- [x] 2.2 Add `EditorScene`: renders a given `ContentMap` (terrain, objects, enemy/player-zone tints, grid lines, hover/brush cursor) and emits `onTilePointer({col,row}, isDrag)`; no tool/validation logic in the scene
- [x] 2.3 Provide `scene.setMap(map)` and diff-redraw only changed tiles for drag performance; one scene instance per editor mount with teardown on unmount

## 3. React HUD + editor page

- [x] 3.1 Add `MapEditorPage` at `/studio/dungeon-tactics/maps/:mapId`: owns `{ map, tool, brush }` state, mounts `EditorScene`, applies `applyTool` on tile events, pushes state to the scene
- [x] 3.2 HUD components: terrain palette (from region `terrainTypes`), object palette (kind + optional hp), tool/brush selector, resize control, erase, and a save bar
- [x] 3.3 Wire client pre-validation to disable Save and flag offending tiles when invalid

## 4. Map list + create/delete

- [x] 4.1 Add `MapListPage` at `/studio/dungeon-tactics/maps`: list the region's maps in order with open/delete; a New-map action
- [x] 4.2 New → build `blankMap`, `POST` via the content-write API, route to its `:mapId`
- [x] 4.3 Delete → `DELETE` via the API; surface the last-map rejection
- [x] 4.4 Flip the DT studio hub's Map-editor entry from "coming soon" to available

## 5. Client content API

- [x] 5.1 Add `listMaps`/`createMap`/`saveMap`/`deleteMap` to the client content layer (`api.ts` / content store) calling the content-write endpoints
- [x] 5.2 On save success, reload the stored map into editor state

## 6. PC placement from the spawn zone

- [x] 6.1 Remove `pcStartTiles` from the map model: client `ContentMap` (`contentTypes.ts`), content store + getter (`contentStore.ts`), server `mapSchema` and its bounds/PC-count checks (`src/games/dungeon-tactics/map.ts`), and both seeds (`bundledMap.ts` + server seed)
- [x] 6.2 Update `initialState` (`npc.ts`) to seat the four PCs on the first N `playerSpawnZone` tiles in a stable order (sorted by `row`, then `col`)
- [x] 6.3 Test: every map (seed and authored) places the four PCs on distinct `playerSpawnZone` tiles, deterministically; no map carries `pcStartTiles`

## 7. Docs + build

- [x] 7.1 Update `llm-context.md` for the new map-editor feature area
- [x] 7.2 Run `npm run build:games`; confirm zero TypeScript errors
- [x] 7.3 Verify existing and new tests pass

## 8. Post-review enhancements

- [x] 8.1 Add a **Pan** tool: a `pan` member on `Tool` (`applyTool` no-op), a scene `setPanMode` that repurposes drag for camera scroll and hides the brush cursor, a HUD entry, and page wiring on tool change
- [x] 8.2 Allow **renaming** the open map (editable name in the editor header; persists on Save; client validation flags an empty name)
- [x] 8.3 Mint a short, opaque map id (8-char alphanumeric token via `node:crypto`) decoupled from the name; `blankMap` seeds a default player spawn zone so a new map passes validation on create
