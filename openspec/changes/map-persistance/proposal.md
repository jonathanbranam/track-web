## Why

Today the Dungeon Tactics board — terrain, structures, enemy spawners, and player
spawn zone — is hardcoded in `client-games/src/games/dungeon-tactics-solo/map.ts`
and compiled into the bundle. Only unit *stats* are data-driven and persisted. To
grow the game into authored content (many regions → maps → encounters) the map
itself has to become a **serialized, persisted entity** loaded at play time. This
change lays that spine — the architectural prerequisite — by making the *current*
map round-trip through SQLite, with the game playing identically before and after
(a pure refactor). It deliberately stops short of any authoring UI.

## What Changes

- **New content model (serialize/deserialize).** Introduce serializable `Region`,
  `Map`, and `Encounter` entities with Zod validation, mirroring the
  `content_model.md` shapes. Map size is a first-class field (variable **4×4–16×16**,
  seed stays **16×8**); terrain values are drawn from the parent region's
  `terrainTypes`.
- **New persistence tables.** Add `game_dt_regions`, `game_dt_maps`, and
  `game_dt_encounters` — identity/ordering as real columns, shaped blobs (terrain
  grid, structures, zones, wave manifest) as validated `def_json`.
- **Seed today's map into the DB.** Add a `BUNDLED_MAP` const — a faithful 1:1 port
  of `map.ts` (`INITIAL_MAP` terrain → `def_json`, `SPAWNER_POSITIONS` →
  `enemySpawnZone`, `SPAWN_ZONE_LAYOUT`/`PC_START_TILES` → `playerSpawnZone`,
  power centers + tower → `structures`) wrapped in one Region + one Map + one
  single-wave Encounter (`clear-all-waves` / `all-pcs-defeated`). A
  `seedDefaultIfEmpty`-style insert seeds a fresh DB without overwriting.
- **Client content store + play wiring.** Add a content store analogous to
  `defStore`: load the active region/map/encounter at game start, fall back to the
  bundled seed on fetch failure. Wire play (`DungeonTacticsScene`, `pathfinding`,
  `turn`, `npc`, `pc`, spawn placement) to read board/structures/spawn zones from
  the store instead of the `map.ts` constants.
- **REST endpoints** to list/get region/map/encounter content (read path for play),
  mirroring the existing `/api/games/:slug/...` shape. No write/editor endpoints.
- **BREAKING — DB rename (unit-def tables).** Per the Persistence section, migrate
  `game_scenarios` → `game_dt_variants` and `game_unit_defs` → `game_dt_unit_defs`,
  rename the `scenario_id` column → `variant_id`, **drop the redundant `game_slug`
  column** (every DT table is single-game), and rename the
  `idx_game_scenarios_default` index. Update `TABLE_NAMES`, the repo SQL
  (`gameScenarios.ts` / `gameUnitDefs.ts`), and route wiring accordingly.
- **Out of scope (explicitly excluded):** the `/studio` design section, the map/
  encounter/wave editor UIs, the standalone Variant designer, and the second
  "Studio" nav tab. This change is persistence + play-wiring only; all authoring
  lands in a later change.

## Capabilities

### New Capabilities

- `dungeon-tactics-content-model`: The serializable Region / Map / Encounter entity
  shapes and their Zod validation — variable map size (4×4–16×16), per-region
  `terrainTypes`, structures, enemy/player spawn zones, and a single-wave encounter
  with atomic win/lose conditions. Defines the serialize/deserialize contract.
- `dungeon-tactics-content-persistence`: The `game_dt_regions` / `game_dt_maps` /
  `game_dt_encounters` tables, their repositories, the read-only REST endpoints,
  and the DB seed (`BUNDLED_MAP` port of `map.ts` via a `seedDefaultIfEmpty`-style
  insert that never overwrites existing content).
- `dungeon-tactics-content-store`: The client content store that loads the active
  region/map/encounter at game start with a bundled-seed fallback on fetch failure,
  and the rewiring of the play engine to read board/structures/spawn zones from the
  store instead of the `map.ts` constants.

### Modified Capabilities

- `persisted-unit-defs`: Rename the unit-def persistence tables and columns to the
  `game_dt_` prefix (`game_scenarios` → `game_dt_variants`, `game_unit_defs` →
  `game_dt_unit_defs`, `scenario_id` → `variant_id`) and drop the redundant
  `game_slug` column from the DT tables.

## Impact

- **Database / migrations** (`src/db.ts`): one rename migration (tables, columns,
  index) + three `CREATE TABLE` migrations + updates to `TABLE_NAMES`.
- **Backend repos & routes** (`src/repositories/sqlite/gameScenarios.ts`,
  `gameUnitDefs.ts`, new content repos, `src/repositories/interfaces.ts`,
  `src/routes/games.ts`, `src/app.ts`): renamed SQL for the variant tables, new
  content repositories + read endpoints, server-side seed-on-empty.
- **Client engine** (`client-games/src/games/dungeon-tactics-solo/`): new content
  store + `BUNDLED_MAP`; `map.ts` constants replaced by store reads across
  `DungeonTacticsScene.ts`, `pathfinding.ts`, `turn.ts`, `npc.ts`, `pc.ts`,
  `unitDefs.ts`, and the spawn-placement logic; `api.ts` gains content fetchers.
- **Validation**: shared Zod schemas for region/map/encounter writes (server) and
  reuse for client fallback parsing.
- **API docs** (`openapi.yaml`): add the new content read routes; reflect the
  variant-table rename where surfaced.
- **No deployment-config changes** (no new app/subdomain) and **no UI/nav changes**
  (studio excluded).
