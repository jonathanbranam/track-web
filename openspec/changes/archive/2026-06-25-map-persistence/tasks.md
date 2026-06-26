## 1. DB migration — rename unit-def tables, drop `game_slug`

- [x] 1.1 Add a rebuild migration in `src/db.ts` that creates `game_dt_variants` (PK `variant_id`, columns `name`, `is_default`, `created_at`, `updated_at`) and `INSERT … SELECT`s existing `game_scenarios` rows (dropping `game_slug`, `scenario_id` → `variant_id`)
- [x] 1.2 In the same migration, create `game_dt_unit_defs` (PK `(variant_id, archetype)`, columns `def_json`, `updated_at`) and `INSERT … SELECT` existing `game_unit_defs` rows (dropping `game_slug`, `scenario_id` → `variant_id`)
- [x] 1.3 Recreate the default index as `idx_game_dt_variants_default`, then `DROP` the old `game_scenarios` / `game_unit_defs` tables — all inside one transactional, id-guarded migration
- [x] 1.4 Update `TABLE_NAMES`: remove `game_scenarios` / `game_unit_defs`, add `game_dt_variants` / `game_dt_unit_defs`
- [x] 1.5 Update repo SQL: rename/retarget `gameScenarios.ts` and `gameUnitDefs.ts` to the new table/column names (`variant_id`, no `game_slug`); update `seedDefaultIfEmpty` SQL
- [x] 1.6 Update `src/repositories/interfaces.ts` and route/wiring in `src/routes/games.ts` + `src/app.ts` for the renamed repos (keep the `/scenarios` API surface — DB-layer rename only)
- [x] 1.7 Add/adjust a migration test verifying prior `game_scenarios` / `game_unit_defs` rows are preserved in the new tables keyed by `variant_id`

## 2. Content data model + Zod schemas (server authority)

- [x] 2.1 Create `src/games/dungeon-tactics/map.ts` with `regionSchema`, `mapSchema`, `encounterSchema` (Zod) mirroring `content_model.md`
- [x] 2.2 Enforce in the schema: `size` cols/rows in `[4,16]`; terrain grid is exactly `rows × cols`; terrain values ∈ region `terrainTypes`; objects `{col,row,kind,hp?}` (hp optional) in bounds; spawn-zone tiles in bounds; `playerSpawnZone` larger than the PC count
- [x] 2.3 Enforce atomic-only conditions and wave triggers (`immediate` / `after-prev-cleared` / `after-turns`); reject composite (`all-of`/`any-of`) types
- [x] 2.4 Add `BUNDLED_MAP` (server) — one Region/Map/Encounter, a faithful 16×8 port of the current board (terrain from `INITIAL_MAP`, power centers + tower as `objects` with hp, `enemySpawnZone` from `SPAWNER_POSITIONS`, `playerSpawnZone` from the authored layout, single immediate wave, `clear-all-waves` / `all-pcs-defeated`)
- [x] 2.5 Add a test asserting `BUNDLED_MAP` satisfies the schemas (parity guard, like `unitDefs.test.ts`)

## 3. Content persistence — tables, repo, seed

- [x] 3.1 Add migrations creating `game_dt_regions`, `game_dt_maps`, `game_dt_encounters` (identity/ordering columns + `def_json`, no `game_slug`); add all three to `TABLE_NAMES`
- [x] 3.2 Add a content repository (interface in `repositories/interfaces.ts` + SQLite impl) with list/get reads and a `seedDefaultIfEmpty(...)` that inserts `BUNDLED_MAP` without overwriting existing content
- [x] 3.3 Validate every persisted write through the Zod schemas in the repo/seed path
- [x] 3.4 Call the content `seedDefaultIfEmpty(...)` from `src/index.ts` alongside the existing unit-def seed
- [x] 3.5 Add a round-trip test: the deserialized seed reproduces the exact prior board, structure HP, spawner set, and spawn-zone set

## 4. Read-only content API

- [x] 4.1 Add logged-in `GET` routes under `/api/games/dungeon-tactics-solo/...` to list regions and return a region's map(s) and a map's encounter(s); reject unauthenticated with `401`
- [x] 4.2 Add a route test covering the read path and the `401` case (no write endpoints in this change)

## 5. Admin CLI

- [x] 5.1 Add `content:list-regions`, `content:show-map`, `content:show-encounter`, and `content:seed` commands in `scripts/admin.ts`, each (where it returns data) supporting `--json`
- [x] 5.2 Verify `content:seed` inserts the bundled content only when the store is empty

## 6. Client content store + play wiring

- [x] 6.1 Add client `BUNDLED_MAP` (the refactored former `map.ts` data) and matching client-side shape types in `client-games/src/games/dungeon-tactics-solo/`
- [x] 6.2 Add `contentStore.ts` (mirroring `defStore.ts`): `loadFromServer()` fetches the default Region/Map/Encounter; fall back to `BUNDLED_MAP` on fetch failure; no polling/re-fetch during play
- [x] 6.3 Implement the deserializer: overlay `objects` onto the terrain grid (object with `hp` → structure cell with HP/kind; without → inert), expose spawn zones as `Set<string>` tile keys, derive board dimensions from the loaded Map `size`
- [x] 6.4 Add content fetchers to `client-games/src/.../api.ts`
- [x] 6.5 Rewire engine consumers (`DungeonTacticsScene.ts`, `pathfinding.ts`, `turn.ts`, `npc.ts`, `pc.ts`, `unitDefs.ts`, spawn-placement) to read board / dimensions / objects / spawn zones from the content store instead of `map.ts` constants
- [x] 6.6 Replace `GRID_COLS`/`GRID_ROWS` constant imports with the loaded map's `size`; update affected tests (`placement.test.ts`, `npc.test.ts`, etc.) to build their board from `BUNDLED_MAP`
- [x] 6.7 Add a client parity/round-trip test asserting the client `BUNDLED_MAP` deserializes to the prior board and matches the server seed

## 7. Docs, build, and verification

- [x] 7.1 Update `openapi.yaml` with the new content read routes; reflect the variant-table rename where surfaced
- [x] 7.2 Update `llm-context.md` for the new content persistence/store and the scenario-table rename
- [x] 7.3 Update `README.md` with the new `content:*` admin CLI commands
- [x] 7.4 Run `npm run build:games` and `npm run build:server`; confirm zero TypeScript errors
- [x] 7.5 Run the full test suite; confirm existing and new tests pass
- [X] 7.6 Verify the game plays identically to before (pure-refactor bar): board, terrain, structures, enemy spawners, and player placement unchanged on a freshly seeded DB — _pending local visual verification by the user; data-level parity proven by the server round-trip + client deserializer tests_
