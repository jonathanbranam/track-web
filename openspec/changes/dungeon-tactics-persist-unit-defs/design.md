## Context

Stage 1 (`dungeon-tactics-data-driven-units`, merged) introduced a bundled
`unitDefs.ts` table and routed the engine through it (`pc.ts` / `npc.ts` read
range, damage, and footprint from the table; `statOverrides.ts` seeds its
session-scoped `maxHp` / `moveRange` overrides from it). Behavior is now data, but
the data is compiled in — tuning a unit means a code change and redeploy.

This change (Stage 2 of
`docs/games/dungeon-tactics/unit_framework_plan.md`, persistence design in
`unit_framework.md` → "Persisting unit definitions") moves the source of truth to
the app's SQLite DB and adds a live editor so a designer iterates on balance
without a redeploy. The backend already has the pieces this reuses: a
migration-based `db.ts` with a `TABLE_NAMES` registry, the repository pattern
(`repositories/interfaces.ts` + `repositories/sqlite/`), a games router
(`routes/games.ts`), session auth middleware, and Zod for request validation.

Per the latest direction, **there is no admin gate**: any logged-in user may read
and edit definitions (the project's equal-rights default). The existing admin
middleware (`userId === 1`) is intentionally **not** used here.

## Goals / Non-Goals

**Goals:**
- Persist the Stage 1 `UnitDef` schema in SQLite, one JSON row per archetype **per
  scenario**, seeded from the bundled defaults into a `default` scenario (code
  stays canonical).
- Support named **scenarios** (full def sets) with exactly one default per game;
  **play always loads the default**, and the editor sets which scenario is default.
- Serve definitions over a session-authed read API (default scenario) and
  Zod-validated scenario/write APIs, reusing the games router; no admin role.
- Move the client's runtime def source to an in-memory store loaded once at game
  start from the default scenario, with the bundled table as the on-failure fallback.
- **Remove `statOverrides.ts`** (the admin-mode session-override layer) and make the
  loaded store the single read seam for all stats; admin-mode's hp/move edits persist
  to the current scenario instead of being session-only.
- Provide an in-game editor panel — scenario picker, create + name, set-default —
  whose saves apply immediately (in-memory write-through) to the loaded scenario
  and persist (PUT), with a "Reload from server".
- Fresh DB plays bit-identically to Stage 1.

**Non-Goals:**
- Any new `UnitDef` field or mechanic (Stages 3–6). The schema is frozen at the
  Stage 1 shape; this change only moves it to disk and makes it editable.
- An admin/ownership permission tier (explicitly dropped for now).
- Multiplayer/concurrent-edit conflict resolution, optimistic locking, or edit
  history/audit (last-write-wins is acceptable for a single-designer tool).
- Removing the admin-mode **toggle** or its in-popup editing UI — only the
  session-scoped *override storage* (`statOverrides.ts`) is removed; the editing
  surface stays and now persists (see Decision 6).

## Decisions

### 1. Scenarios: named def sets, exactly one default, play loads the default
Definitions are grouped into **scenarios** so a designer can keep several full
balance sets (e.g. `default`, `slow-enemies`) and switch which one plays. A
`game_scenarios(game_slug, scenario_id, name, is_default INTEGER, created_at,
updated_at, PK(game_slug, scenario_id))` table lists them; an invariant of exactly
one `is_default = 1` per game is maintained by clearing the prior default inside the
set-default transaction. **Play always loads the default scenario** — the game's
load path never chooses a scenario, so the engine and `GameState` stay
scenario-agnostic; changing what plays is purely a `setDefault` write from the
editor. Creating a scenario copies a source scenario's defs (the default unless
specified) so the designer edits from a working baseline.
- *Why "default scenario" as the single play source.* Per the product direction,
  players never pick a scenario; the designer curates the live balance by setting
  the default. This keeps the play path identical to the single-set design — one
  GET, no scenario plumbing in the game loop.
- *Alternative — play-time scenario picker.* Rejected per direction: adds
  player-facing UI and threads a scenario id through game start for no current need.

### 2. JSON document column, keyed per scenario, validated at the API layer
`game_unit_defs(game_slug, scenario_id, archetype, def_json TEXT, updated_at,
PK(game_slug, scenario_id, archetype))`. The `UnitDef` is a nested, evolving
document; storing it as JSON means Stages 3–6 add fields with **no table
migration** — only the shared Zod schema and the bundled defaults change.
Validation lives in the API (Zod), not the table shape.
- *Alternative — normalized columns per field.* Rejected: every later-stage field
  would require an `ALTER TABLE`, and nested groups (`attack.targeting`,
  `attack.propagation`) map poorly to flat columns.

### 3. Per-archetype rows, seeded from code (not from a migration)
One row per archetype (per scenario) gives clean single-unit upserts and lets the
editor save one unit at a time. Seeding is a `seedDefaultIfEmpty(slug, defaults)`
run at startup that, when the game has no scenarios, creates the `default` scenario
and inserts its archetype rows from the bundled `unitDefs.ts` — defaults are **not**
baked into the migration SQL, so changing a default never needs a data migration
and seeding never clobbers a persisted scenario.
- *Alternative — single-blob row for all archetypes.* Rejected: muddier upserts and
  forces a full-document rewrite on every single-unit edit.

### 4. One shared `UnitDef` Zod schema mirroring the Stage 1 TS interface
A single Zod schema is the validation authority for writes and the seam that keeps
client and server shapes in sync (the TS `UnitDef` interface stays the compile-time
type; Zod is the runtime guard). Keep it beside or re-exported from a shared module
so the bundled defaults and the seed read the same shape.
- *Alternative — validate by hand / trust the client.* Rejected: writes are
  user-facing and persisted; malformed JSON would corrupt the store.

### 5. No admin gate; reads and writes are session-authed on the games router
The read (`GET .../unit-defs`), scenario routes (`GET`/`POST .../scenarios`,
`PUT .../scenarios/:scenario/default`), and def writes
(`PUT .../scenarios/:scenario/unit-defs/:archetype`, bulk) all live on
`routes/games.ts` behind session auth only. The handlers are factored so a future
admin check is a one-line middleware insertion that doesn't reshape routes or the
client. This deliberately diverges from the plan's original "admin router /
`userId 1`" placement per the current direction.
- *Alternative — keep them on the admin router now.* Rejected: the requirement is
  equal rights for now; putting writes behind the admin guard would contradict it
  and require client admin-detection that isn't wanted yet.

### 6. Remove the session-override layer; the loaded def store is the single read seam
`statOverrides.ts` (from `dungeon-tactics-admin-mode`) is **removed**. It held a
session-scoped, in-memory override of only `maxHp` / `moveRange` that was lost on
reload — a now-redundant second source of truth once a **persistent, full-`UnitDef`**
store exists. The loaded in-memory def store becomes the **single** read seam:
`pc.ts` (`moveRange`, `attackDamage`, `attackFootprint`), `npc.ts`
(`initialState` HP seeding), and `DungeonTacticsScene.ts` (HP pips / popup) all read
their values from the store instead of `statOverrides`/the bundled import. The
admin-mode popup's `maxHp` / `moveRange` edits now write through to the store and
**persist** to the current scenario (replacing the ephemeral overrides), preserving
the immediate-apply behavior and the "current HP follows max HP, floored at 1" rule.
- *Why remove rather than re-seed it (the earlier plan).* Re-pointing the override
  module's seed would leave two stat sources and keep the "session-scoped, never
  persisted" semantics that Stage 2 directly contradicts. One store the engine
  reads from is simpler and is the correct end state once edits persist.
- **Capability impact:** this modifies the merged `dungeon-tactics-admin-mode`
  capability — its "Overrides are session-scoped" requirement is **removed** and
  "Overrides drive the engine immediately" is **reworded** to read from the def
  store. A delta spec at `specs/dungeon-tactics-admin-mode/spec.md` captures this.
- *Alternative — keep `statOverrides.ts`.* Rejected per direction: the override
  layer is redundant with persistent scenario editing and would keep a conflicting
  session-only semantics.

### 7. Load once at game start; in-memory write-through; no polling
The client fetches defs once into an in-memory store the engine reads from. Editing
mutates that store directly (instant effect) **and** PUTs to persist; the game
never polls or re-fetches mid-session. A "Reload from server" control re-runs the
load path to discard unsaved edits. This matches the framework's "preview shows
exact outcome / deterministic" stance — no surprise mid-game def changes.

### 8. Editor lives in `client-games`, not `client-admin`
The editor must share the running game's in-memory store to apply edits without a
reload; a separate admin bundle could not. So the panel is rendered inside the
game client. With no admin gate, it is shown to any logged-in user (a later change
can gate it).

## Risks / Trade-offs

- **Unauthenticated/abusive writes now that there's no admin gate** → Mitigation:
  writes still require a logged-in session and pass Zod validation; the blast radius
  is limited to this game's balance data, which is reseedable from code, and the
  handlers are structured to add an admin check later.
- **Persisted bad data could make the game unplayable** (e.g. range 0 everywhere)
  → Mitigation: Zod bounds-check fields on write; "Reload from server" plus the
  bundled fallback recover; rows are individually re-upsertable and the table is
  reseedable by deletion.
- **Drift between the TS `UnitDef` interface and the Zod schema** → Mitigation:
  derive/keep them in one module and add a test asserting the bundled defaults
  satisfy the Zod schema, so a shape change fails fast.
- **Seed-if-empty silently not overwriting a stale persisted row after a default
  change** → Mitigation: documented behavior (persisted edits win); to adopt new
  defaults, delete the row (or use the bulk PUT) — acceptable for a single-designer
  tool.
- **Fallback path masking a real outage** (game silently runs on bundled defaults
  when the API is down) → Mitigation: log/note the fallback; behavior is identical
  to Stage 1 so the game stays correct, just not live-editable.

## Migration Plan

1. Add migrations `00XX_game_scenarios` and `00XX_game_unit_defs` (+ `TABLE_NAMES`
   entries) — additive, no backfill in SQL.
2. Ship scenario + def repositories and `seedDefaultIfEmpty` wired into startup;
   first boot creates the `default` scenario from the bundled defaults.
3. Add read (default-scenario), scenario, and write routes (session auth) + shared
   Zod schema.
4. Client: load the default scenario's store at start (bundled fallback), engine
   reads the store, add the editor panel (scenario picker / create / set-default)
   + "Reload from server".
5. Update `openapi.yaml` + `llm-context.md`.

**Rollback:** drop the `game_unit_defs` and `game_scenarios` tables and revert the
code; the bundled `unitDefs.ts` fallback keeps the game fully playable, so there is
no orphaned data or broken state to clean up.

## Open Questions

- **Bounds for editable values** — reuse the admin-mode clamps (HP 1–9, move 0–12)
  for the overlapping stats and pick sane bounds for the rest (damage, ranges,
  shape enum) in the Zod schema. Confirm exact bounds during implementation.
- **Editor scope** — does the panel edit the full `UnitDef` (ranges, shape,
  penetration, damage, hp, move) or just the numeric stats first? Default: expose
  the full Stage 1 schema since that is what persists; can ship numeric-first if
  the form work is large.
- **Relationship to admin-mode's existing panel** — if `dungeon-tactics-admin-mode`
  already renders an in-game stat panel, extend it rather than add a second; confirm
  against the shipped UI during implementation.
