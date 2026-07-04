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
- Confirm `back()`/`skipTo()` from Phase 1's `DirectorEngine` still land at
  pixel-correct camera/entity positions by applying the resting-state
  snapshot directly to the Phaser scene — never by replaying `walk`/`walkTo`
  movement. (Phase 1 shipped `skipTo(i)` only — no section-name lookup — so
  this change doesn't need a `skipToSection` executor hook.)
- All rendering uses placeholder tiles/sprites (colored rectangles or
  primitive shapes); no PixelLab art is introduced in this phase.

## Capabilities

### New Capabilities

- `world-rendering`: Phaser tilemap/sprite/camera rendering, the fixed
  placeholder map with baked NPC/location data, real `walk`/`walkTo`
  execution (stepwise movement and A* pathfinding), and scene/area
  management — the "world" half of the Director's action executors.

### Modified Capabilities

- `talk-director`: The "Placeholder resting-state renderer" requirement
  (the DOM `<div>`-rectangle stage Phase 1 added to visually prove the
  Director contract with no rendering engine) is removed, superseded by
  `world-rendering`'s Phaser-based renderer. No other `talk-director`
  requirement (precompute pass, `snapTo`/`next`/`back`/`pause`/`resume`/
  `skipTo`) changes.

Note: `talk-rpg-experience`'s existing requirements (Phaser game-host
mount/unmount, full-screen modes) are unaffected and not included here —
this change reactivates the already-specified Phaser host rather than
changing its contract. `talk-rpg-experience`'s scaffold-era title-screen and
`Beat`-interface requirements are Phase 1's (`director-precompute-pass`)
concern to remove, not this change's, to avoid two in-flight changes
deltaing the same requirement out of order.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — `TalkRpgScene.ts` (currently an
  empty stub per Phase 1's non-goals; gains real action executors for
  `walk`/`walkTo`/`enterScene` and a resting-state-to-scene apply function),
  `script.ts`/`precompute.ts` (`GameMap` grows a walkable-tile grid and
  named-location table; `RestingState` grows a `camera` field), new
  `pathfinding.ts` (A* over the walkable grid, shared by `applyAction`'s
  headless precompute pass and the live `walkTo` executor), new
  `public/rpg/maps/*.json` (Tiled-shaped placeholder map(s)).
- **Depends on**: the `talk-director` capability from `director-precompute-pass`,
  which has since landed in code (`precompute.ts`, `directorEngine.ts`,
  `executors.ts`, `Director.tsx`) though its OpenSpec change isn't archived
  yet. This change was started before that one was implemented, per explicit
  user direction; a few of this proposal's original assumptions have been
  reconciled against the real shipped API in this revision:
  - `RelativeStep` is `{ direction: 'up'|'down'|'left'|'right'; steps: number }`,
    not the `{ dir: 'N'|'S'|'E'|'W'; n }` shape sketched in `architecture.md`/
    `action-vocabulary.md` — those docs are stale on this point and should be
    corrected separately.
  - Entities are a flat `{ id, x, y, facing }` record with no protagonist/NPC
    type distinction, and `startDialogue`/`say` carry no NPC/speaker
    reference yet (dialogue is a single global open/closed + text state).
    Fine for this phase (world rendering doesn't touch dialogue content),
    but note for Phase 3 planning.
  - `GameMap` is currently just `{ sceneId, entities }` — no tile grid, no
    named locations, no walkable data. This change is what actually adds all
    three; nothing to reconcile there, just confirming it's greenfield.
- **No API/DB impact**: entirely client-side presentation state for a
  single internal-use talk app; no backend routes, schema, or auth changes.
- **Dependents**: Phase 3 (DOM overlay/dialogue) and Phase 4 (battle) build
  directly on the scene/executor structure this change establishes.
