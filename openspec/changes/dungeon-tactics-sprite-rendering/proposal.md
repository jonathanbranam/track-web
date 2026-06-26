## Why

The Dungeon Tactics board is rendered entirely with vector primitives — units are flat circles (PCs) and triangles (NPCs) seen straight-down, and terrain is flat filled rectangles. Viewed fully top-down, characters read as abstract tokens with no sense of being figures standing on a battlefield. We want to introduce hand-authored sprite art (units and terrain) to make the board feel like a place with characters in it, while the grid stays flat and all existing gameplay math is untouched. Because art does not yet exist for every archetype or terrain type, sprites must be **optional and per-entity**, falling back to today's vector rendering wherever art is missing — so the game is always fully playable mid-migration.

## What Changes

- Add an **asset-loading pipeline** to the Dungeon Tactics scene (currently it loads no images at all): a Phaser `preload` step that loads Aseprite-exported sprite sheets from `client-games/public/`, with pixel-art-correct (nearest-neighbor) texture filtering.
- Render units as **upright billboard sprites** standing on their tile (feet anchored at the tile, art extending upward past it) instead of flat top-down tokens, with **four cardinal orientations** (up / down / left / right). The board itself stays flat top-down — perspective lives in the sprite art, not the board geometry.
- Introduce **unit facing** as render-side state (derived from the unit's last move/attack direction, with a sensible spawn default). Facing is **not** added to the persisted game model in this change.
- Add **depth sorting by row** so upright sprites occlude correctly (a unit in front overlaps the one behind it).
- Render **terrain from a tileset** (per-terrain sprite tiles) instead of flat filled rectangles.
- Add a **rendering-source toggle with per-entity fallback**: each unit archetype and each terrain type independently uses its sprite if art is registered, otherwise falls back to the existing vector/flat rendering. A global switch can also force the legacy vector renderer for the whole board.
- In **sprite mode**, reposition the unit "chrome" (HP indicator, selection state, order-number label) to read correctly with a tall standing sprite (e.g. ground-decal selection, HP above the figure). Vector mode is unchanged.

Non-goals (explicitly out of scope): tilting/projecting the board into perspective (isometric, oblique, or vertical squash); animated sprites (the pipeline is chosen to enable animation later, but no animations ship here); authoring the actual art for every archetype.

## Capabilities

### New Capabilities
- `dungeon-tactics-sprite-rendering`: Sprite-based rendering layer for the Dungeon Tactics board — the asset-loading pipeline; upright billboard unit sprites with four cardinal orientations; unit facing as render state; depth-sort-by-row; terrain tileset rendering; and the per-entity rendering-source toggle that falls back to vector/flat rendering when art is absent.

### Modified Capabilities
- `dungeon-tactics-solo`: The "HP pip rendering on unit tiles" requirement currently mandates flat rectangles on the tile's left edge for *all* units. It becomes conditional on render mode — vector mode keeps the existing pip rendering; sprite mode renders HP appropriate to a standing billboard. The vector fallback path must continue to satisfy the existing requirement unchanged.

## Impact

- **Code**: `client-games/src/games/dungeon-tactics-solo/DungeonTacticsScene.ts` (new `preload`, billboard unit rendering, terrain tileset rendering, depth-by-row, facing derivation, chrome repositioning); `types.ts` (render-side facing, sprite/tileset registry types). The pure game-logic modules (`pc.ts`, `npc.ts`, `turn.ts`, `map.ts`, pathfinding) are untouched — this is purely a rendering change.
- **Assets**: New `client-games/public/` sprite sheets + Aseprite JSON; a registry mapping archetype/terrain → sprite (and marking which have art).
- **Dependencies**: No new npm dependencies — uses Phaser 3.88's built-in `load.aseprite` loader.
- **Build/deploy**: Sprite assets are bundled by Vite from `client-games/public/`; no Caddy/deploy-script changes.
- **Adjacent work**: The in-flight `map-persistance` change is unaffected because facing stays render-side and is not added to the persisted model; if persisted facing is wanted later, that is a separate change.
