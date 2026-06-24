## 1. Shared schema and bundled defaults

- [x] 1.1 Add a shared `UnitDef` Zod schema (server-side) mirroring the Stage 1 `UnitDef` TS interface — `maxHp`; `movement.range`; `attack.damage`; `attack.targeting { mode, arc, minRange, maxRange }`; `attack.propagation { shape: 'single'|'line'|'plus', penetration: 'none'|'stop_at_first' }` — with sensible bounds (HP ≥ 1, ranges/damage/move ≥ 0, enum-constrained shape/penetration/mode/arc)
- [x] 1.2 Make the bundled archetype defaults available to the server seed (export the Stage 1 `unitDefs` shape from a shared module both the client table and the server seed can read, or duplicate intentionally with a sync note)
- [x] 1.3 Add a test asserting every bundled archetype default satisfies the `UnitDef` Zod schema (guards TS-interface/Zod drift)

## 2. Persistence layer (scenarios + per-scenario defs)

- [x] 2.1 Add migration `00XX_game_scenarios` in `src/db.ts` creating `game_scenarios (game_slug TEXT, scenario_id TEXT, name TEXT, is_default INTEGER, created_at TEXT, updated_at TEXT, PRIMARY KEY (game_slug, scenario_id))`; add to `TABLE_NAMES`
- [x] 2.2 Add migration `00XX_game_unit_defs` creating `game_unit_defs (game_slug TEXT, scenario_id TEXT, archetype TEXT, def_json TEXT, updated_at TEXT, PRIMARY KEY (game_slug, scenario_id, archetype))`; add to `TABLE_NAMES`
- [x] 2.3 Add `IGameScenarioRepository` to `repositories/interfaces.ts` — `list(slug)`, `create(slug, name, copyFromScenarioId?)` (copies defs, defaulting to the current default), `getDefault(slug)`, `setDefault(slug, scenarioId)` (clears prior default in one transaction so exactly one remains)
- [x] 2.4 Add `IGameUnitDefRepository` to `repositories/interfaces.ts` — `getAll(slug, scenarioId)`, `get(slug, scenarioId, archetype)`, `upsert(slug, scenarioId, archetype, def)`, `seedDefaultIfEmpty(slug, defaults)`
- [x] 2.5 Implement `repositories/sqlite/gameScenarios.ts` and `repositories/sqlite/gameUnitDefs.ts` against those interfaces (JSON-(de)serialize `def_json`; upsert refreshes `updated_at`; `create` copies source rows; `setDefault` maintains the single-default invariant)
- [x] 2.6 Implement `seedDefaultIfEmpty('dungeon-tactics-solo', <bundled defaults>)`: when the game has no scenarios, create a `default` scenario (`is_default = 1`) and seed its archetype rows from the bundled defaults; never overwrite an existing scenario. Wire it into server startup

## 3. API endpoints (session auth, no admin gate)

- [x] 3.1 Add `GET /api/games/dungeon-tactics-solo/unit-defs` in `routes/games.ts` (session auth) resolving the **default scenario** and returning its archetype defs (the play path); structure handlers so an admin check can be added later without reshaping routes
- [x] 3.2 Add `GET .../scenarios` (list `id`/`name`/`isDefault`) and `GET .../scenarios/:scenario/unit-defs` (one scenario's defs)
- [x] 3.3 Add `POST .../scenarios` — body `{ name, copyFrom? }`, creates a named scenario copying the source (default if omitted); returns the new scenario
- [x] 3.4 Add `PUT .../scenarios/:scenario/unit-defs/:archetype` (single) and bulk `PUT .../scenarios/:scenario/unit-defs` — Zod-validate, reject invalid `400`, upsert into the scenario
- [x] 3.5 Add `PUT .../scenarios/:scenario/default` — set that scenario as the default (clears the prior default)
- [x] 3.6 Confirm all endpoints require a logged-in session (`401` when unauthenticated) and require **no** admin role

## 4. Client def store and engine read source

- [x] 4.1 Add calls in `client-games/src/api.ts` for the default-scenario `GET unit-defs`, the scenario list/read, `POST scenarios`, the single/bulk `PUT` writes, and `PUT .../default`
- [x] 4.2 Add an in-memory def store in `dungeon-tactics-solo` loaded once at game start from the default-scenario GET; on fetch failure fall back to the bundled `unitDefs.ts` table
- [x] 4.3 **Remove `statOverrides.ts`** and make the in-memory store the single read seam: expose `getMaxHp`/`getMoveRange`/`getDef` (etc.) on the store and re-point `pc.ts` (`moveRange`, `attackDamage`, `attackFootprint`), `npc.ts` (`initialState` HP seeding), and `DungeonTacticsScene.ts` (HP pips / popup) to read from it. No engine read should import the bundled table directly except as the fallback seed
- [x] 4.4 Add a store "reload" routine that re-runs the load path (default scenario) and swaps the in-memory store; verify no polling / mid-session re-fetch is introduced

## 5. In-game editor panel with scenarios (any logged-in user)

- [x] 5.1 Add (or extend the admin-mode panel into) an in-game editor panel in `client-games` that edits the selected scenario's `UnitDef`s; not gated to an admin
- [x] 5.2 Add a scenario **picker** (dropdown) listing scenarios and marking the default; selecting one loads its defs into the editor (via the scenario read endpoint)
- [x] 5.3 Add **"+ New scenario"** (prompt for name → `POST scenarios` copying the selected scenario → select it) and **"Set as default"** (`PUT .../default`) controls
- [x] 5.4 On save, persist via PUT; when the edited scenario is the currently-loaded default, also mutate the in-memory store so the change applies immediately (no reload); editing a non-loaded scenario persists only
- [x] 5.5 Add a "Reload from server" control that re-runs the load path (default scenario), replacing the in-memory store and discarding unsaved edits
- [x] 5.6 Fold the admin-mode popup hp/move editing into the persistent path: its edits write through to the store + persist to the current scenario (no `statOverrides`), preserving immediate-apply and the "current HP follows max HP, floored at 1" rule. Update the `dungeon-tactics-admin-mode` tests/behavior accordingly (session-scoped override removed)

## 6. Verify and document

- [x] 6.1 Build passes: `npm run build` (client-games + server) with zero TypeScript errors
- [ ] 6.2 Fresh DB seeds a `default` scenario and the game plays identically to Stage 1 (reachable tiles, footprints, damage, 3-pip HP unchanged)
- [ ] 6.3 Editing the default scenario in the panel changes behavior immediately in the running session (in-memory), and the edit persists across a fresh load (backend PUT round-trip)
- [ ] 6.4 Creating + naming a new scenario copies the current defs; editing it and setting it as default makes play load it after a store reload; the picker shows which scenario is default
- [ ] 6.5 A failed/absent def fetch falls back to bundled defaults (game still loads and plays)
- [ ] 6.6 "Reload from server" re-syncs the in-memory store from persisted values and discards unsaved edits
- [x] 6.7 Endpoints reject invalid bodies (`400`) and unauthenticated requests (`401`); add backend route tests covering valid upsert, invalid body, unauthenticated, scenario create, and set-default (single-default invariant)
- [x] 6.8 Update `openapi.yaml` (new GET/POST/PUT routes) and note the feature in `llm-context.md`
- [x] 6.9 Check off the Stage 2 steps in `docs/games/dungeon-tactics/unit_framework_plan.md`
