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

### Builds on `dungeon-tactics-admin-mode` (merged)

`dungeon-tactics-admin-mode` has shipped. It added a session-scoped
`statOverrides.ts` module (mutable per-`unitType` `maxHp` / `moveRange` maps,
seeded with its own hardcoded defaults — `DEFAULT_MAX_HP = 3`, a
`defaultMoveRange()` of melee/rogue → 4 else 3), made `pc.ts` `moveRange(unit)` a
thin delegate to `getMoveRange(unit.unitType)`, and routed the scene's unit HP
(pips + popup) through `getMaxHp(unit.unitType)`. So the override layer and the
read seam already exist; this change supplies the canonical defaults beneath them:

- **`unitDefs.ts` becomes the default source; `statOverrides.ts` stays the
  override layer.** This change re-points the override module's seed at
  `unitDefs.ts` (`getMoveRange(type)` defaults to `unitDefs[type].movement.range`,
  `getMaxHp(type)` to `unitDefs[type].maxHp`) and **removes the duplicated
  `DEFAULT_MAX_HP` / `defaultMoveRange()` constants** so there is one source of
  truth for per-archetype defaults.
- **`maxHp` lives in `UnitDef`** as the canonical per-archetype default that
  admin-mode edits override. `moveRange(unit)` and the `getMaxHp` HP source
  **stay delegates** — this change must not re-introduce a `switch`.
- **`attackDamage(unit)` still branches** (`'melee' ? 2 : 1`) and is **not**
  overridden by admin-mode; this change moves it to read `unitDefs[type].attack.damage`.
- This change remains **default-data only** — no Admin toggle, editing UI, or
  override behavior (those already belong to `dungeon-tactics-admin-mode`).

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
- **`statOverrides.ts`** (shipped by `dungeon-tactics-admin-mode`) — re-point its
  seed at `unitDefs.ts` and remove the duplicated `DEFAULT_MAX_HP` /
  `defaultMoveRange()` constants; `getMoveRange` / `getMaxHp` keep delegating.
  The scene already reads unit HP via `getMaxHp` (no literal `3` remains for
  units), so no scene change is required for HP beyond the new default source.
- **Tests:** existing `placement.test.ts` and `undo.test.ts` should pass
  untouched; they serve as part of the "plays identically" guard.
- **APIs / DB / dependencies:** none (Stage 1 is client-only, no persistence).
- **Docs:** `docs/games/dungeon-tactics/unit_framework.md` updated to drop
  dice/randomness so the spec and implementation stay consistent (damage is a
  flat integer).
