**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: Content is a serializable Region → Map → Encounter tree
The system SHALL model Dungeon Tactics board content as a three-level tree: a **Region** owns an ordered list of **Maps**, and a Map owns an ordered list of **Encounters**. Each entity SHALL have a stable id, a display `name`, and an integer ordering position, and SHALL be fully serializable to and deserializable from JSON so the whole tree can be persisted and reloaded without loss.

#### Scenario: A region owns ordered maps which own ordered encounters
- **WHEN** a content tree is serialized
- **THEN** it SHALL contain a Region with an ordered list of Maps, each Map with an ordered list of Encounters, each entity carrying a stable id, display name, and ordering position

#### Scenario: Round-trip preserves the tree
- **WHEN** a Region/Map/Encounter is serialized to JSON and deserialized back
- **THEN** the result SHALL equal the original (no field lost or reordered)

### Requirement: A Region defines its own terrain enum and theme
A Region SHALL carry a `theme` (visual flavor) and its own `terrainTypes` enum — the set of terrain values its Maps may use. Terrain SHALL NOT be a single global set; each Region defines its own. Every Map in a Region SHALL only use terrain values drawn from that Region's `terrainTypes`.

#### Scenario: Map terrain is constrained to the region's enum
- **WHEN** a Map in a Region uses a terrain value not present in the Region's `terrainTypes`
- **THEN** validation SHALL reject the Map

#### Scenario: Region carries a theme and terrain enum
- **WHEN** a Region is inspected
- **THEN** it SHALL expose a `theme` and a non-empty `terrainTypes` list

### Requirement: A Map has an adjustable size and a terrain grid matching it
A Map SHALL carry a `size` of `{ cols, rows }` as a first-class adjustable property, with **cols and rows each in `[4, 16]`**. The Map's `terrain` SHALL be a `rows × cols` grid of terrain values, one per tile. Validation SHALL reject a Map whose terrain grid dimensions do not match its declared `size`, or whose `size` is outside the `4×4`–`16×16` bounds.

#### Scenario: Terrain grid dimensions must match size
- **WHEN** a Map declares `size { cols, rows }` but its `terrain` grid is not exactly `rows × cols`
- **THEN** validation SHALL reject the Map

#### Scenario: Size out of bounds is rejected
- **WHEN** a Map declares a `size` smaller than `4×4` or larger than `16×16`
- **THEN** validation SHALL reject the Map

#### Scenario: A 16×8 map is valid
- **WHEN** a Map declares `size { cols: 16, rows: 8 }` with a matching terrain grid
- **THEN** validation SHALL accept it

### Requirement: A Map's tile objects are a single list with optional HP
A Map SHALL carry an `objects` list of tile objects, each `{ col, row, kind, hp? }`. The `hp` field SHALL be **optional**: an object with `hp` is a destructible **structure** (e.g. power center, tower) and an object without `hp` is inert (e.g. decor, blocker). Every object's `col`/`row` SHALL be inside the Map's `size` bounds. The same single shape SHALL cover both structures and inert objects.

#### Scenario: Structure object carries HP
- **WHEN** an object of kind `power-center` or `tower` is authored with an `hp` value
- **THEN** validation SHALL accept it as a destructible structure

#### Scenario: Inert object omits HP
- **WHEN** an object is authored without an `hp` field
- **THEN** validation SHALL accept it as an inert object

#### Scenario: Out-of-bounds object is rejected
- **WHEN** an object's `col` or `row` lies outside the Map's `size`
- **THEN** validation SHALL reject the Map

### Requirement: A Map declares enemy and player spawn zones
A Map SHALL carry an `enemySpawnZone` (tiles where waves may spawn) and a `playerSpawnZone` (the set of tiles a player may choose from when placing units), each a list of `"col,row"` tile keys within the Map's `size`. The `playerSpawnZone` SHALL contain **more tiles than the player-unit count** so placement has real choice. Validation SHALL reject a zone tile outside the Map bounds.

#### Scenario: Spawn zone tiles are within bounds
- **WHEN** a Map's `enemySpawnZone` or `playerSpawnZone` contains a tile outside its `size`
- **THEN** validation SHALL reject the Map

#### Scenario: Player spawn zone must exceed the party size
- **WHEN** a Map's `playerSpawnZone` has no more tiles than the number of player units it must place
- **THEN** validation SHALL reject the Map

### Requirement: An Encounter holds ordered waves with start triggers and condition lists
An Encounter SHALL carry an ordered list of **Waves**, plus `win`, `lose`, and `achievements` **lists** of condition objects. Each Wave SHALL carry a **start trigger** — one of `immediate`, `after-prev-cleared`, or `after-turns` (with `turns: N`) — and an enemy manifest of `{ archetype, count }` entries referencing archetypes **by name**. The `win` list SHALL be met when any one condition is true; the `lose` list likewise, checked before `win` on a tie; `achievements` SHALL be tracked without ending the encounter.

#### Scenario: Wave carries a start trigger and an enemy manifest
- **WHEN** an Encounter's wave is inspected
- **THEN** it SHALL have one of the three start triggers and a list of `{ archetype, count }` enemy entries

#### Scenario: Win and lose are lists with OR semantics
- **WHEN** an Encounter's `win`/`lose` lists are evaluated
- **THEN** the encounter SHALL be won/lost when any single condition in the respective list is met, with `lose` checked before `win` on a tie

### Requirement: Conditions and triggers are atomic; composites are rejected
Every condition (in `win`, `lose`, or `achievements`) and every wave start trigger SHALL be a single **atomic** tagged object (`type`/`trigger` plus params). The schema SHALL reserve room for future composite types but SHALL **reject** any composite (e.g. `all-of`/`any-of`) condition or trigger for now.

#### Scenario: Atomic condition is accepted
- **WHEN** a condition is a single tagged `{ type, … }` such as `clear-all-waves` or `all-pcs-defeated`
- **THEN** validation SHALL accept it

#### Scenario: Composite condition is rejected
- **WHEN** a condition or trigger uses a composite/nested boolean type (e.g. `all-of`, `any-of`)
- **THEN** validation SHALL reject it
