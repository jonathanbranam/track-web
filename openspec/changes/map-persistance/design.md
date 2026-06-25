## Context

Dungeon Tactics' board lives as hardcoded constants in
`client-games/src/games/dungeon-tactics-solo/map.ts` (`INITIAL_MAP` as a
`Cell[][]`, plus `SPAWNER_POSITIONS`, `SPAWN_ZONE_LAYOUT`, `PC_START_TILES`,
`GRID_COLS/ROWS`). Many engine modules read those constants directly
(`DungeonTacticsScene.ts`, `pathfinding.ts`, `turn.ts`, `npc.ts`, `pc.ts`,
`unitDefs.ts`, and the spawn-placement logic).

Unit *stats* already follow the target pattern and are the template to mirror:

- **Server**: tables `game_scenarios` + `game_unit_defs` keyed by `(game_slug,
  scenario_id[, archetype])`; repos in `src/repositories/sqlite/`; a Zod schema +
  `BUNDLED_UNIT_DEFS` const in `src/games/dungeon-tactics/unitDefs.ts`;
  `unitDefRepo.seedDefaultIfEmpty(...)` called once from `src/index.ts`; read/write
  routes in `src/routes/games.ts`.
- **Client**: `defStore.ts` loads the default scenario from the server at game
  start, keeps the bundled `unitDefs.ts` table as an offline/error fallback, and
  remembers a per-browser active selection in `localStorage`. The engine reads
  stats *only* through the store's getters.

This change applies that exact shape to map content, and — per the proposal's
Persistence section — renames the unit-def tables to the `game_dt_` prefix while
it is in the same code.

## Goals / Non-Goals

**Goals:**

- Make the current board a serialized `Region → Map → Encounter` tree that
  round-trips through SQLite, validated by Zod on every write.
- Seed a fresh DB with a **faithful 1:1 port** of today's `map.ts` so the game
  plays byte-for-byte identically — a pure refactor whose verification bar is
  "nothing changed on screen."
- Give the client a content store (mirroring `defStore`) that loads the active
  map at game start and falls back to a bundled seed on fetch failure.
- Build **variable map size (4×4–16×16)** into the schema and validation now, so a
  later board shape is content, not new plumbing.
- Rename `game_scenarios`/`game_unit_defs` → `game_dt_variants`/`game_dt_unit_defs`
  (`scenario_id` → `variant_id`), drop the redundant `game_slug` column from the DT
  tables, and rename the default index — with a migration.

**Non-Goals:**

- **No authoring UI** of any kind: no `/studio` section, no map/encounter/wave
  editor, no relocated Variant designer, no "Studio" nav tab. Content is created
  only by the seed in this change.
- No write/PUT/POST content endpoints (read-only play path only).
- No multi-region/multi-map/multi-encounter navigation, no real wave triggers
  beyond the single immediate wave, no achievements behavior.
- No Phaser rendering work for non-16×8 boards (the seed stays 16×8; arbitrary
  aspect ratios are a later concern — see Open Questions).
- No "Variant" UI terminology rollout — the rename in this change is the DB/repo
  layer only.

## Decisions

### 1. Schema: identity columns + validated `def_json` blob, no `game_slug`

Each table carries identity/ordering as real columns (for listing/joins) and the
shaped payload as a single Zod-validated `def_json` TEXT column — exactly how
`game_unit_defs` stores `def_json` today. Because every DT table is single-game,
`game_slug` is dropped.

```
game_dt_regions    (region_id PK, name, theme, sort_order, def_json, created_at, updated_at)
game_dt_maps       (region_id, map_id, name, sort_order, def_json, …, PK (region_id, map_id))
game_dt_encounters (map_id, encounter_id, name, sort_order, def_json, …, PK (map_id, encounter_id))
```

- `sort_order` (not `order`) avoids the SQL reserved word.
- `def_json` holds: region → `terrainTypes`; map → `size`, `terrain` grid,
  `structures`, `enemySpawnZone`, `playerSpawnZone`; encounter → `waves`, `win`,
  `lose`, `achievements`.
- **Alternative considered — fully normalized columns** (a `tiles` table, a
  `structures` table): rejected. The grid/wave blobs are read whole, never queried
  by tile; normalization buys nothing and fights the established `def_json`
  precedent. Identity fields stay columns precisely so listing/ordering doesn't
  need to parse JSON.

### 2. Terrain grid and structures are stored *separately*, merged on deserialize

The engine's runtime type is `Cell[][]` (terrain + `hasStructure`/`structureHp`/
`structureKind` fused per cell). The persisted model follows `content_model.md`:
a `terrain: string[][]` grid plus a separate `structures: [{col,row,kind,hp}]`
list. The client content store's deserializer rebuilds `Cell[][]` by overlaying
structures onto the terrain grid; spawn zones become `Set<string>` of `"c,r"`
keys, reproducing `spawnZoneTiles()`.

- **Why**: matches the design doc, keeps structures editable as a list later, and
  keeps the grid a clean rectangle for resize/validation.
- **Alternative — persist `Cell[][]` verbatim**: rejected; it bakes the fused
  runtime shape into storage and makes structure edits a grid-wide rewrite.

### 3. Seed identity and faithful port

Seed one region / one map / one encounter, all id `default` (mirrors the
unit-def `'default'` scenario):

- **Region** `default`: `terrainTypes: ['plains','forest','water','stone']` (the
  current global set from `types.ts` becomes the seed region's enum), neutral
  `theme`.
- **Map** `default`: `size {cols:16, rows:8}`; `terrain` derived from
  `INITIAL_MAP`; `structures` from the five power-centers + tower;
  `enemySpawnZone` from `SPAWNER_POSITIONS`; `playerSpawnZone` from
  `SPAWN_ZONE_LAYOUT` (the `'Y'` tiles). `PC_START_TILES` are the default
  placements — kept as map content so placement is unchanged.
- **Encounter** `default`: a single wave, `start: immediate`, enemies = today's
  spawn manifest; `win: [clear-all-waves]`, `lose: [all-pcs-defeated]`.

A round-trip test asserts the deserialized seed reproduces the exact
`INITIAL_MAP`, spawner set, and spawn-zone set — this is the refactor's safety net.

### 4. Two bundled copies + a parity test (mirror the unit-def seam)

Following the existing `unitDefs.ts` dual-copy convention (the client and server
live in separate npm workspaces and cannot share a module):

- **Server** `src/games/dungeon-tactics/map.ts`: the authoritative Zod schemas
  (`regionSchema`, `mapSchema`, `encounterSchema`) + a `BUNDLED_MAP` const used by
  `seedDefaultIfEmpty`.
- **Client** `client-games/src/games/dungeon-tactics-solo/`: `BUNDLED_MAP` as the
  offline fallback (the refactored former `map.ts` data) consumed by the content
  store.
- A test (like `unitDefs.test.ts`) asserts `BUNDLED_MAP` satisfies the schema and
  that client/server seeds agree, so drift fails fast.

### 5. Rename via table-rebuild, not `DROP COLUMN`

`game_slug` is part of the primary key of both unit-def tables, so SQLite cannot
`ALTER TABLE … DROP COLUMN` it. The rename migration therefore **rebuilds**: create
`game_dt_variants` / `game_dt_unit_defs` with the new schema (PK `variant_id` /
`(variant_id, archetype)`, no `game_slug`), `INSERT … SELECT` the existing rows
(discarding the constant `game_slug`), recreate the default index as
`idx_game_dt_variants_default`, then `DROP` the old tables — all in one
transactional, id-guarded migration. Then update `TABLE_NAMES`, the repo SQL in
`gameScenarios.ts` / `gameUnitDefs.ts` (renamed to variant repos), and the
interface/route wiring.

- **Alternative — `ALTER TABLE RENAME` + `RENAME COLUMN`**: simpler but can't drop
  a PK column; would leave `game_slug` behind, missing a stated goal.

### 6. Content store mirrors `defStore`; engine reads only through it

A new `contentStore.ts` holds the active map in memory, populated by
`loadFromServer()` at game start (GET the default region/map/encounter), with
`BUNDLED_MAP` as the fallback when the fetch fails. Engine modules stop importing
`map.ts` constants and instead read board/`GRID_COLS`/`GRID_ROWS`/structures/spawn
zones from the store. `map.ts` is reduced to (or replaced by) the client
`BUNDLED_MAP`.

- **No `localStorage` active-content pointer yet.** `defStore` has one because the
  editor lets you pick a scenario; there is no content editor here, so the store
  always loads the server default. The pointer is deferred to the studio change.
- Because `GRID_COLS/ROWS` become dynamic, modules and tests that import them as
  constants switch to reading the loaded map's `size`; tests build their board from
  `BUNDLED_MAP`.

### 7. Read-only API + admin CLI parity

Add GET routes under the existing `/api/games/:slug/...` surface to list regions
and fetch a region's map(s)/encounter(s) for the play path. Per repo convention,
add matching **admin CLI** commands in `scripts/admin.ts` (commander,
`content:list-regions`, `content:show-map`, `content:show-encounter`, plus a
`content:seed` to force the seed), each supporting `--json`. No write endpoints or
write CLI — there is no authoring in this change.

## Risks / Trade-offs

- **Rename migration is destructive (drops old tables)** → Rebuild runs in a single
  transaction guarded by a migration id; copies all rows before dropping; take a DB
  backup (the existing admin backup/restore) before the deploy that ships it. Single
  user, tiny tables → low blast radius.
- **Two `BUNDLED_MAP` copies drift** (separate workspaces) → Parity/round-trip
  tests assert client seed == server seed == valid schema, same guard the unit-def
  seam already uses.
- **Engine still assumes 16×8 in rendering** once size is dynamic → Seed stays
  16×8 so behavior is unchanged; non-16×8 rendering is explicitly out of scope and
  flagged as an open question. Validation caps size at 16×16 to keep within the
  current Manhattan-span bounds (move/range max 22).
- **Wide refactor surface** (many modules import `map.ts`) → Keep the deserialized
  shape identical to today's constants (`Cell[][]`, `Set<string>` zones) so call
  sites change *where they read from*, not *what they read*; lean on the round-trip
  test and existing engine tests (`placement.test.ts`, `npc.test.ts`, etc.).
- **Validation gaps let a bad map persist** → A single Zod schema is the write
  authority (mirrors `unitDefSchema`): terrain values ∈ region `terrainTypes`,
  grid dimensions match `size`, structures/zones in bounds, conditions atomic
  (composite types rejected), `playerSpawnZone` larger than PC count.

## Migration Plan

1. Ship the rebuild migration (rename + drop `game_slug`) and the three
   `CREATE TABLE` migrations as new `MIGRATIONS` entries in `src/db.ts`; update
   `TABLE_NAMES` (remove `game_scenarios`/`game_unit_defs`; add the four
   `game_dt_*` tables).
2. On server start, migrations run in order; then `contentRepo.seedDefaultIfEmpty()`
   inserts `BUNDLED_MAP` (never overwriting existing content), alongside the
   existing unit-def seed.
3. Update repos/routes/interfaces and the client engine + content store in the same
   change; verify the game plays identically (pure-refactor bar).
4. **Rollback**: migrations are forward-only; recovery is restore-from-backup taken
   before deploy. The added content tables are additive and safe to leave if a
   later revert touches only client code.

## Open Questions

- **Variable-size rendering**: how the Phaser scene renders non-16×8 (portrait)
  boards on a phone is unresolved — deferred with the editor; the seed stays 16×8 so
  it isn't on this change's path.
- **Seed `theme` value**: the current map is generic (plains/forest/water/stone),
  not a themed biome — pick a neutral theme id (e.g. `classic`) for the seed region.
- **Encounter enemy manifest**: confirm the exact archetype/count of today's spawn
  behavior to encode as the single immediate wave (resolve against `npc.ts`/spawn
  logic during implementation).
