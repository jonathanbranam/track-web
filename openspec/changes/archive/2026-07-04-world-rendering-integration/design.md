## Context

Phase 1 (`director-precompute-pass`) has landed in code — `client-talks/src/
talk-rpg/precompute.ts`'s `applyAction` runs the whole script once headlessly
and caches resting states, `directorEngine.ts`'s `DirectorEngine` exposes
`next`/`back`/`skipTo`/`pause`/`resume`, and a plain DOM `<div>`-rectangle
renderer in `RpgExperience.tsx` proves the contract — but nothing yet touches
Phaser (`TalkRpgScene.ts` is an empty stub). Its OpenSpec change isn't
archived yet. This change wires that same action/resting-state contract into
a real Phaser scene per `architecture.md`: a fixed tilemap, moving/animated
entities, and a camera, all still rendered as **placeholder primitives**
(`Graphics`, `Rectangle`, `Phaser.GameObjects.Text`) — real PixelLab
tile/sprite art doesn't land until Phase 8. `client-talks` already follows
the CDN-externalized Phaser pattern (`vite.config.ts` `rollupOptions.external`,
the import map in `index.html`) established for `client-games`; this change
adds more Phaser-dependent code but doesn't change that build setup.

Note on reconciling with the real Phase 1 shapes (see `proposal.md`'s
Impact section for the full list): `RelativeStep` is
`{ direction: 'up'|'down'|'left'|'right'; steps: number }`, not the
`{ dir: 'N'|'S'|'E'|'W'; n }` shape `architecture.md`/`action-vocabulary.md`
sketch (those docs need a follow-up correction, out of scope for this
change). `GameMap` currently is just `{ sceneId, entities }` — this phase is
what adds the walkable-tile grid and named-location table to it.

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
action executor (`walk`, `walkTo`) and the resting-state-to-scene apply step
this phase adds to `TalkRpgScene.ts` go through this same `EntityView`,
never drawing shapes ad hoc. Phase 8 swaps this module's
internals for real spritesheet frame selection; the executors and resting-
state contract don't change. *Alternative considered:* skip the
abstraction and inline rectangle-drawing in the scene/executors directly.
Rejected — `requirements.md` §4I's "placeholder art swappable without
engine changes" guarantee is explicit, and Phase 8 is much cheaper to land
if there's already a single seam to swap.

**Single Phaser Scene, area-swapping in place.** Build out the currently-stub
`TalkRpgScene` (per `architecture.md`'s single-scene architecture) rather
than registering a separate Phaser `Scene` per map/area. `enterScene` reloads the
active map's tile/entity data and camera bounds inside the same scene
instance rather than triggering a Phaser scene transition. *Alternative
considered:* one Phaser `Scene` subclass per area (town, overworld), using
Phaser's built-in scene-manager transitions. Rejected for this phase —
adds scene-lifecycle complexity (start/stop/sleep semantics) that isn't
needed yet for two placeholder areas with no battle-specific transition;
revisit if Phase 4's battle scene turns out to want a real Phaser scene
swap instead of an in-place overlay.

**`walkTo` pathfinding is shared, not duplicated.** The same `pathfinding.ts`
A* implementation runs both inside `precompute.ts`'s `applyAction` (the
headless precompute pass) and inside the live `walkTo` executor added to
`executors.ts` — one function, called from two call sites — so a resting
state's cached final position can never diverge from what live playback
actually walks to.

**Camera snap vs. follow.** During live playback the camera continuously
follows the active entity (Phaser's built-in `startFollow`). On
`snapTo`/`back`/`skipTo`, the camera's position/zoom fields from the
resting-state snapshot are set directly (`setScroll`/`setZoom`), and
`startFollow` is re-armed on the (possibly different) active entity for
this checkpoint — never inferred by re-running movement.

## Risks / Trade-offs

- **[Risk]** This change was drafted against `architecture.md`'s sketch of
  the Phase 1 contract before Phase 1 actually landed, and the real shipped
  shapes differ in a few places (`RelativeStep` field names, a minimal
  `GameMap`, no NPC/speaker targeting on dialogue actions) →
  **Mitigation:** reconciled in this revision (see `proposal.md`'s Impact
  section for the full diff); this phase's executors and map/camera
  additions are written against the real `DirectorEngine`/`applyAction`/
  `GameMap` types in `client-talks/src/talk-rpg/`, not the sketched ones.
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
