## Context

The play board is rendered by `DungeonTacticsScene.ts` (Phaser) from the content
store's loaded `ContentMap`. The store's client shapes live in `contentTypes.ts`
(`ContentMap` has `size`, `terrain`, `objects`, `enemySpawnZone`, `playerSpawnZone`,
and a legacy `pcStartTiles`). The `dungeon-tactics-sprite-rendering` change is
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
- An authored map (no fixed start tiles) is playable: PC placement derives from
  `playerSpawnZone`.

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

Resize is a separate control (numeric cols/rows): grow fills new tiles with the
region's first terrain type; crop drops out-of-bounds objects and zone tiles, warning
how many were removed.

### Player spawn zone is the placement authority; `pcStartTiles` is retired

The editor authors `playerSpawnZone` tile-by-tile (non-contiguous allowed) and never
writes `pcStartTiles`. At play time, PC placement uses `pcStartTiles` when present
(the seed map, unchanged) and otherwise derives deterministically from
`playerSpawnZone` (first N tiles in a stable order) so authored maps are immediately
playable. The richer "players choose their tiles at encounter start" interaction is a
separate future change; this one only guarantees playability. Client validation
enforces `playerSpawnZone.length > PC count` (mirroring the server schema) before save.

### Validation: client mirrors, server decides

The editor pre-validates against a client mirror of `mapSchema` for inline feedback
(grid matches size, zones/objects in bounds, terrain ∈ region enum, zone big enough),
disabling Save and flagging offending tiles when invalid. The **server endpoint is the
authority** — Save round-trips through the write API and the editor reloads the stored
map, so a client/server schema drift surfaces as a save error, never silent corruption.

### Save / new / delete flow

- **Save** → `PUT /content/maps/:id`; on success reload the returned map into state.
- **New** → build a blank `ContentMap` (region's first terrain, empty objects/zones,
  a default size e.g. `8×8`), `POST` it, then route to its `:mapId`.
- **Delete** → `DELETE /content/maps/:id` (the API guards the last-map case); on
  success return to the map list.

## Risks / Trade-offs

- **Phaser-in-React lifecycle.** Mounting/destroying the scene on route changes and
  syncing React state into Phaser can leak or double-render. *Mitigation:* one scene
  instance per editor mount, an explicit `scene.setMap(map)` setter called from a
  React effect, teardown on unmount; keep the scene stateless beyond the current map.
- **Drag-paint performance.** Re-pushing the whole map per tile during a drag could
  thrash. *Mitigation:* the scene diffs and redraws only changed tiles; React batches
  the stroke.
- **Retiring `pcStartTiles`.** Changing placement risks altering the seed's play.
  *Mitigation:* keep the `pcStartTiles`-present path byte-identical; only absent →
  derive-from-zone is new. Covered by a test asserting the seed still places PCs on
  the same tiles.
- **Sprite-rendering ordering.** If the editor lands before sprites, it renders flat
  rects; if after, sprites. Either order works because both scenes share one renderer.
  *Accepted* — no hard sequencing dependency, only a shared-helper coordination point.

## Migration / Rollout

Additive front-end + placement fallback. No DB change. Depends on the shell and
write-API changes. Ships behind normal auth; the seed map and existing play are
unchanged.

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
- Placement fallback: a map without `pcStartTiles` places PCs within
  `playerSpawnZone`; the seed map (with `pcStartTiles`) places identically to before.
- `npm run build:games` passes with zero TypeScript errors; existing + new tests pass.
