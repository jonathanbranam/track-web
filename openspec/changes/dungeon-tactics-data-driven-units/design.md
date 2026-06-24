## Context

Dungeon Tactics Solo (`client-games/src/games/dungeon-tactics-solo/`) derives all
unit behavior from the `unit.unitType` tag at call time, in hardcoded branches:

- `pc.ts` — `moveRange(unit)` and `attackDamage(unit)` return constants keyed off
  `unitType`; `attackSquares()` (planning preview) and `resolveAttack()` (damage
  application) each contain their *own* `if (unitType === 'melee' | 'ranger' |
  'magic-user')` block that re-derives the same attack footprint.
- `npc.ts` — `findShortRangeTarget` / `findLongRangeTarget` encode each NPC
  archetype's range and target-selection rules inline; `resolveNpcAction`
  applies damage to the single chosen target tile.
- `DungeonTacticsScene.ts` — max HP is the literal `3` (`drawUnitPopup`,
  `drawHpPips`); only current `hp` is stored on `Unit`.

The duplication between `attackSquares()` and `resolveAttack()` is the sharpest
smell: the preview and the resolution can drift because the footprint is written
twice. This change (Stage 1 of the unit framework,
`docs/games/dungeon-tactics/unit_framework.md`) makes unit behavior **data** —
a single `UnitDef` table plus one footprint helper — with **no gameplay change**.

It runs alongside the in-flight `dungeon-tactics-admin-mode` change, which adds a
session-scoped override layer over the same `pc.ts` stat seam; the two must
compose (see Decision 6).

## Goals / Non-Goals

**Goals:**
- Express the six existing archetypes (`melee`, `rogue`, `ranger`, `magic-user`,
  `short-range`, `long-range`) as data in one table.
- Derive move range, max HP, attack damage, and attack footprint from that data —
  no `switch (unitType)` for stats or attack shape.
- Collapse the duplicated footprint logic in `attackSquares()` / `resolveAttack()`
  into a single shared helper, so preview and resolution cannot drift.
- Keep behavior bit-identical: same reachable tiles, footprints, damage, and
  3-pip HP. Existing `placement.test.ts` / `undo.test.ts` pass untouched.

**Non-Goals:**
- Persisting definitions to SQLite or any backend/admin UI (Stage 2).
- The Admin toggle, in-popup editing, or override behavior
  (`dungeon-tactics-admin-mode` owns those).
- Any new mechanic: damage types, friendly fire, status, new targeting modes,
  traversal/layers, loft/on_land, forced movement (Stages 3–6).
- Fully data-driving NPC target *selection* (the AI scan logic stays; only its
  numbers/footprint come from data).
- Per-instance unit definitions — defs remain keyed by archetype.

## Decisions

### 1. `UnitDef` keyed by `unitType`; `Unit` is unchanged

A new `unitDefs.ts` exports `Record<PcType | NpcType, UnitDef>`. `Unit` keeps its
current shape (`id, kind, col, row, unitType, hp`); the engine looks up the def
by `unit.unitType`. The `UnitDef` subset is exactly what the six archetypes
exercise today:

```ts
interface UnitDef {
  maxHp: number
  movement: { range: number }
  attack: {
    damage: number
    targeting: { mode: 'direction'; arc: 'cardinal'; minRange: number; maxRange: number }
    propagation: { shape: 'single' | 'line' | 'plus'; penetration: 'none' | 'stop_at_first' }
  }
}
```

- **Why look-up-by-tag over embedding the def on `Unit`?** The `unitType` tag
  already exists and is what `initialState` assigns; keeping defs in a side table
  is a smaller diff, avoids copying a def onto every unit instance, and keeps the
  archetype the single source of per-type values. Per-instance defs would also
  bloat the undo records and `GameState`.
- **Why this exact subset?** The principle is "encode only what today's units
  use." Fields from the full framework (`traversal`, `layer`, `loft`, `status`,
  `friendly_fire`, …) are omitted entirely until the stage that needs them, so
  the schema never carries dead options.

### 2. One footprint helper drives both preview and resolution

A single function — e.g. `attackFootprint(def, origin, dir): {col,row}[]` —
returns the tiles an attack covers from a resolved origin in a cardinal
direction, derived from `propagation.shape` + `targeting.{minRange,maxRange}`:

| shape    | derivation (today's behavior)                                  |
|----------|----------------------------------------------------------------|
| `single` | the single tile at `minRange` in `dir` (melee/rogue: dist 1)   |
| `line`   | tiles from `minRange`..edge in `dir` (ranger: dist 2→edge)     |
| `plus`   | center at `maxRange` (dist 2) + its 4 orthogonal neighbors     |

`attackSquares()` (preview highlight) and `resolveAttack()` (damage) both call
it; resolution then walks the returned tiles applying `penetration`
(`stop_at_first` halts at the first unit/structure — ranger; `none` hits the
whole footprint — magic-user plus). This kills the two-copies-of-the-footprint
drift risk.

- **Alternative considered — keep separate preview/resolve functions but share
  constants.** Rejected: the bug surface is the *shape geometry*, not the
  constants; only a shared geometry function removes it.

### 3. `plus` stays a named shape for now

`magic-user`'s 5-tile cross at distance 2 is not in the framework's shape
vocabulary (`single|line|reach_line|cone|radius|ring`). It maps to `radius:1`
around a `tile_line` landing point, but that requires the Stage 4 targeting/
propagation model. To keep Stage 1 a pure refactor, `plus` is a first-class
`shape` value now, flagged for unification into `radius` in Stage 4.

### 4. NPC defs supply numbers + damage; the AI scanners keep their structure

`resolveNpcAction` already damages exactly the chosen target tile, so an NPC
attack's *resolution* footprint is `single`. The "line, pass over allies, stop at
the first PC/structure at distance ≥2" behavior of `long-range`, and the
"distance 1 then 2" priority of `short-range`, are **target selection**, not a
resolution footprint — they live in `findLongRangeTarget` / `findShortRangeTarget`.

So Stage 1 has the scanners read `movement.range`, `attack.damage`, and the
range bounds (`min/maxRange`) from the def, but keeps their loop structure.
Fully generalizing AI targeting (turning the scan into a data-driven cast over
the footprint helper) is deferred — it is genuinely harder to make generic and
is not needed to remove the *stat/shape* branching this change targets.

### 5. `maxHp` moves into `UnitDef`; the scene reads it

`UnitDef.maxHp` (default `3` for all six archetypes) replaces the literal `3` in
`DungeonTacticsScene.ts`. `drawUnitPopup`, `drawHpPips`, and any HP clamp read
`unitDefs[unit.unitType].maxHp`. With every archetype at `3`, the HP display and
pip count are unchanged.

- **Why pull HP in now (it was uniform)?** `dungeon-tactics-admin-mode` is
  concurrently promoting HP to a per-archetype editable stat. Giving `UnitDef` a
  single `maxHp` home now means there is one canonical per-archetype stat
  structure instead of two competing ones.

### 6. Compose with `dungeon-tactics-admin-mode`, don't collide

That change introduces `statOverrides.ts` (session-scoped per-`unitType` `maxHp`
/ `moveRange` maps) and makes `moveRange(unit)` a thin delegate to
`getMoveRange(unit.unitType)`, plus `getMaxHp(unitType)`. The end state both
changes converge on:

- `unitDefs.ts` is the **default** source; `statOverrides.ts` is an **override
  layer**: `getMoveRange(type)` resolves to `override ?? unitDefs[type].movement.range`,
  `getMaxHp(type)` to `override ?? unitDefs[type].maxHp`. The override module
  drops its own duplicated default constants.
- `moveRange(unit)` and the max-HP source stay **delegates** — this change must
  not re-introduce a `switch` after admin-mode removed it. Whichever change
  merges second reconciles to: defaults in `unitDefs.ts`, overrides in
  `statOverrides.ts`.
- This change ships **default-data only**; it adds no toggle, editor, or override
  behavior.

### 7. Determinism preserved

`attack.damage` is a flat integer; no dice, no RNG. This keeps NPC plan
computation and the undo stack's pure state-restoration intact, and matches the
"preview shows exact outcome" goal. `unit_framework.md` is updated to drop
dice/randomness so doc and code agree.

## Risks / Trade-offs

- **Behavior parity is the whole bar and is easy to break subtly** (e.g. ranger
  `stop_at_first` vs hitting all, plus-center placement, off-by-one in range) →
  Mitigation: single footprint helper for preview+resolve; keep
  `placement.test.ts`/`undo.test.ts` green; add unit tests asserting the footprint
  and stats for all six archetypes; manual verify matrix per archetype.
- **`plus` is a non-framework shape** carried as tech debt → Mitigation: explicit
  named value + Stage 4 reconciliation note; it is isolated to one helper branch.
- **NPC AI only half-data-driven** (numbers from data, selection still inline) →
  Mitigation: documented as intentional; the scanners still read the def so their
  numbers can't drift from the table.
- **Merge-order seam with admin-mode** around `moveRange`/`maxHp` → Mitigation:
  the Decision 6 contract; whoever lands second points override defaults at
  `unitDefs.ts` and preserves delegation.
- **`maxHp` scope creep** beyond a pure movement/attack refactor → Mitigation:
  default `3` everywhere keeps behavior identical; the field is inert until
  admin-mode/Stage 2 edits it.

## Migration Plan

Pure client-side refactor. No DB migration, no API, no Caddy/deploy changes;
ships via the normal `client-games` Vite build. Rollback is a straight revert —
no persisted data or schema to clean up. Coordinate merge with
`dungeon-tactics-admin-mode` per Decision 6 (the later merge reconciles the
`statOverrides.ts` defaults to read from `unitDefs.ts`).

## Open Questions

- Should NPC target selection be folded into the footprint helper now rather than
  deferred? (Current plan: defer — selection logic is harder to generalize and
  out of scope for removing stat/shape branching.)
- Is `stop_at_first` sufficient to express the ranger's "first unit *or*
  structure" stop, or does penetration need a target-class qualifier? (Assumed
  sufficient for Stage 1; revisit if a later stage distinguishes.)
