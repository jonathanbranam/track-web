**App**: talks

## Purpose

World rendering is the "world" half of the Director's action executors: a
fixed placeholder map (walkable-tile grid, baked NPC/location data), Phaser
tilemap/sprite/camera rendering built entirely from placeholder primitives
(no real art until Phase 8), and real `walk`/`walkTo` execution (stepwise
movement and A* pathfinding) plus `enterScene` area switching. It renders the
`talk-director` capability's resting-state contract on a live Phaser scene,
never diverging from what the headless precompute pass computes.

## Requirements

### Requirement: Fixed placeholder map with walkable grid and named locations
The system SHALL define at least one fixed, pre-built placeholder map as a hand-authored Tiled-shaped JSON file (`public/rpg/maps/*.json`) containing a walkable-tile grid, baked entity starting positions, and a table of named locations resolvable by grid coordinate. Actions SHALL reference entity IDs and named locations, never raw coordinates directly in the script.

#### Scenario: Named location resolves to a grid coordinate
- **WHEN** the map defines a named location `"town-square"`
- **THEN** the map data resolves `"town-square"` to a specific walkable-grid coordinate usable by pathfinding and scene entry

#### Scenario: Walkable grid marks impassable tiles
- **WHEN** the map's tile grid marks a tile as non-walkable (e.g. a wall tile)
- **THEN** pathfinding never routes an entity through that tile and literal `walk` paths are authored to avoid it

### Requirement: Phaser tilemap rendering via placeholder tile lookup
The system SHALL render the active map's tile grid in Phaser using a per-tile-type solid-color rectangle lookup (no tileset image required), with each tile's rendering handled by a single lookup function so a real tileset image can later replace the color lookup without changing the rendering call sites.

#### Scenario: Tile grid renders as colored rectangles
- **WHEN** the active scene's map is loaded
- **THEN** every walkable and non-walkable tile in the grid renders as a solid-colored `Phaser.GameObjects.Rectangle` positioned at its grid coordinate, with no network request for a tileset image

### Requirement: Entity rendering via a shared EntityView
The system SHALL render every entity (a colored rectangle plus a directional facing indicator) through a single `EntityView` module that accepts a `{ position, facing, animationState }` input, used identically by live action executors and by the resting-state-to-scene apply step. The system SHALL visually distinguish an `idle` animation state from a `walk` animation state (e.g. a bob/offset tween) and SHALL indicate the entity's current facing direction.

#### Scenario: Entity shows walking state while moving
- **WHEN** an entity is mid-`walk` execution
- **THEN** its `EntityView` renders the `walk` animation state (visibly distinct from `idle`)

#### Scenario: Entity facing updates on direction change
- **WHEN** an entity's `walk` path changes direction
- **THEN** the `EntityView`'s facing indicator updates to match the new direction

#### Scenario: snapTo renders entities with no motion
- **WHEN** a resting-state snapshot is applied to the scene (via `snapTo`/`back`/`skipTo`)
- **THEN** every entity's `EntityView` is drawn directly at the snapshot's recorded position/facing/animation state, with no tween or intermediate frame played

### Requirement: Real deterministic walk execution
The system SHALL execute a `walk` action's literal relative-step path as real stepwise movement of the entity on the live Phaser scene (one grid step at a time), arriving at the exact final position and facing that the headless precompute pass (`applyAction`) computes for the same action.

#### Scenario: Live walk ends where precompute predicts
- **WHEN** a `walk` action finishes executing live on the Phaser scene
- **THEN** the entity's final grid position and facing match the corresponding resting-state snapshot produced by the precompute pass for the same script

### Requirement: walkTo pathfinding and execution
The system SHALL provide a `walkTo` action that resolves a named map location (or another entity's current position) to a walkable-grid coordinate, computes a path via A* over the map's walkable grid, and executes that path as real stepwise movement — using the same pathfinding function inside both the headless precompute pass and the live executor, so the cached and live final positions can never diverge. `walkTo` SHALL remain fully deterministic and SHALL fail predictably (no path found) if the target is unreachable.

#### Scenario: walkTo reaches a named location
- **WHEN** a `walkTo` action targets a named location that is reachable from the entity's current position
- **THEN** the entity walks a computed path and arrives exactly at that location's grid coordinate

#### Scenario: walkTo path matches between live and precomputed runs
- **WHEN** the same `walkTo` action is executed once via the headless precompute pass and once via live playback
- **THEN** both produce the identical final entity position

### Requirement: Scene and area management
The system SHALL support defining multiple scenes/areas (e.g. town, overworld) sharing the same Phaser scene instance, and SHALL switch the active area in place when an `enterScene` action executes — reloading the target area's map/tile/entity data and camera bounds without a Phaser scene-manager transition. Battle and meta-screen areas MAY remain unimplemented in this phase.

#### Scenario: enterScene switches the active area
- **WHEN** an `enterScene` action targets a different defined area
- **THEN** the rendered tile grid, entities, and camera bounds update to the target area's data, and no entity or tile from the previous area remains visible

### Requirement: Camera follow and instant snap
The system SHALL provide a Phaser camera that follows the active entity in real time during live playback (`walk`/`walkTo` execution), and SHALL, on `snapTo`/`back`/`skipTo`, set the camera's position and zoom directly from the resting-state snapshot's recorded camera fields — never inferring camera position by re-running movement or animating between two positions.

#### Scenario: Camera follows during live walk
- **WHEN** an entity executes a `walk` or `walkTo` action live
- **THEN** the camera scrolls to keep the entity in view as it moves

#### Scenario: Camera snaps instantly on back/skip
- **WHEN** `back()` or `skipTo(i)` applies a resting-state snapshot
- **THEN** the camera's position and zoom are set directly to that snapshot's recorded values with no animation or scroll tween
