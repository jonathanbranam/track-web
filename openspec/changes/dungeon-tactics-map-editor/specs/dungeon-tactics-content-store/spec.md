**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: PC placement falls back to the player spawn zone when no fixed start tiles exist
The content store / engine SHALL place player characters using a map's fixed `pcStartTiles` when present, and SHALL otherwise derive placement deterministically from the map's `playerSpawnZone`. This makes editor-authored maps — which carry no `pcStartTiles` — immediately playable, while the seed map (which carries `pcStartTiles`) continues to place PCs on exactly the tiles it did before. Deriving placement from the zone SHALL be deterministic (a stable ordering of zone tiles) so a given map places PCs the same way each run.

#### Scenario: Map without fixed start tiles derives placement from the zone
- **WHEN** the engine starts a game on a map that has no `pcStartTiles`
- **THEN** it SHALL place PCs on a deterministic subset of that map's `playerSpawnZone`

#### Scenario: Seed map placement is preserved
- **WHEN** the engine starts a game on the seed map, which carries `pcStartTiles`
- **THEN** it SHALL place PCs on the same tiles as before, ignoring the zone-derived fallback
