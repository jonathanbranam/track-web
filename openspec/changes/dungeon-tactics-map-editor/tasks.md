## 1. Editor model (pure logic — no Phaser)

- [ ] 1.1 Add an editor-model module with `applyTool(map, tool, brush, tile) → ContentMap`: paint terrain, place/replace/remove object, toggle enemy-zone tile, toggle player-zone tile, erase
- [ ] 1.2 Add `resizeMap(map, cols, rows) → { map, dropped }`: grow fills new tiles with the region's first terrain; crop drops out-of-bounds objects/zone tiles and reports counts
- [ ] 1.3 Add `blankMap(region, size)` builder for new maps
- [ ] 1.4 Add a client mirror of `mapSchema` validation (grid matches size, in-bounds objects/zones, terrain ∈ region `terrainTypes`, `playerSpawnZone.length > PC count`) returning per-tile problems
- [ ] 1.5 Unit-test all of the above (no Phaser in the loop)

## 2. Phaser editor scene

- [ ] 2.1 Extract terrain/object draw routines shared with `DungeonTacticsScene` into a helper both scenes call (so editor and play render identically and both inherit sprites later)
- [ ] 2.2 Add `EditorScene`: renders a given `ContentMap` (terrain, objects, enemy/player-zone tints, grid lines, hover/brush cursor) and emits `onTilePointer({col,row}, isDrag)`; no tool/validation logic in the scene
- [ ] 2.3 Provide `scene.setMap(map)` and diff-redraw only changed tiles for drag performance; one scene instance per editor mount with teardown on unmount

## 3. React HUD + editor page

- [ ] 3.1 Add `MapEditorPage` at `/studio/dungeon-tactics/maps/:mapId`: owns `{ map, tool, brush }` state, mounts `EditorScene`, applies `applyTool` on tile events, pushes state to the scene
- [ ] 3.2 HUD components: terrain palette (from region `terrainTypes`), object palette (kind + optional hp), tool/brush selector, resize control, erase, and a save bar
- [ ] 3.3 Wire client pre-validation to disable Save and flag offending tiles when invalid

## 4. Map list + create/delete

- [ ] 4.1 Add `MapListPage` at `/studio/dungeon-tactics/maps`: list the region's maps in order with open/delete; a New-map action
- [ ] 4.2 New → build `blankMap`, `POST` via the content-write API, route to its `:mapId`
- [ ] 4.3 Delete → `DELETE` via the API; surface the last-map rejection
- [ ] 4.4 Flip the DT studio hub's Map-editor entry from "coming soon" to available

## 5. Client content API

- [ ] 5.1 Add `listMaps`/`createMap`/`saveMap`/`deleteMap` to the client content layer (`api.ts` / content store) calling the content-write endpoints
- [ ] 5.2 On save success, reload the stored map into editor state

## 6. PC placement fallback

- [ ] 6.1 Update PC placement (`pc.ts` / placement logic + content store) to derive from `playerSpawnZone` deterministically when `pcStartTiles` is absent; keep the `pcStartTiles`-present path byte-identical
- [ ] 6.2 Test: a map without `pcStartTiles` places PCs within its `playerSpawnZone`; the seed map places PCs on the same tiles as before

## 7. Docs + build

- [ ] 7.1 Update `llm-context.md` for the new map-editor feature area
- [ ] 7.2 Run `npm run build:games`; confirm zero TypeScript errors
- [ ] 7.3 Verify existing and new tests pass
