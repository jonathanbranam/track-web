## Context

Phase 1 (`director-precompute-pass`, not yet implemented) proves the
action-list/precompute-pass Director against placeholder rectangles with no
rendering engine involved at all — `applyActionHeadlessly` runs the whole
script once and caches resting states, but nothing ever touches Phaser. This
change wires that same action/resting-state contract into a real Phaser
scene per `architecture.md`: a fixed tilemap, moving/animated entities, and
a camera, all still rendered as **placeholder primitives** (`Graphics`,
`Rectangle`, `Phaser.GameObjects.Text`) — real PixelLab tile/sprite art
doesn't land until Phase 8. `client-talks` already follows the
CDN-externalized Phaser pattern (`vite.config.ts` `rollupOptions.external`,
the import map in `index.html`) established for `client-games`; this change
adds more Phaser-dependent code but doesn't change that build setup.

## Goals / Non-Goals

**Goals:**
- Render a fixed placeholder map (walkable grid, baked NPC positions, named
  locations) with Phaser tilemap primitives.
- Represent every entity (protagonist, NPCs) as a primitive shape that can
  visibly walk, idle, and face a direction — proving the executor contract
  Phase 8 will later swap real spritesheets into, without changing it.
- Implement real, deterministic `walk` (literal path) and `walkTo` (A*
  pathfind) execution against the map's walkable grid.
- Implement a camera that follows the active entity and snaps instantly to
  a resting state's recorded position/zoom on `snapTo`/`back`/`skipTo`.
- Implement scene/area switching (`enterScene`) across at least two
  placeholder areas.

**Non-Goals:**
- No real tileset or spritesheet images — every visual is a primitive.
  Frame-accurate walk-cycle animation, directional sprite art, and tile
  images are Phase 8 concerns; this phase only needs a visibly-distinct
  idle vs. walking state and a facing indicator.
- No authored `panCamera` action — camera motion in this phase is purely
  the follow-cam behavior during `walk`/`walkTo`, not a standalone scripted
  camera move. (`panCamera` stays "Proposed" in `action-vocabulary.md`.)
- No battle scene, DOM overlay, dialogue box, or menu shell (Phases 3–4).
- No changes to the `client-talks` Phaser build/externalization setup —
  it's already CDN-externalized per `CLAUDE.md`.

## Decisions

**Map authoring format: hand-authored Tiled-shaped JSON, not the Tiled GUI.**
Keep the map file shape from `architecture.md` (a Tiled JSON structure:
tile-layer grid, object layer for NPC placements/named locations) so the
schema doesn't need to change again in Phase 8 once a real tileset image
exists. But since there's no tileset image yet, author `world-*.json` by
hand (or a small script) rather than via the Tiled editor, which expects an
image to paint with. Switching to the Tiled GUI for editing becomes
possible, not required, once Phase 8 introduces a real tileset.
*Alternative considered:* a bespoke placeholder-only map format (e.g. a
plain 2D array of tile-type strings). Rejected — it would need a rewrite
into the Tiled shape in Phase 8, duplicating work and risking the two
formats drifting on walkable-grid semantics.

**Tile rendering: GID → solid-color rectangle lookup.** Each tile layer
cell's GID maps to a flat-colored `Phaser.GameObjects.Rectangle` (e.g.
grass = green, wall = gray, water = blue) drawn at the tile's grid position
instead of a tileset image lookup. This is a thin swap point: Phase 8
replaces the GID → color lookup with a GID → tileset-frame lookup and
nothing else in the tilemap rendering path changes.

**Entity rendering: an `EntityView` abstraction, primitives now.** Introduce
one small module responsible for drawing an entity given
`{ position, facing, animationState }` — for this phase it draws a colored
rectangle plus a small directional notch/triangle for facing, and toggles a
subtle bob/offset tween between `idle` and `walk` animation states. Every
action executor (`walk`, `walkTo`) and `applyRestingState` go through this
same `EntityView`, never drawing shapes ad hoc. Phase 8 swaps this module's
internals for real spritesheet frame selection; the executors and resting-
state contract don't change. *Alternative considered:* skip the
abstraction and inline rectangle-drawing in the scene/executors directly.
Rejected — `requirements.md` §4I's "placeholder art swappable without
engine changes" guarantee is explicit, and Phase 8 is much cheaper to land
if there's already a single seam to swap.

**Single Phaser Scene, area-swapping in place.** Continue the existing
`TalkRpgScene` single-scene architecture (per `architecture.md`) rather than
registering a separate Phaser `Scene` per map/area. `enterScene` reloads the
active map's tile/entity data and camera bounds inside the same scene
instance rather than triggering a Phaser scene transition. *Alternative
considered:* one Phaser `Scene` subclass per area (town, overworld), using
Phaser's built-in scene-manager transitions. Rejected for this phase —
adds scene-lifecycle complexity (start/stop/sleep semantics) that isn't
needed yet for two placeholder areas with no battle-specific transition;
revisit if Phase 4's battle scene turns out to want a real Phaser scene
swap instead of an in-place overlay.

**`walkTo` pathfinding is shared, not duplicated.** The same `pathfinding.ts`
A* implementation runs both inside the headless precompute pass (Phase 1's
`applyActionHeadlessly`) and inside the live `walkTo` executor — one
function, called from two call sites — so a resting state's cached final
position can never diverge from what live playback actually walks to.

**Camera snap vs. follow.** During live playback the camera continuously
follows the active entity (Phaser's built-in `startFollow`). On
`snapTo`/`back`/`skipTo`, the camera's position/zoom fields from the
resting-state snapshot are set directly (`setScroll`/`setZoom`), and
`startFollow` is re-armed on the (possibly different) active entity for
this checkpoint — never inferred by re-running movement.

## Risks / Trade-offs

- **[Risk]** Building against the not-yet-implemented `talk-director`
  contract from Phase 1 (started out of sequence, per explicit user
  direction) → **Mitigation:** this change's executors only depend on the
  documented `applyRestingState`/action-executor contract in
  `architecture.md`, not on Phase 1's internal implementation details;
  reconcile call sites once Phase 1 actually lands, and re-run this
  phase's tests against the real `talk-director` output at that point.
- **[Risk]** Single-scene area-swapping may not generalize to Phase 4's
  battle scene (a materially different layout/camera framing) →
  **Mitigation:** flagged above as an explicit revisit point; nothing here
  blocks switching to a real Phaser scene-manager transition later if
  needed.
- **[Risk]** Hand-authoring Tiled-shaped JSON without the Tiled GUI is more
  error-prone than painting a map visually → **Mitigation:** keep the
  placeholder map tiny (per Phase 2's own goal), and cover the walkable
  grid / named-location data with a unit test that loads the map file and
  asserts pathfinding reaches every named location.
- **[Risk]** Primitive-only "animation" (a bob tween + facing notch) is a
  much weaker visual test of the animation-state contract than real
  spritesheet frames would be, so a Phase 8 regression in frame timing
  might not be caught by anything built in this phase → **Mitigation**:
  accepted — `requirements.md` explicitly sequences real art to Phase 8;
  the `EntityView` seam is the concrete mitigation for that gap.

## Testing

- Unit tests for `pathfinding.ts`: A* correctness on the fixed walkable
  grid (reaches every named location and NPC-adjacent tile; returns no
  path for an intentionally unreachable test tile).
- Headless tests for the precompute pass extended to this phase's map:
  given a script using `walk`/`walkTo`/`enterScene`, assert the cached
  resting-state snapshots contain the expected final entity
  position/facing and active scene — no Phaser/browser needed, matching
  `precompute.ts`'s existing no-Phaser-dependency design.
- Manual verification in-browser (Playwright screenshot, per
  `CLAUDE.md`'s verification convention) that live `walk`/`walkTo`
  playback visually ends at the same tile the precompute pass cached, and
  that `back()`/`skipTo()` snap the camera/entities instantly with no
  replay artifact.
