## Why

With the studio shell standing and a content-write API in place, this change adds
the studio's first real content tool: a **map editor**. It lets a logged-in user
paint terrain, place objects, paint the enemy and player spawn zones, resize the
board, and **create or delete maps** within the seeded region — then save, and see
the result in play. This is the payoff of the whole content-model arc: the board
becomes authored content, not code.

Rendering is a deliberate **hybrid**: the board canvas is drawn by **Phaser**
(reusing the same scene/terrain rendering the game uses, so it inherits the sprite
tileset from `dungeon-tactics-sprite-rendering` for free), while every interactive
control — the palettes, toolbar, resize, and save/new/delete — is **ReactDOM**.
Phaser is a dumb renderer that reports tile clicks; React owns the edited map and
all mutation logic (plain, unit-testable TypeScript).

## What Changes

- **Editor routes** under the DT studio hub:
  - `/studio/dungeon-tactics/maps` — list the region's maps with a **New map**
    action and per-map open/delete.
  - `/studio/dungeon-tactics/maps/:mapId` — the editor for one map.
  Flip the DT hub's Map-editor entry from "coming soon" to available.
- **Hybrid editor canvas.** A Phaser editor scene renders the map's terrain grid,
  objects, and spawn-zone overlays, and emits `{col,row}` on pointer events. A
  React HUD overlays it. React holds the authoritative in-memory `ContentMap` and
  the active tool; on a tile event it applies the tool to the model and pushes the
  new state to the scene to re-render.
- **Tools:**
  - **Paint terrain** — palette populated from the region's `terrainTypes`; click/
    drag paints tiles.
  - **Place / remove object** — choose a `kind`; structures carry `hp`, inert
    objects omit it (one `{col,row,kind,hp?}` shape).
  - **Paint enemy spawn zone** — toggle tiles into `enemySpawnZone`.
  - **Paint player spawn zone** — toggle tiles into `playerSpawnZone`. The zone is
    a designer-drawn, **possibly non-contiguous** set of tiles; at encounter start
    players place their PCs anywhere within it.
  - **Resize** — set `cols`/`rows` within `4×4`–`16×16`; growing adds default-
    terrain tiles, cropping drops out-of-bounds tiles/objects/zone entries (with a
    warning).
  - **Erase** — clear an object / unset a zone tile.
  - **Pan** — switch the canvas from painting to scrolling: while active a drag
    pans the camera (painting is disabled); zoom is always available.
- **Create / delete maps.** New map starts as a blank grid filled with the region's
  first terrain type, no objects, and a default player spawn zone (sized to satisfy
  the `playerSpawnZone > PC count` rule so it persists), then opens in the editor.
  The server mints a short, opaque id (a fixed-length alphanumeric token) decoupled
  from the name. Delete removes a map (guarded against deleting the last one).
- **Rename** the open map (edit its `name`) — persisted on Save without changing
  the map's id.
- **Save** through the content-write API (validated server-side). The editor
  pre-validates with a client mirror of the schema for inline feedback (including a
  non-empty name), but the server is the authority; on save it round-trips and
  reloads.
- **Retire fixed PC start tiles entirely.** `pcStartTiles` is removed from the map
  model — the client shape, the server schema, and the seed all drop it. Play derives
  PC placement from `playerSpawnZone` for **every** map: the four PCs are seated on the
  first N zone tiles in a stable order. Because play opens in the `placement` phase and
  the player repositions PCs freely within the zone, the exact derived tiles don't
  matter. The seed is no longer special — it seats PCs from its zone like any authored
  map. Interactive player-choice placement at encounter start is a **deferred** follow-up;
  this change only ensures every map is playable.
- **Out of scope:** region authoring, encounter/wave/condition editing, the test
  sandbox (`/studio/…/test`), and interactive in-match PC placement UI.

## Capabilities

### New Capabilities

- `dungeon-tactics-map-editor`: The studio map-editing tool — its routes and
  map-list/create/delete; the hybrid Phaser-canvas + ReactDOM-HUD architecture with
  React as the source of truth and Phaser as renderer/input; the terrain, object,
  enemy-zone, player-zone, resize, and erase tools; client-side pre-validation; and
  save through the content-write API.

### Modified Capabilities

- `dungeon-tactics-spawn-placement`: PC initial placement SHALL derive from
  `playerSpawnZone` for every map — the four PCs seated on the first N zone tiles in a
  stable order — and `pcStartTiles` is removed from the map model. The seed map drops
  its fixed start tiles and seats PCs from its zone like any authored map.

## Impact

- **New client pages/components** (`client-games/src/games/dungeon-tactics-solo/` +
  studio pages): `MapEditorPage`, `MapListPage`, an `EditorScene` (Phaser), and HUD
  components (terrain palette, object palette, toolbar, resize control, save bar).
- **Editor model logic** (new module): pure functions applying a tool to a
  `ContentMap` (paint tile, place/remove object, toggle zone tile, resize/grow/crop)
  — unit-tested without Phaser.
- **Client content API** (`client-games/.../api.ts` or content layer): `createMap`,
  `saveMap`, `deleteMap`, plus listing maps for the region — calling the
  content-write endpoints.
- **PC placement** (`npc.ts` `initialState` + content store): seat the four PCs on the
  first N `playerSpawnZone` tiles in a stable order; remove `pcStartTiles` from the
  client shape (`contentTypes.ts`), content store (`contentStore.ts`), server schema
  and seed (`src/games/dungeon-tactics/map.ts`), and the bundled seed (`bundledMap.ts`).
- **DT studio hub**: flip the Map-editor entry to available.
- **Reuse**: the Phaser `EditorScene` shares terrain/object rendering with
  `DungeonTacticsScene` so editing and play look identical (and both gain sprites
  when `dungeon-tactics-sprite-rendering` lands).
- **No DB or deployment-config change.** Depends on `games-studio-shell` and
  `dungeon-tactics-content-write-api`.
