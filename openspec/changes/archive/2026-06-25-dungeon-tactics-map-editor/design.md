## Context

The play board is rendered by `DungeonTacticsScene.ts` (Phaser) from the content
store's loaded `ContentMap`. The store's client shapes live in `contentTypes.ts`
(`ContentMap` has `size`, `terrain`, `objects`, `enemySpawnZone`, `playerSpawnZone`,
and a legacy `pcStartTiles` that this change removes). The `dungeon-tactics-sprite-rendering` change is
adding a terrain **tileset** and sprite pipeline to that scene — the editor should
ride on the same rendering so authored boards look like played boards.

This change consumes the `dungeon-tactics-content-write-api` endpoints
(create/update/delete map) and lives under the `games-studio-shell` `/studio` area.

The design constraints come straight from the user and `content_model.md`:
- Board size is per-map and adjustable (`4×4`–`16×16`).
- Terrain palette is the region's own `terrainTypes`.
- `playerSpawnZone` is a designer-drawn, **possibly non-contiguous** set of tiles;
  players place PCs anywhere within it at encounter start (so it must exceed the PC
  count). It replaces fixed PC start slots.

## Goals / Non-Goals

**Goals:**

- A working map editor: paint terrain, place/remove objects, paint enemy and player
  spawn zones, resize, erase, and create/delete maps — saved through the write API.
- A clean **React-owns-the-model / Phaser-renders** seam so all mutation logic is
  pure, testable TypeScript and the canvas inherits the game's (eventual sprite)
  rendering.
- Every map is playable with no fixed start tiles: PC placement derives from
  `playerSpawnZone`, and `pcStartTiles` is removed from the model.

**Non-Goals:**

- Region authoring; encounter/wave/condition editing; the test sandbox.
- Interactive in-match PC placement UI (players clicking where to stand) — derived
  deterministic placement is enough here; the interactive flow is a later change.
- Reworking the play scene beyond extracting shared rendering.

## Decisions

### The React ↔ Phaser seam: React is the source of truth

```
  React state: { map: ContentMap, tool: Tool, brush: TerrainType|ObjectKind|Zone }
        │  (1) pass current map ───────────────►  Phaser EditorScene
        │                                              renders terrain/objects/zones
        │  ◄── (2) onTilePointer({col,row}, drag) ─────┘   (no game logic in scene)
        ▼
  (3) applyTool(map, tool, brush, {col,row}) → next map   ← pure function
        │
        └─ setState(next) → (1) re-render
```

The Phaser `EditorScene` knows nothing about tools or validation: it draws the map
it's given and forwards pointer events as tile coordinates (with a drag flag so
click-drag paints a stroke). Every mutation is a **pure function**
`applyTool(map, tool, brush, tile) → ContentMap`, unit-tested with no Phaser in the
loop. This keeps the hard-to-test surface (Phaser) trivial and the easy-to-test
surface (model) comprehensive.

### Why Phaser for the canvas, not DOM/SVG

The game is gaining a sprite tileset (`dungeon-tactics-sprite-rendering`). Rendering
the editor through the same Phaser scene means authored terrain/objects look exactly
as they will in play, and the editor inherits sprites automatically when that change
lands. A DOM/SVG grid would diverge visually and duplicate rendering. The cost — Phaser
isn't ideal for form controls — is paid only by the canvas; all controls are ReactDOM
overlaid on top.

### Shared rendering with the play scene

Extract the terrain/object draw routines used by `DungeonTacticsScene` into a shared
helper the `EditorScene` also calls, rather than forking a second renderer. The
editor adds **edit-only overlays** (zone tints, grid lines, hover highlight, brush
cursor) on top. If `sprite-rendering` hasn't landed yet, both scenes use the current
flat-rect terrain; when it lands, both upgrade together.

### Tools and the brush model

A single `tool` selector with a contextual `brush`:

| Tool | Brush | Effect on click/drag |
|---|---|---|
| Terrain | a `terrainType` from the region | set the tile's terrain |
| Object | a `kind` (+ `hp?` for structures) | place/replace an object on the tile |
| Enemy zone | — | toggle the tile in `enemySpawnZone` |
| Player zone | — | toggle the tile in `playerSpawnZone` |
| Erase | — | remove an object / unset zone membership on the tile |
| Pan | — | drag scrolls the camera; paints nothing |

The paint tools keep tap-to-paint and drag-to-paint-a-stroke; a single-finger drag
on a paint tool paints rather than pans (the canvas is wall-to-wall board, so there
is no empty space to grab). Scrolling is therefore its own **Pan tool**: a mode flag
on the scene (`setPanMode`) that repurposes drag for camera scroll and suppresses the
brush cursor. Zoom (wheel) stays live in every mode. `applyTool` treats `pan` as a
no-op so the React seam is unchanged.

Resize is a separate control (numeric cols/rows): grow fills new tiles with the
region's first terrain type; crop drops out-of-bounds objects and zone tiles, warning
how many were removed.

### Player spawn zone is the placement authority; `pcStartTiles` is removed

The editor authors `playerSpawnZone` tile-by-tile (non-contiguous allowed); there are
no per-archetype start tiles. `pcStartTiles` is removed from the model entirely — the
client `ContentMap`, the server `mapSchema`, and the bundled seed all drop it. At play
time, `initialState` seats the four PCs on the **first N tiles of `playerSpawnZone`** in
a stable order (sorted by `row`, then `col`). The exact tiles don't matter: play opens in
the `placement` phase where the player repositions every PC freely within the zone, so the
derived positions are only a starting arrangement — the algorithm just needs to be
deterministic and seat distinct, in-zone tiles. The seed map is no longer special; it
seats PCs from its own zone like any authored map. The richer "players choose their tiles
at encounter start" interaction is a separate future change; this one only guarantees
playability. Client validation enforces `playerSpawnZone.length > PC count` (mirroring the
server schema) before save, so there are always enough tiles to seat the party.

### Validation: client mirrors, server decides

The editor pre-validates against a client mirror of `mapSchema` for inline feedback
(non-empty name, grid matches size, zones/objects in bounds, terrain ∈ region enum,
zone big enough), disabling Save and flagging offending tiles when invalid. The
**server endpoint is the authority** — Save round-trips through the write API and the
editor reloads the stored map, so a client/server schema drift surfaces as a save
error, never silent corruption.

### Save / new / delete / rename flow

- **Save** → `PUT /content/maps/:id`; on success reload the returned map into state.
- **New** → build a blank `ContentMap` (region's first terrain, no objects, a default
  player spawn zone large enough to pass validation, a default size e.g. `8×8`),
  `POST` it, then route to its `:mapId`.
- **Delete** → `DELETE /content/maps/:id` (the API guards the last-map case); on
  success return to the map list.
- **Rename** → edit the map's `name` in the editor; it persists on the next Save.
  The id never changes on update.

### Map id is a minted token, decoupled from the name

`createMap` mints a short, opaque id (8 lowercase-alphanumeric chars via
`node:crypto`, re-rolled on the rare collision) rather than slugifying the name. This
keeps ids stable across renames, avoids name-collision suffixes, and lets two maps
share a display name. `updateMap` keeps the id pinned, so renaming only changes `name`.

### Blank map seeds a default player spawn zone

A brand-new map cannot have an empty `playerSpawnZone` and still persist — the
server's `playerSpawnZone > PC count` rule would reject the create. So `blankMap`
seeds a default zone (the bottom rows of the grid) that already exceeds the party
size; the author refines it in the editor. This is the one deviation from a literally
"empty zones" blank map, made so New round-trips through the write API in one step.

## Risks / Trade-offs

- **Phaser-in-React lifecycle.** Mounting/destroying the scene on route changes and
  syncing React state into Phaser can leak or double-render. *Mitigation:* one scene
  instance per editor mount, an explicit `scene.setMap(map)` setter called from a
  React effect, teardown on unmount; keep the scene stateless beyond the current map.
- **Drag-paint performance.** Re-pushing the whole map per tile during a drag could
  thrash. *Mitigation:* the scene diffs and redraws only changed tiles; React batches
  the stroke.
- **Removing `pcStartTiles`.** The seed's PCs will start on zone-derived tiles rather
  than their former fixed squares (melee `(4,5)`, ranger `(6,5)`, …). *Accepted:* play
  opens in the `placement` phase and the player repositions PCs freely within the zone,
  so the initial arrangement carries no gameplay weight. Covered by a test asserting
  every PC starts on a distinct `playerSpawnZone` tile, deterministically.
- **Sprite-rendering ordering.** If the editor lands before sprites, it renders flat
  rects; if after, sprites. Either order works because both scenes share one renderer.
  *Accepted* — no hard sequencing dependency, only a shared-helper coordination point.

## Migration / Rollout

Additive front-end, plus a placement simplification and the removal of `pcStartTiles`
from the map shape. No DB schema/migration change — maps are re-seeded, and the seed
drops the field; any persisted map carrying a stray `pcStartTiles` is simply ignored.
Depends on the shell and write-API changes. Ships behind normal auth; existing play is
unchanged except that the seed's PCs now start on zone-derived tiles (still repositioned
freely in the `placement` phase).

## Open Questions

- Default size for a brand-new map — `8×8`? Pick a sensible default; the user can
  resize immediately.
- Object `kind` palette — fixed list (`power-center`, `tower`, `rubble`, …) for now,
  or free text? Lean: a small fixed list matching the seed's kinds, extensible later.
- Undo/redo in the editor — nice-to-have; the pure `applyTool` model makes a simple
  state-stack undo cheap, but it can be a fast follow rather than MVP.

## Testing

- `applyTool` unit tests: paint terrain, place/replace/remove object, toggle each
  zone, erase, and resize grow/crop (including out-of-bounds drop counts) — pure,
  no Phaser.
- Client validation: invalid maps (grid≠size, out-of-bounds, terrain outside region
  enum, player zone ≤ PC count) disable Save and flag tiles.
- Save/new/delete: each calls the right endpoint and reflects the server result;
  delete-last is surfaced from the API error.
- Placement: every map (the seed and editor-authored maps) places the four PCs on
  distinct `playerSpawnZone` tiles, deterministically; no map carries `pcStartTiles`.
- `npm run build:games` passes with zero TypeScript errors; existing + new tests pass.
