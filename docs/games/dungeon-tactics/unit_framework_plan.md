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

| archetype          | range | dmg | attack footprint (cardinal)              |
|--------------------|-------|-----|------------------------------------------|
| melee              | 4     | 2   | `single`, dist 1                         |
| rogue              | 4     | 1   | `single`, dist 1                         |
| ranger             | 3     | 1   | `line`, dist 2→edge, stop at first       |
| magic-user         | 3     | 1   | `plus` (5 tiles), centered at dist 2     |
| short-range (npc)  | 3     | 1   | `single`, dist 1–2, stop at first        |
| long-range (npc)   | 3     | 1   | `line`, dist 2→edge, passes allies, stop |

### Steps

- [ ] **1.1. Define the `UnitDef` interface** in `types.ts` (minimal stage-1
      subset: `movement.range`; `attack.damage`; `attack.targeting`
      `{ mode: 'direction', arc: 'cardinal', minRange, maxRange }`;
      `attack.propagation` `{ shape: 'single' | 'line' | 'plus', penetration: 'none' | 'stop_at_first' }`).
- [ ] **1.2. Create `unitDefs.ts`** — a `Record<PcType | NpcType, UnitDef>` table
      holding all six archetypes with values matching the table above.
- [ ] **1.3. Add a footprint helper** — one function that, given a `UnitDef`, an
      origin, and a direction, returns the attacked tiles (drives off
      `propagation.shape` + `targeting` range, no per-unit branching). Reconcile
      `magic-user`'s `plus` as a named shape for now (note: maps to `radius:1` in
      the full framework — defer that unification to Stage 4).
- [ ] **1.4. Rewire `pc.ts` reads:** `moveRange` → `def.movement.range`,
      `attackDamage` → `def.attack.damage`; `attackSquares()` and
      `resolveAttack()` → use the 1.3 footprint helper instead of their
      `switch (unitType)` blocks.
- [ ] **1.5. Rewire `npc.ts` reads:** pull range/damage and scan distance from the
      def. (Keep the AI scanner *loops* hardcoded for now — only the numbers and
      footprint come from data; fully data-driving the AI targeting is deferred.)
- [ ] **1.6. Remove the now-dead branch helpers** and confirm no
      `switch (unitType)` / `unitType === '…'` logic remains for stats or attack
      shape.
- [ ] **1.7. Run existing tests** (`placement.test.ts`, `undo.test.ts`) — they
      should pass untouched.
- [ ] **1.8. Verify "plays identically"** — same reachable walk tiles, same attack
      footprints, and same damage for all nine units, via the running app.
- [ ] **1.9. Update `unit_framework.md`** to remove dice/randomness from the
      effect spec so the doc and implementation stay consistent.

### Files touched

```
types.ts      + UnitDef interface
unitDefs.ts   NEW — the archetype table
pc.ts         moveRange / attackDamage / attackSquares / resolveAttack
npc.ts        findShortRangeTarget / findLongRangeTarget (numbers + footprint only)
```

### Acceptance

- [ ] Build passes (`npm run build`).
- [ ] Existing undo + placement tests pass.
- [ ] All nine units behave bit-identically to pre-refactor (manual verify).
- [ ] No per-archetype `switch`/`if unitType ===` remains for stats or attack shape.

---

## Stage 2 — Persist unit definitions in SQLite (live-editable)

Move the source of truth for unit definitions from the bundled `unitDefs.ts`
table to the SQLite database, exposed through the existing backend so a game
designer can edit and iterate on definitions **live during gameplay** via an
admin interface. The bundled table from Stage 1 becomes the seed / fallback,
not the runtime source.

See the persistence design in
[`unit_framework.md` → "Persisting unit definitions"](./unit_framework.md#persisting-unit-definitions)
for the storage shape and API contract this stage implements.

### Design summary

- **Storage:** one row per archetype in a new `game_unit_defs` table —
  `(game_slug, archetype, def_json TEXT, updated_at)`, PRIMARY KEY
  `(game_slug, archetype)`. Each `def_json` is the JSON-serialized `UnitDef`.
  Per-archetype rows (rather than one blob) give clean upserts and let the admin
  edit one unit at a time.
- **Seed on empty, code stays canonical:** the bundled `unitDefs.ts` remains the
  default. On first load (or when a row is missing) the backend seeds the table
  from the bundled defaults rather than hardcoding seed data in a migration —
  so adding a field in a later stage doesn't require a data migration.
- **Load path (players):** a public `GET /api/games/dungeon-tactics-solo/unit-defs`
  returns the full set. The client fetches **once at game start** into an
  in-memory def store, and falls back to the bundled table if the request fails
  (keeps the game playable offline / on error).
- **Write path (designer):** admin-only
  `PUT /api/admin/games/dungeon-tactics-solo/unit-defs/:archetype` (and a bulk
  `PUT .../unit-defs`) validate against a Zod schema mirroring `UnitDef` and
  upsert the row. Reuses the existing `/api/admin/games` router (admin = userId 1).
- **Live editing = in-memory write-through, no re-fetch.** Editing happens in an
  **in-game admin panel** (rendered inside `client-games`, gated to the admin)
  so it shares the running game's runtime. An edit mutates the in-memory def
  store directly — taking effect immediately, no reload — *and* calls the backend
  PUT to persist. The game does **not** poll or re-fetch to pick up changes.
  - *Editor location note:* the panel lives in `client-games`, not the separate
    `client-admin` app, precisely because a separate bundle would not share the
    game's in-memory defs and would require a reload to see changes.
  - An optional **"Reload from server"** button re-runs the load path to discard
    unsaved in-memory edits / re-sync from the persisted values.

### Steps

- [ ] **2.1. Add migration** `00XX_game_unit_defs` in `src/db.ts` creating the
      `game_unit_defs` table; add `game_unit_defs` to `TABLE_NAMES`.
- [ ] **2.2. Define a shared `UnitDef` Zod schema** (server-side) mirroring the
      Stage 1 interface; use it for validation on writes and to keep the client
      and server shapes in sync.
- [ ] **2.3. Add a repository** `repositories/sqlite/gameUnitDefs.ts` implementing
      an `IGameUnitDefRepository` interface (`getAll(slug)`, `get(slug, archetype)`,
      `upsert(slug, archetype, def)`, `seedIfEmpty(slug, defaults)`).
- [ ] **2.4. Seed-if-empty on startup** from the bundled Stage 1 defaults (export
      the defaults from a shared module both the bundled client table and the
      seed can read, or duplicate intentionally with a note).
- [ ] **2.5. Public read endpoint** `GET /api/games/dungeon-tactics-solo/unit-defs`
      in `routes/games.ts` returning all archetype defs.
- [ ] **2.6. Admin write endpoints** in `routes/admin/games.ts`:
      `GET .../unit-defs`, `PUT .../unit-defs/:archetype`, and bulk
      `PUT .../unit-defs` — all Zod-validated, admin-guarded.
- [ ] **2.7. Client loads defs into an in-memory store** at game start via
      `client-games/src/api.ts` (the public GET), replacing the direct import of
      the bundled table as the runtime source; keep the bundled table as the
      fallback on fetch failure. The engine reads from this in-memory store.
- [ ] **2.8. In-game admin panel** (in `client-games`, admin-gated) that edits
      the in-memory def store. On save, each edit (a) mutates the in-memory store
      so the change applies immediately, and (b) calls the admin PUT to persist.
      No re-fetch is performed to apply changes.
- [ ] **2.9. "Reload from server" control** (optional) in the panel that re-runs
      the load path to discard unsaved in-memory edits and re-sync from persisted
      values.
- [ ] **2.10. Update API surface docs** — add the new routes to `openapi.yaml`
      and note the feature in `llm-context.md`.

### Files touched

```
src/db.ts                                  + migration, TABLE_NAMES entry
src/repositories/interfaces.ts             + IGameUnitDefRepository
src/repositories/sqlite/gameUnitDefs.ts    NEW — repository
src/routes/games.ts                        + public GET unit-defs
src/routes/admin/games.ts                  + admin GET/PUT unit-defs
client-games/src/api.ts                    + fetch + persist unit-defs
client-games/.../dungeon-tactics-solo/     in-memory def store (engine reads it),
                                           loaded from API, bundled table = fallback
client-games/.../dungeon-tactics-solo/     NEW — in-game admin panel (write-through)
openapi.yaml, llm-context.md               doc updates
```

### Acceptance

- [ ] Build passes; `npm run build` (client-games, server).
- [ ] Fresh DB seeds defaults; game plays identically to Stage 1.
- [ ] Editing a def in the in-game admin panel changes the corresponding behavior
      **immediately in the running session** (in-memory), without a reload, and
      the change persists (survives a fresh load) via the backend PUT.
- [ ] A failed/absent def fetch falls back to bundled defaults (game still loads).
- [ ] "Reload from server" re-syncs the in-memory store from persisted values.
- [ ] New routes appear in `openapi.yaml`.

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
  (tap-a-tile vs pick-a-direction) and `PcPlan` / `PcAction`. Unify
  `magic-user` `plus` into `radius`.
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
