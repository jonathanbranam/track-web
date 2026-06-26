**App**: dungeon-tactics-solo

## REMOVED Requirements

### Requirement: Fixed initial PC positions
**Reason**: `pcStartTiles` is removed from the map model entirely; PCs are now seated from the player spawn zone, so no map carries per-archetype start tiles.
**Migration**: `initialState` derives the four PC start tiles from the map's `playerSpawnZone` (see the added requirement below). The seed map drops its fixed start tiles and seats PCs from its zone like any other map.

## ADDED Requirements

### Requirement: Initial PC positions derive from the spawn zone
`initialState` SHALL place each of the four PCs on a distinct tile of the map's `playerSpawnZone`, chosen as the first N tiles in a stable order (sorted by `row`, then `col`, where N is the PC count). Maps SHALL NOT carry `pcStartTiles` — the field is removed from the map model (client shape, server schema, and seed). Because play opens in the `placement` phase and the player MAY reposition PCs freely within the zone, the exact derived tiles are not significant; only that every PC starts on a distinct in-zone tile, deterministically.

#### Scenario: PCs start on distinct spawn-zone tiles
- **WHEN** the game initializes on any map
- **THEN** each of the four PCs SHALL occupy a distinct tile that is a member of that map's `playerSpawnZone`

#### Scenario: Placement is deterministic
- **WHEN** the game initializes on a given map more than once
- **THEN** the four PCs SHALL occupy the same tiles each time (a stable ordering of the zone)

#### Scenario: No map carries fixed start tiles
- **WHEN** any map (the seed or an editor-authored map) is validated or loaded
- **THEN** it SHALL NOT carry a `pcStartTiles` field, and placement SHALL come solely from `playerSpawnZone`
