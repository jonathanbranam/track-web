**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: A map editor lists, creates, and deletes the region's maps
The system SHALL provide, under the DT studio hub, a map-list view at `/studio/dungeon-tactics/maps` that lists the region's maps in order and offers **open**, **create new**, and **delete** actions, and an editor view at `/studio/dungeon-tactics/maps/:mapId` for one map. Creating a map SHALL produce a blank map (default size, the region's first terrain value in every tile, empty objects and spawn zones) and open it in the editor. Deleting SHALL remove a map, surfacing the API's rejection when it would remove the last map. Both views SHALL require a logged-in session.

#### Scenario: New map opens blank in the editor
- **WHEN** a user creates a new map from the map list
- **THEN** the system SHALL persist a blank map and open it in the editor with the region's first terrain painted across the grid and empty objects/zones

#### Scenario: Deleting the last map is surfaced as an error
- **WHEN** a user deletes the only remaining map
- **THEN** the system SHALL surface the API rejection and SHALL NOT remove it

### Requirement: The editor canvas renders in Phaser while controls are ReactDOM
The map editor SHALL render the board (terrain grid, objects, spawn-zone overlays) with a **Phaser** scene and SHALL present all interactive controls (palettes, toolbar, resize, save/new/delete) as **ReactDOM**. React SHALL hold the authoritative in-memory map and the active tool; the Phaser scene SHALL render the map it is given and SHALL emit tile coordinates on pointer events without containing tool or validation logic. The editor scene SHALL share terrain/object rendering with the play scene so authored boards look like played boards (and inherit sprite rendering when it is available).

#### Scenario: Clicking a tile applies the active tool
- **WHEN** the user selects a tool and clicks (or drags across) a tile on the Phaser canvas
- **THEN** the scene SHALL report the tile coordinate, React SHALL apply the active tool to its map model, and the canvas SHALL re-render the change

#### Scenario: Mutation logic is independent of Phaser
- **WHEN** a tool is applied to the map
- **THEN** the resulting map SHALL be produced by a pure function over the map model, independent of the Phaser scene

### Requirement: The editor paints terrain, objects, and spawn zones, and resizes the board
The editor SHALL provide tools to: **paint terrain** from a palette populated by the region's `terrainTypes`; **place and remove objects** as `{ col, row, kind, hp? }` (structures carry `hp`, inert objects omit it); **paint the enemy spawn zone**; **paint the player spawn zone**; **erase**; and **resize** the board within `4×4`–`16×16` (growing fills new tiles with the region's first terrain, cropping drops out-of-bounds objects and zone tiles and reports how many were removed). The player spawn zone SHALL be editable tile-by-tile and MAY be **non-contiguous**.

#### Scenario: Terrain palette is the region's terrain set
- **WHEN** the user opens the terrain tool
- **THEN** the palette SHALL offer exactly the region's `terrainTypes`, and painted tiles SHALL take the chosen value

#### Scenario: Player spawn zone may be non-contiguous
- **WHEN** the user paints player-spawn tiles that do not all touch
- **THEN** the editor SHALL accept the non-contiguous set as the `playerSpawnZone`

#### Scenario: Resizing crops out-of-bounds content with a warning
- **WHEN** the user shrinks the board so that some objects or zone tiles fall outside the new size
- **THEN** the editor SHALL drop those entries and report how many were removed

### Requirement: The editor validates client-side and saves through the validated write API
The editor SHALL pre-validate the map against a client mirror of the server schema — terrain grid matches `size`, objects and zone tiles in bounds, terrain values within the region's `terrainTypes`, and `playerSpawnZone` larger than the player-unit count — disabling Save and flagging offending tiles while invalid. Save SHALL persist through the content-write API, whose server-side schema is the authority; on success the editor SHALL reload the stored map. A save the server rejects SHALL surface as an error and SHALL NOT silently alter the board.

#### Scenario: Invalid map blocks save
- **WHEN** the editing map violates a validation rule (e.g. `playerSpawnZone` no larger than the PC count, or a terrain value outside the region enum)
- **THEN** the editor SHALL disable Save and indicate the problem

#### Scenario: Valid map saves and reloads
- **WHEN** the user saves a valid map
- **THEN** the editor SHALL `PUT` it through the write API and reload the stored map on success

### Requirement: Authored maps are playable from the spawn zone
The system SHALL ensure every map authored in the editor is playable with no fixed start tiles: there is no `pcStartTiles` field to author, and at play time PC placement SHALL derive from the map's `playerSpawnZone` (the four PCs seated on the first N zone tiles in a stable order). Client validation SHALL require `playerSpawnZone.length` to exceed the PC count so the party always fits. Interactive in-match PC placement is out of scope for this change.

#### Scenario: Authored map places PCs within its player spawn zone
- **WHEN** the game starts on an editor-authored map
- **THEN** the four PCs SHALL be placed on distinct tiles drawn from that map's `playerSpawnZone`

#### Scenario: A too-small player zone blocks save
- **WHEN** the user tries to save a map whose `playerSpawnZone` has no more tiles than the PC count
- **THEN** the editor SHALL flag it invalid and disable Save
