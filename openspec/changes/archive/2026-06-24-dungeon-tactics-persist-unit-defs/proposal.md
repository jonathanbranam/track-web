## Why

Stage 1 (`dungeon-tactics-data-driven-units`, merged) made unit behavior **data**
— a bundled `unitDefs.ts` table — but that data still lives in source, so tuning
a unit requires a code change, rebuild, and redeploy. This change is Stage 2 of
the unit framework (`docs/games/dungeon-tactics/unit_framework_plan.md`): move the
source of truth for unit definitions to the app's SQLite database, exposed through
the backend, so a designer can **edit definitions live during gameplay** through
an in-game admin panel and iterate on balance without touching code.

## What Changes

- Introduce **scenarios** — named, full sets of unit definitions (e.g. `default`,
  `slow-enemies`). A `game_scenarios` table (`game_slug`, `scenario_id`, `name`,
  `is_default`, timestamps; PK `(game_slug, scenario_id)`) lists them; exactly one
  scenario per game is the **default** (the canonical seed / fallback). Which
  scenario a client plays is a per-browser **active selection** (`localStorage`):
  picking one in the editor makes it active immediately and is remembered; the game
  starts on it, **Reset replays it**, and it falls back to the default when none is
  remembered. Creating a scenario copies an existing one's defs as its start point.
- Add a `game_unit_defs` SQLite table keyed **per scenario** (one row per
  archetype per scenario: `game_slug`, `scenario_id`, `archetype`, `def_json`,
  `updated_at`; PK `(game_slug, scenario_id, archetype)`) storing each `UnitDef` as
  a JSON document, so later stages add fields without a data migration. Validation
  is enforced at the API layer, not the table shape.
- **Seed on empty, code stays canonical:** the bundled `unitDefs.ts` remains the
  default. On startup the backend seeds a `default` scenario (marked default) from
  the bundled defaults rather than hardcoding seed data in a migration — so the
  current definitions are preserved as the default scenario.
- Add a server-side **Zod `UnitDef` schema** mirroring the Stage 1 interface,
  used to validate all writes and keep client/server shapes in sync.
- Add a `IGameUnitDefRepository` + SQLite implementation
  (`getAll` / `get` / `upsert` / `seedIfEmpty`).
- **Read endpoint (play path)** `GET /api/games/dungeon-tactics-solo/unit-defs`
  (session auth) resolving the **default scenario** and returning its full
  archetype set — the game never needs to know about scenarios.
- **Scenario + write endpoints** on the games router (session auth):
  `GET .../scenarios` (list), `POST .../scenarios` (create + name, copying an
  existing scenario), `GET .../scenarios/:scenario/unit-defs`,
  `PUT .../scenarios/:scenario/unit-defs/:archetype` (single) and bulk
  `PUT .../scenarios/:scenario/unit-defs`, and `PUT .../scenarios/:scenario/default`
  (set which scenario plays). All bodies Zod-validated. **No admin gate for now:**
  any logged-in user may edit (session auth only); the endpoints are structured so
  an admin restriction can be reintroduced later without reshaping the API.
- **Client def source moves to an in-memory store** loaded once at game start via
  the GET; the engine reads from this store. The bundled `unitDefs.ts` table
  remains the **fallback** when the fetch fails (game stays playable on error /
  offline).
- **Remove `statOverrides.ts`** (the admin-mode session-override layer). The loaded
  store becomes the single read seam: `pc.ts`, `npc.ts`, and `DungeonTacticsScene.ts`
  read hp / move / damage / footprint from the store. Admin-mode's popup hp/move
  edits write through to the store and persist to the current scenario.
- **In-game editor panel** (rendered inside `client-games`, available to any
  logged-in user) for live editing, with a **scenario picker** (lists scenarios,
  marks the default), **"+ New scenario"** (create + name, copying the selected
  scenario's defs), and **"Set as default"** (choose the canonical fallback).
  **Picking a scenario makes it the active one** — it swaps the in-memory store
  immediately (HP reconciled by the max-HP delta, floored at 1) and is remembered
  per browser; **Reset replays the active scenario**. Editing the active scenario
  (a) mutates the store so the change applies **immediately** with no reload, and
  (b) calls the PUT to persist. The game does not poll or re-fetch. A **"Reload
  from server"** control re-runs the load path (active scenario, default fallback)
  to discard unsaved edits and re-sync.
- Update `openapi.yaml` (new routes) and `llm-context.md` (feature note).
- **Out of scope (later stages):** any new `UnitDef` fields or mechanics — damage
  types, friendly fire, status, new targeting/traversal, loft/on_land, forced
  movement (Stages 3–6). This change moves the existing Stage 1 schema to disk and
  makes it live-editable; it does not extend the schema.

### Builds on Stage 1 and admin-mode (both merged)

- The bundled `unitDefs.ts` from Stage 1 becomes the **seed / fallback**, no longer
  the runtime source. The engine continues to derive behavior from a def table; the
  table is now backed by the loaded in-memory store.
- `dungeon-tactics-admin-mode` shipped a **session-scoped, in-memory** override of
  `maxHp` / `moveRange` (`statOverrides.ts`, lost on reload, never persisted). Stage 2
  introduces a **persistent, full-`UnitDef`** editing path that supersedes it, so
  **`statOverrides.ts` is removed** and the loaded def store becomes the single read
  seam. The admin-mode popup's hp/move edits now persist to the current scenario
  instead of being session-only (immediate-apply + the HP-follows-maxHP rule are
  kept). This **modifies** the merged `dungeon-tactics-admin-mode` capability — see
  Modified Capabilities.
- **Permissioning:** for now there is **no admin gate** on either the editor panel
  or the write API — any logged-in user may edit, matching the project's equal-
  rights default. A restriction can be layered on later.

## Capabilities

### New Capabilities
- `persisted-unit-defs`: Dungeon Tactics unit definitions are stored in SQLite as
  per-archetype JSON, organized into named **scenarios** with exactly one default
  per game; play always loads the default scenario. Definitions are seeded from the
  bundled defaults into a `default` scenario, served over a session-authed read API
  (default scenario) and validated scenario/write APIs (any logged-in user — no
  admin gate for now), loaded by the client into an in-memory store the engine
  reads from (bundled table as fallback), and live-editable through an in-game
  editor panel with a scenario picker / create-name / set-default that applies
  edits to the loaded scenario immediately and persists them.

### Modified Capabilities
- `dungeon-tactics-admin-mode`: the session-scoped override layer (`statOverrides.ts`)
  is removed in favor of persistent scenario editing. The **"Overrides are
  session-scoped"** requirement is **removed** (edits now persist), and **"Overrides
  drive the engine immediately"** is reworded to read from the loaded def store rather
  than the override maps. The Admin toggle, the in-popup hp/move editing, per-archetype
  application, and the immediate-apply / HP-follows-maxHP behavior are preserved.

<!-- data-driven-unit-defs is NOT modified: it requires behavior be derived from a
     UnitDef table with no per-archetype branching; that holds unchanged — only the
     table's backing source moves from a bundled import to a loaded store, which the
     new persisted-unit-defs capability owns. -->

## Impact

- **Backend (`src/`):** `db.ts` (+ `game_scenarios` and `game_unit_defs`
  migrations, `TABLE_NAMES` entries), `repositories/interfaces.ts`
  (+ `IGameScenarioRepository`, `IGameUnitDefRepository`),
  `repositories/sqlite/gameScenarios.ts` + `gameUnitDefs.ts` (NEW),
  `routes/games.ts` (+ GET read, scenario + write routes, session auth), a shared
  `UnitDef` Zod schema, and startup seed-default-if-empty.
- **Client (`client-games/`):** `api.ts` (+ fetch/persist unit-defs + scenario
  calls); the dungeon-tactics-solo def source becomes an in-memory store loaded
  from the default scenario (bundled table = fallback) and read by the engine;
  **`statOverrides.ts` deleted** with `pc.ts` / `npc.ts` / `DungeonTacticsScene.ts`
  re-pointed at the store; a NEW in-game editor panel with scenario picker
  (write-through, any logged-in user).
- **DB:** new `game_scenarios` + `game_unit_defs` tables; seeded from code (a
  `default` scenario), no data baked into the migration. Rollback drops the tables;
  the bundled fallback keeps the game playable.
- **Docs / API surface:** `openapi.yaml`, `llm-context.md`, and the Stage 2
  checklist in `unit_framework_plan.md`.
- **Dependencies:** none new on the server (Zod is already used); no Caddy/deploy
  topology changes (reuses existing games + admin routers and the SQLite DB).
