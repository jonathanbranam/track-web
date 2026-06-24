# Unit Framework — Implementation Plan

A staged plan for migrating Dungeon Tactics Solo from hardcoded per-archetype
behavior to the data-driven unit framework described in
[`unit_framework.md`](./unit_framework.md).

The work is sliced into numbered stages. **Stage 1 is in scope right now.**
Stage 2 (persist definitions to SQLite) is fully specified below as the next
stage. Stages 3–6 are sketched at the bottom for context but are not started.

## Guiding decisions

- **Stage 1 is a pure refactor.** No new mechanics, no visible gameplay change.
  Acceptance is the existing spec scenario *"Game functions identically."*
- **Damage is deterministic.** Damage is a flat integer.
- **Action economy is already decided by the engine** (move up to range, one
  committal attack that locks the unit) and is NOT reopened by this work. The
  unit schema sits *under* that turn model.
- **Stage 1 encodes only the fields the six existing archetypes exercise.**
  Everything else from the framework (`traversal`, `layer`, `diagonal`,
  `passthrough`, `loft`, `on_land`, `status`, `terrain_effect`,
  `forced_movement`, `friendly_fire`) is deferred to later stages.
- **Definitions live in code first, then on disk.** Stage 1 defines the
  data-driven shape as a bundled TypeScript table; Stage 2 moves the source of
  truth to SQLite so a game designer can edit and iterate live.

---

## Stage 1 — Data-ify existing behavior

Replace the `switch (unitType)` branches in `pc.ts` and `npc.ts` with a single
`UnitDef` data table. The same nine units (4 PCs + 2 NPC archetypes) behave
bit-identically afterward.

### Current behavior to reproduce

| archetype          | maxHp | range | dmg | attack footprint (cardinal)              |
|--------------------|-------|-------|-----|------------------------------------------|
| melee              | 3     | 4     | 2   | `single`, dist 1                         |
| rogue              | 3     | 4     | 1   | `single`, dist 1                         |
| ranger             | 3     | 3     | 1   | `line`, dist 2→edge, stop at first       |
| magic-user         | 3     | 3     | 1   | `plus` (5 tiles), centered at dist 2     |
| short-range (npc)  | 3     | 3     | 1   | `single`, dist 1–2, stop at first        |
| long-range (npc)   | 3     | 3     | 1   | `line`, dist 2→edge, passes allies, stop |

All archetypes start at `maxHp: 3` today (a flat literal in the scene). It is
carried in `UnitDef` so per-archetype HP has a single canonical home — see the
admin-mode coordination note below.

### Steps

- [ ] **1.1. Define the `UnitDef` interface** in `types.ts` (minimal stage-1
      subset: `maxHp`; `movement.range`; `attack.damage`; `attack.targeting`
      `{ mode: 'direction', arc: 'cardinal', minRange, maxRange }`;
      `attack.propagation` `{ shape: 'single' | 'line' | 'plus', penetration: 'none' | 'stop_at_first' }`).
      `maxHp` replaces the flat literal `3` currently in the scene as the
      per-archetype default.
- [ ] **1.2. Create `unitDefs.ts`** — a `Record<PcType | NpcType, UnitDef>` table
      holding all six archetypes with values matching the table above.
- [ ] **1.3. Add a footprint helper** — one function that, given a `UnitDef`, an
      origin, and a direction, returns the attacked tiles (drives off
      `propagation.shape` + `targeting` range, no per-unit branching).
      `magic-user` uses the `plus` shape (orthogonal cross: center + 4 cardinal
      neighbors), which is a first-class framework shape distinct from `radius`
      (a 3×3 block) — no later reconciliation needed.
- [ ] **1.4. Rewire `pc.ts` reads:** `moveRange` → `def.movement.range`,
      `attackDamage` → `def.attack.damage`; `attackSquares()` and
      `resolveAttack()` → use the 1.3 footprint helper instead of their
      `switch (unitType)` blocks.
- [ ] **1.5. Rewire the max-HP source:** replace the flat literal `3` in
      `DungeonTacticsScene.ts` (`drawUnitPopup`'s `maxHp`, `drawHpPips`) and any
      HP clamping with `def.maxHp` for the unit's archetype, so the board, pips,
      and popup read max HP from data.
- [ ] **1.6. Rewire `npc.ts` reads:** pull range/damage and scan distance from the
      def. (Keep the AI scanner *loops* hardcoded for now — only the numbers and
      footprint come from data; fully data-driving the AI targeting is deferred.)
- [ ] **1.7. Remove the now-dead branch helpers** and confirm no
      `switch (unitType)` / `unitType === '…'` logic remains for stats, max HP, or
      attack shape.
- [ ] **1.8. Run existing tests** (`placement.test.ts`, `undo.test.ts`) — they
      should pass untouched.
- [ ] **1.9. Verify "plays identically"** — same reachable walk tiles, same attack
      footprints, same damage, and 3-pip HP for all nine units, via the running app.
- [ ] **1.10. Update `unit_framework.md`** to remove dice/randomness from the
      effect spec so the doc and implementation stay consistent.

### Files touched

```
types.ts                + UnitDef interface (incl. maxHp)
unitDefs.ts             NEW — the archetype table
pc.ts                   moveRange / attackDamage / attackSquares / resolveAttack
npc.ts                  findShortRangeTarget / findLongRangeTarget (numbers + footprint only)
DungeonTacticsScene.ts  max-HP source (drawUnitPopup, drawHpPips) reads def.maxHp
```

### Coordination with `dungeon-tactics-admin-mode` (in-flight)

The in-flight `dungeon-tactics-admin-mode` change adds a session-scoped
`statOverrides.ts` (per-`unitType` `maxHp` / `moveRange` maps) and makes
`moveRange(unit)` a thin delegate to `getMoveRange(unit.unitType)`, plus a new
`getMaxHp(unitType)` source. The two changes share the `pc.ts` stats seam and a
per-archetype stat representation, so they compose like this:

- `unitDefs.ts` is the **default** source; `statOverrides.ts` is a **session
  override layer** on top — `getMoveRange` / `getMaxHp` resolve to
  `override ?? unitDefs[type].movement.range` / `?? unitDefs[type].maxHp`.
- `maxHp` lives in `UnitDef` as the canonical per-archetype default (this change)
  and admin-mode edits override it for the session.
- `moveRange(unit)` stays a **delegate** — this refactor removes per-archetype
  branching and must not re-introduce a `switch`. Whichever change merges second
  reconciles to: defaults in `unitDefs.ts`, overrides in `statOverrides.ts`.
- This change is **default-data only** — no Admin toggle, editing UI, or override
  behavior (those belong to `dungeon-tactics-admin-mode`).

### Acceptance

- [ ] Build passes (`npm run build`).
- [ ] Existing undo + placement tests pass.
- [ ] All nine units behave bit-identically to pre-refactor (manual verify),
      including 3-pip HP display.
- [ ] No per-archetype `switch`/`if unitType ===` remains for stats, max HP, or
      attack shape.
- [ ] `moveRange(unit)` and the max-HP source remain delegate-friendly (no
      branching) so admin-mode's override layer composes cleanly.

---

## Stage 2 — Persist unit definitions in SQLite (live-editable, scenario-based)

Move the source of truth for unit definitions from the bundled `unitDefs.ts`
table to the SQLite database, exposed through the existing backend so a game
designer can edit and iterate on definitions **live during gameplay** via the
in-game editor panel. The bundled table from Stage 1 becomes the seed / fallback,
not the runtime source.

Definitions are organized into **scenarios** — named, full sets of unit
definitions (e.g. `default`, `slow-enemies`, `glass-cannons`). A designer can
create and name new scenarios and edit every archetype within one. Exactly one
scenario per game is the **default**, and **play always loads the default
scenario**; to change what plays, the editor sets a different scenario as the
default. The current/bundled definitions are seeded as the default scenario.

See the persistence design in
[`unit_framework.md` → "Persisting unit definitions"](./unit_framework.md#persisting-unit-definitions)
for the base storage shape and API contract this stage builds on.

### Design summary

- **No admin gate (for now).** Reads and writes require a logged-in session but
  **no admin role** — any logged-in user may edit (the project's equal-rights
  default). Endpoints live on the games router (`routes/games.ts`), structured so
  an admin restriction can be layered on later without reshaping the API. The
  existing in-game **Admin/editor panel** (the "Admin" button from
  `dungeon-tactics-admin-mode`) is the editing surface and is shown to all
  logged-in users.
- **Scenarios:** a `game_scenarios` table —
  `(game_slug, scenario_id, name, is_default INTEGER, created_at, updated_at)`,
  PK `(game_slug, scenario_id)` — lists named scenarios per game; exactly one row
  has `is_default = 1`. Creating a scenario copies an existing scenario's defs
  (the default, unless told otherwise) as its starting point.
- **Storage:** one row per archetype **per scenario** in `game_unit_defs` —
  `(game_slug, scenario_id, archetype, def_json TEXT, updated_at)`, PRIMARY KEY
  `(game_slug, scenario_id, archetype)`. Each `def_json` is the JSON-serialized
  `UnitDef`. Per-archetype rows (rather than one blob) give clean upserts and let
  the editor save one unit at a time.
- **Seed on empty, code stays canonical:** the bundled `unitDefs.ts` remains the
  default. On first load the backend seeds a `default` scenario (`is_default = 1`)
  from the bundled defaults rather than hardcoding seed data in a migration — so
  adding a field in a later stage doesn't require a data migration, and the
  current definitions are preserved as the default scenario.
- **Load path (players):** `GET /api/games/dungeon-tactics-solo/unit-defs`
  resolves the **default scenario** and returns its full set. The client fetches
  **once at game start** into an in-memory def store, and falls back to the
  bundled table if the request fails (keeps the game playable offline / on error).
  The game itself never needs to know about scenarios — it always gets the default.
- **Single read seam (removes `statOverrides.ts`):** the in-memory def store is the
  one place the engine reads stats from. The Stage 1 / admin-mode session-override
  module (`statOverrides.ts`, in-memory `maxHp` / `moveRange`, lost on reload) is
  **removed** as redundant; `pc.ts`, `npc.ts`, and `DungeonTacticsScene.ts` read
  from the store. The admin-mode popup's hp/move edits now write through to the
  store and **persist** to the current scenario (immediate-apply and the
  "current HP follows max HP, floored at 1" rule preserved).
- **Scenario + write API (designer), session-authed:**
  - `GET .../scenarios` — list scenarios (`id`, `name`, `isDefault`).
  - `POST .../scenarios` — create + name a scenario (body `{ name, copyFrom? }`;
    copies `copyFrom`'s defs, defaulting to the current default scenario).
  - `GET .../scenarios/:scenario/unit-defs` — one scenario's defs (editor view).
  - `PUT .../scenarios/:scenario/unit-defs/:archetype` and bulk
    `PUT .../scenarios/:scenario/unit-defs` — Zod-validated upserts within a scenario.
  - `PUT .../scenarios/:scenario/default` — set that scenario as the default (the
    one play loads); clears the prior default. This is how the admin UI "changes"
    what plays.
- **Live editing = in-memory write-through, no re-fetch.** Editing happens in the
  in-game editor panel (rendered inside `client-games`) so it shares the running
  game's runtime. Editing the **currently-loaded (default) scenario** mutates the
  in-memory def store directly — taking effect immediately, no reload — *and*
  calls the backend PUT to persist. Editing a **non-loaded** scenario persists via
  PUT but does not change the running session; it takes effect when that scenario
  is made default and the store reloads. The game does **not** poll or re-fetch.
  - *Editor location note:* the panel lives in `client-games`, not the separate
    `client-admin` app, precisely because a separate bundle would not share the
    game's in-memory defs and would require a reload to see changes.
  - A **"Reload from server"** button re-runs the load path (for the default
    scenario) to discard unsaved in-memory edits / re-sync from persisted values.

### Editor UX

- A **scenario picker** (dropdown) lists scenarios and marks which is the default.
  Selecting one loads its defs into the editor for viewing/editing.
- **"+ New scenario"** prompts for a name and creates it by copying the selected
  scenario's defs, then selects it for editing.
- **"Set as default"** marks the selected scenario as the default — what the game
  loads on play. Reloading the store then plays that scenario.
- Editing fields of the selected scenario saves write-through (immediate in-memory
  effect when editing the loaded default) + persists via PUT.

### Steps

- [x] **2.1. Add migrations** `00XX_game_scenarios` and `00XX_game_unit_defs` in
      `src/db.ts` (defs keyed by `scenario_id`); add both to `TABLE_NAMES`.
- [x] **2.2. Define a shared `UnitDef` Zod schema** (server-side) mirroring the
      Stage 1 interface; use it for validation on writes and to keep the client
      and server shapes in sync.
- [x] **2.3. Add repositories** — `IGameScenarioRepository` (`list`, `create`,
      `getDefault`, `setDefault`) and `IGameUnitDefRepository`
      (`getAll(slug, scenario)`, `get(slug, scenario, archetype)`,
      `upsert(slug, scenario, archetype, def)`, `seedDefaultIfEmpty(slug, defaults)`).
- [x] **2.4. Seed-if-empty on startup** — create the `default` scenario
      (`is_default`) from the bundled Stage 1 defaults (export the defaults from a
      shared module both the bundled client table and the seed can read).
- [x] **2.5. Read endpoint** `GET /api/games/dungeon-tactics-solo/unit-defs` in
      `routes/games.ts` (session auth) resolving the default scenario's defs.
- [x] **2.6. Scenario + write endpoints** in `routes/games.ts` (session auth, no
      admin gate): `GET .../scenarios`, `POST .../scenarios` (create+name, copy),
      `GET .../scenarios/:scenario/unit-defs`,
      `PUT .../scenarios/:scenario/unit-defs/:archetype`, bulk
      `PUT .../scenarios/:scenario/unit-defs`, and
      `PUT .../scenarios/:scenario/default` — all Zod-validated where they take a body.
- [x] **2.7. Client loads defs into an in-memory store** at game start via
      `client-games/src/api.ts` (the default-scenario GET), replacing the direct
      import of the bundled table as the runtime source; keep the bundled table as
      the fallback on fetch failure. **Remove `statOverrides.ts`** and re-point
      `pc.ts`, `npc.ts`, and `DungeonTacticsScene.ts` to read from this store (one
      read seam). This modifies the `dungeon-tactics-admin-mode` capability — its
      "session-scoped overrides" requirement is removed, hp/move edits now persist.
- [x] **2.8. In-game editor panel** (in `client-games`, no admin gate) with the
      scenario picker + create/name + set-default controls that edits the selected
      scenario's defs. On save, edits to the loaded default scenario (a) mutate the
      in-memory store so the change applies immediately, and (b) call the PUT to
      persist; edits to other scenarios persist only. No re-fetch to apply changes.
- [x] **2.9. "Reload from server" control** in the panel that re-runs the load path
      (default scenario) to discard unsaved in-memory edits and re-sync.
- [x] **2.10. Update API surface docs** — add the new routes to `openapi.yaml`
      and note the feature in `llm-context.md`.

### Files touched

```
src/db.ts                                  + migrations, TABLE_NAMES entries
src/repositories/interfaces.ts             + IGameScenarioRepository, IGameUnitDefRepository
src/repositories/sqlite/gameScenarios.ts   NEW — scenario repository
src/repositories/sqlite/gameUnitDefs.ts    NEW — per-scenario def repository
src/routes/games.ts                        + GET unit-defs, scenario + write routes (session auth)
client-games/src/api.ts                    + fetch/persist unit-defs + scenario calls
client-games/.../dungeon-tactics-solo/     in-memory def store (engine reads it),
                                           loaded from default scenario, bundled table = fallback
client-games/.../dungeon-tactics-solo/     in-game editor panel + scenario picker (write-through)
openapi.yaml, llm-context.md               doc updates
```

### Acceptance

- [x] Build passes; `npm run build` (client-games, server).
- [x] Fresh DB seeds a `default` scenario from the bundled defaults; game plays
      identically to Stage 1.
- [x] Editing the default scenario in the editor panel changes behavior
      **immediately in the running session** (in-memory), without a reload, and
      persists (survives a fresh load) via the backend PUT.
- [x] Creating + naming a new scenario copies the current defs; editing it and
      setting it as default makes play load it after a store reload.
- [x] The scenario picker lists scenarios and shows which is the default.
- [x] A failed/absent def fetch falls back to bundled defaults (game still loads).
- [x] "Reload from server" re-syncs the in-memory store from persisted values.
- [x] Write/scenario endpoints reject invalid bodies (`400`) and unauthenticated
      requests (`401`); they require no admin role.
- [x] New routes appear in `openapi.yaml`.

---

## Later stages (not in scope — context only)

These build on the Stage 1 schema (now DB-backed after Stage 2); each adds
fields and the single place that reads them, without reintroducing per-unit
branches. Each new field flows through the Stage 2 storage/admin path
automatically once the schema is extended.

- **Stage 3 — Richer effects:** damage type, `friendly_fire` (resolution hits
  every unit in footprint, then filters by allegiance), `status` +
  `status_duration`, `terrain_effect`.
- **Stage 4 — Targeting modes:** `tile` / `tile_line` / `self`, `min`/`max_range`,
  `requires_los`, `arc` (diagonal/both). Reworks the Phaser attack-input loop
  (tap-a-tile vs pick-a-direction) and `PcPlan` / `PcAction`.
- **Stage 5 — Movement generalization:** `traversal`, `layer`, `diagonal`,
  `passthrough` (path-through vs stop-on), per-terrain `movement_costs`. Turns
  the cardinal BFS into a weighted (Dijkstra) search; gives terrain mechanics.
- **Stage 6 — Advanced propagation:** `loft`, `on_land` (rolling boulder /
  shockwave), `forced_movement` (knockback into walls/units with collision
  damage).

### Doc inconsistencies to resolve before encoding later stages

- `passthrough` table uses `allied_units` / `enemy_units`, but examples use
  `ground_units` (undefined value).
- Wraith mixes `layer: ethereal` with `passthrough: ["any"]` — two mechanisms
  for one idea; pick one.
- `applies_at` vs `on_land_effect` vs `splash_radius` overlap (three ways to say
  "also hit nearby tiles") — collapse.
- `propagation.range` duplicates `targeting.max_range` in every example — likely
  redundant.
