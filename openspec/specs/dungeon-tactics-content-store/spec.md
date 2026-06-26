**App**: dungeon-tactics-solo

## Purpose

Routes the Dungeon Tactics engine's board content through an in-memory **content store** loaded
once at game start from the backend, with a bundled `BUNDLED_MAP` fallback on fetch failure. The
engine reads the board grid, dimensions, tile objects, and spawn zones only through the store
(not from hardcoded `map.ts` constants), so a freshly seeded game plays identically to the prior
hardcoded build — making the change a pure refactor.

## Requirements

### Requirement: The client loads the active map into a content store at game start
At game start the client SHALL load board content once into an in-memory **content store** the engine reads from, fetching the default Region/Map/Encounter from the backend. The engine SHALL NOT poll or re-fetch content during play.

#### Scenario: Map loads from the backend at start
- **WHEN** the game starts and the content fetch succeeds
- **THEN** the content store SHALL hold the loaded Map (board, objects, spawn zones) and the engine SHALL derive the board from it

### Requirement: The content store falls back to a bundled seed on fetch failure
The client SHALL keep a bundled `BUNDLED_MAP` constant as an offline/error fallback. If the start-of-game content fetch fails, the content store SHALL fall back to the bundled map so the game remains playable.

#### Scenario: Fetch failure falls back to the bundled map
- **WHEN** the start-of-game content fetch fails
- **THEN** the content store SHALL use the bundled `BUNDLED_MAP` and the game SHALL remain playable

### Requirement: The engine reads board content only through the content store
The engine SHALL read the board grid, dimensions, tile objects, enemy spawn zone, and player spawn zone **only** through the content store, not from hardcoded `map.ts` constants. The store's deserializer SHALL rebuild the engine's runtime board representation from the persisted shape — overlaying objects onto the terrain grid (an object with `hp` becomes a destructible structure cell; one without leaves the cell non-structural) and exposing spawn zones as tile-key sets. Board dimensions SHALL be taken from the loaded Map's `size` rather than fixed constants.

#### Scenario: Engine derives the board from the store
- **WHEN** the engine needs the board, its dimensions, objects, or spawn zones
- **THEN** it SHALL read them from the content store's loaded Map, not from hardcoded constants

#### Scenario: Objects overlay the terrain grid on deserialize
- **WHEN** the store deserializes a Map whose `objects` include both HP-bearing and HP-less entries
- **THEN** HP-bearing objects SHALL become destructible structure cells (with HP and kind) and HP-less objects SHALL not mark their cell as a structure

#### Scenario: Board dimensions come from the loaded map size
- **WHEN** the loaded Map declares a `size`
- **THEN** the engine SHALL use that `size` for its grid dimensions instead of fixed `GRID_COLS`/`GRID_ROWS` constants

### Requirement: A freshly seeded game plays identically to the prior hardcoded build
With the content store loading the seeded default map, a fresh game SHALL play identically to the prior hardcoded build — same board, terrain, structures, enemy spawners, and player placement — so the change is a pure refactor.

#### Scenario: Seeded map reproduces prior play
- **WHEN** the game runs against the freshly seeded default map
- **THEN** the board layout, structure placement and HP, enemy spawn tiles, and player spawn options SHALL match the prior hardcoded build exactly
