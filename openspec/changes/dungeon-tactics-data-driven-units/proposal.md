## Why

Dungeon Tactics unit behavior is hardcoded per archetype: move range, attack
damage, and attack footprint all live in `switch (unitType)` / `unitType === …`
branches spread across `pc.ts` and `npc.ts`, and stats are recomputed from the
type tag at call time. This makes adding or tuning a unit a code change in
several places, and it blocks the data-driven unit framework
(`docs/games/dungeon-tactics/unit_framework.md`) the game is moving toward. This
change is Stage 1 of that framework: make a unit's behavior **data** without
changing how the game plays.

## What Changes

- Introduce a `UnitDef` data structure describing a unit's movement and attack
  (the minimal subset the six existing archetypes exercise: `maxHp`;
  `movement.range`; `attack.damage`; `attack.targeting`
  `{ mode, arc, minRange, maxRange }`; `attack.propagation`
  `{ shape, penetration }`). `maxHp` is included as the per-archetype default
  (today a flat `3`) so the data table is the single home for per-archetype
  stats — see coordination with `dungeon-tactics-admin-mode` below.
- Add a single bundled definition table (`unitDefs.ts`) holding all six current
  archetypes — `melee`, `rogue`, `ranger`, `magic-user` (PC) and `short-range`,
  `long-range` (NPC) — with values matching today's behavior exactly.
- Add one footprint helper that derives attacked tiles from a `UnitDef`
  (`propagation.shape` + targeting range), replacing the per-archetype attack
  branches.
- Rewire `pc.ts` and `npc.ts` to read range / damage / footprint from the
  definition table instead of `switch (unitType)` blocks; remove the now-dead
  branch helpers. (NPC AI scanner loops keep their structure for now — only the
  numbers and footprint come from data.)
- No gameplay change: all nine units behave bit-identically (same reachable
  tiles, same attack footprints, same damage). This is the acceptance bar.
- Out of scope (later stages): persisting definitions to SQLite / live admin
  editing (Stage 2), and any new mechanics — damage types, friendly fire,
  status, new targeting modes, traversal/layers, loft/on_land, forced movement.

### Coordination with `dungeon-tactics-admin-mode` (in-flight)

The in-flight `dungeon-tactics-admin-mode` change adds a session-scoped
`statOverrides.ts` module (mutable per-`unitType` `maxHp` / `moveRange` maps,
seeded with today's hardcoded defaults) and makes `pc.ts` `moveRange(unit)` a
thin delegate to `getMoveRange(unit.unitType)`, plus a new `getMaxHp(unitType)`
source. Both changes touch the same seam (`pc.ts` stats, a per-archetype stat
representation), so they must compose rather than collide:

- **`unitDefs.ts` is the default source; `statOverrides.ts` is an override layer
  on top.** The override accessors resolve to `override ?? unitDef value`
  (e.g. `getMoveRange(type)` falls back to `unitDefs[type].movement.range`,
  `getMaxHp(type)` to `unitDefs[type].maxHp`). The override module no longer
  carries its own duplicated default constants once this change lands.
- **`maxHp` moves into `UnitDef`** as the per-archetype default, replacing the
  flat `3`, so admin-mode edits override a value with a single canonical home.
- **`moveRange(unit)` stays a delegate, not a re-introduced `switch`.** This
  change removes per-archetype branching; it must not undo admin-mode's
  delegation. Whichever change merges second reconciles to this end state:
  defaults in `unitDefs.ts`, session overrides in `statOverrides.ts`.
- This change remains **default-data only**; it does not add the Admin toggle,
  editing UI, or override behavior (those belong to `dungeon-tactics-admin-mode`).

## Capabilities

### New Capabilities
- `data-driven-unit-defs`: Unit movement and attack behavior is sourced from a
  single data-defined `UnitDef` table rather than per-archetype code branches.
  The six existing archetypes are expressed as data, and the engine derives move
  range, attack damage, and attack footprint from that data with no
  `switch (unitType)` branching for stats or attack shape.

### Modified Capabilities
<!-- None. pc-archetypes and npc-archetypes describe the canonical per-archetype
     values (ranges, footprints, damage, colors); Stage 1 reproduces them
     identically, so their requirements do not change. -->

## Impact

- **Code:** `client-games/src/games/dungeon-tactics-solo/` —
  `types.ts` (+ `UnitDef` interface, incl. `maxHp`), `unitDefs.ts` (NEW, the
  archetype table), `pc.ts` (`moveRange` / `attackDamage` / `attackSquares` /
  `resolveAttack`), `npc.ts` (`findShortRangeTarget` / `findLongRangeTarget`
  read numbers + footprint from data).
- **Coordination:** `statOverrides.ts` (introduced by `dungeon-tactics-admin-mode`)
  — if that change is merged, its `getMoveRange` / `getMaxHp` defaults are
  re-pointed at `unitDefs.ts`, and `moveRange(unit)` stays a delegate (no
  re-introduced branching). The board/popup HP source (`getMaxHp` /
  `drawHpPips` / popup `maxHp`) reads its default from `UnitDef.maxHp` instead of
  the literal `3`.
- **Tests:** existing `placement.test.ts` and `undo.test.ts` should pass
  untouched; they serve as part of the "plays identically" guard.
- **APIs / DB / dependencies:** none (Stage 1 is client-only, no persistence).
- **Docs:** `docs/games/dungeon-tactics/unit_framework.md` updated to drop
  dice/randomness so the spec and implementation stay consistent (damage is a
  flat integer).
