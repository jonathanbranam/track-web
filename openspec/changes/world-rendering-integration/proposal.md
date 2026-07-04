## Why

The `talk-director` action-list/precompute-pass spine (Phase 1) proves out
presenter controls (`next`/`back`/`pause`/`skipTo`) against placeholder
rectangles with no rendering engine at all. None of that is visible or
demoable as an actual RPG until it drives a real Phaser world: a tilemap,
animated sprites, a camera, and real `walk`/`walkTo` execution instead of a
headless simulation. `requirements.md` §4B and §8's "Rendering & world
simulation" grouping specify this as the next slice, deliberately scoped
alone (no battle, no DOM overlay/dialogue box, no real art) so the
Director's action/resting-state contract gets validated against a real
engine before UI overlay (Phase 3) and battle (Phase 4) build on top of it.

## What Changes

- Integrate Phaser into `client-talks/src/talk-rpg/`: tilemap rendering,
  sprite rendering/animation (idle/walk cycles, directional facing), and
  camera control (position, scroll, follow, pan).
- Author one small, fixed, pre-built placeholder map (Tiled JSON) with a
  walkable-tile grid, baked NPC placements, and named locations, per
  `architecture.md`'s "fixed map" section.
- Implement real `walk` execution: an entity actually steps tile-by-tile
  along a literal relative path on the live Phaser scene (replacing Phase
  1's headless-only simulation of the same action).
- Implement `walkTo`: A* pathfinding (`pathfinding.ts`) to a named map
  location or entity, then real stepwise movement along the computed route.
  Both `walk` and `walkTo` remain fully deterministic.
- Implement scene/area management: define multiple scenes (town, overworld,
  cave-shaped scaffolding) and switch the active scene as the `enterScene`
  action dictates. Battle and meta-screen scenes can remain unimplemented
  stubs until their own phases.
- Confirm `back()`/`skipTo()`/`skipToSection()` from Phase 1 still land at
  pixel-correct camera/entity positions by applying the precomputed
  resting-state snapshot directly (`applyRestingState`) — never by
  replaying `walk`/`walkTo` movement.
- All rendering uses placeholder tiles/sprites (colored rectangles or
  primitive shapes); no PixelLab art is introduced in this phase.

## Capabilities

### New Capabilities

- `world-rendering`: Phaser tilemap/sprite/camera rendering, the fixed
  placeholder map with baked NPC/location data, real `walk`/`walkTo`
  execution (stepwise movement and A* pathfinding), and scene/area
  management — the "world" half of the Director's action executors.

### Modified Capabilities

- `talk-rpg-experience`: The scaffold-phase requirements that render the
  title screen and beat data with bare Phaser primitives and the `Beat`
  interface (already superseded by Phase 1's action-list model) are
  replaced with requirements describing the Phaser game host running a
  real tilemap/sprite scene driven by the `talk-director` and
  `world-rendering` capabilities. The Phaser game-host mount/unmount and
  full-screen-mode requirements are unaffected and carry forward as-is.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — `TalkRpgScene.ts` (real action
  executors for `walk`/`walkTo`/`enterScene`, `applyRestingState` for
  camera/entity snap), new `pathfinding.ts` (A* over the walkable grid,
  shared by the precompute pass and the live executor), new
  `public/rpg/maps/*.json` (Tiled placeholder map(s)).
- **Depends on**: the `talk-director` capability and its action/resting-
  state contract from the (not yet archived) `director-precompute-pass`
  change — this change was started before that one was implemented, per
  explicit user direction, so its `snapTo`/precompute-pass integration
  points may need reconciling once Phase 1 lands.
- **No API/DB impact**: entirely client-side presentation state for a
  single internal-use talk app; no backend routes, schema, or auth changes.
- **Dependents**: Phase 3 (DOM overlay/dialogue) and Phase 4 (battle) build
  directly on the scene/executor structure this change establishes.
