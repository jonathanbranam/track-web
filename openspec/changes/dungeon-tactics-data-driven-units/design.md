## Context

Dungeon Tactics Solo (`client-games/src/games/dungeon-tactics-solo/`) still
derives most unit behavior from the `unit.unitType` tag at call time, in
hardcoded branches:

- `pc.ts` — `attackDamage(unit)` returns a constant keyed off `unitType`
  (`'melee' ? 2 : 1`); `attackSquares()` (planning preview) and `resolveAttack()`
  (damage application) each contain their *own* `if (unitType === 'melee' |
  'ranger' | 'magic-user')` block that re-derives the same attack footprint.
- `npc.ts` — `findShortRangeTarget` / `findLongRangeTarget` encode each NPC
  archetype's range and target-selection rules inline; `resolveNpcAction`
  applies damage to the single chosen target tile.

The since-merged `dungeon-tactics-admin-mode` change already moved the **stat
read seam** out of `pc.ts`:

- `statOverrides.ts` holds session-scoped per-`unitType` `maxHp` / `moveRange`
  maps, seeded from its own constants (`DEFAULT_MAX_HP = 3`, a `defaultMoveRange()`
  of melee/rogue → 4 else 3), and exposes `getMaxHp` / `getMoveRange` (+ setters).
- `pc.ts` `moveRange(unit)` is a thin delegate to `getMoveRange(unit.unitType)`.
- `DungeonTacticsScene.ts` reads unit HP (pips + popup) via `getMaxHp(unit.unitType)`
  — the literal `3` is gone for units. Only current `hp` is stored on `Unit`.

The duplication between `attackSquares()` and `resolveAttack()` is the sharpest
remaining smell: the preview and the resolution can drift because the footprint
is written twice. This change (Stage 1 of the unit framework,
`docs/games/dungeon-tactics/unit_framework.md`) makes unit behavior **data** — a
single `UnitDef` table plus one footprint helper — with **no gameplay change**,
and supplies the canonical defaults beneath the existing override layer
(see Decision 6).

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

### 3. `plus` is a first-class framework shape

`magic-user`'s 5-tile cross at distance 2 is the orthogonal cross — center plus
its 4 cardinal neighbors (Manhattan distance ≤ 1). This is a distinct shape from
the framework's `radius` (a filled square block, Chebyshev distance ≤ N: `radius`
of 1 is a 3×3 = 9 tiles, not the 5-tile cross). Rather than approximate it as
`radius` and lose the cardinal-only footprint, `plus` is added to the framework's
shape vocabulary (`unit_framework.md`) and used directly here. No later
"unification" is needed — `plus` and `radius` are different shapes that coexist.

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

### 5. `maxHp` lives in `UnitDef` as the default behind `getMaxHp`

The scene and engine already read max HP through `getMaxHp(unit.unitType)`
(admin-mode). This change does **not** touch the scene or add new HP reads; it
makes `getMaxHp`'s *default* come from `unitDefs[type].maxHp` (all six archetypes
`3`) instead of the `DEFAULT_MAX_HP` constant in `statOverrides.ts`. With every
default at `3`, HP display and pip count are unchanged.

- **Why own HP in `UnitDef`?** `dungeon-tactics-admin-mode` already promoted HP
  to a per-archetype editable stat, but seeded its defaults from a private
  constant. Folding that default into `UnitDef` gives one canonical per-archetype
  stat structure instead of two, which Stage 2 (SQLite persistence) can then back.

### 6. Re-point the merged `statOverrides.ts` at `unitDefs.ts`

`dungeon-tactics-admin-mode` has shipped, so the override layer already exists.
This change supplies the canonical defaults beneath it:

- `unitDefs.ts` becomes the **default** source; `statOverrides.ts` stays the
  **override layer**. `seed()` initializes each archetype from the table
  (`maxHp = unitDefs[type].maxHp`, `moveRange = unitDefs[type].movement.range`),
  and the `DEFAULT_MAX_HP` / `defaultMoveRange()` constants are **removed** so
  there is one source of truth. (`getMaxHp` / `getMoveRange` fallbacks can read
  the table directly too.)
- `moveRange(unit)` and the `getMaxHp` HP source **stay delegates** — this change
  must not re-introduce a `switch` after admin-mode removed it.
- `attackDamage` is *not* part of the override layer (admin-mode does not edit
  damage), so it reads `unitDefs[type].attack.damage` directly.
- This change ships **default-data only**; it adds no toggle, editor, or override
  behavior — those already exist in admin-mode.

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
- **`plus` geometry must match the old magic-user cross exactly** (center at
  `maxRange` + 4 cardinal neighbors, grid-clipped) → Mitigation: it is a single
  branch in the footprint helper covered by an archetype footprint test; `plus`
  is now a documented framework shape, not an approximation.
- **NPC AI only half-data-driven** (numbers from data, selection still inline) →
  Mitigation: documented as intentional; the scanners still read the def so their
  numbers can't drift from the table.
- **Regressing the merged override layer** when re-pointing `statOverrides.ts`
  (e.g. dropping the clamp bounds, or breaking that admin edits still apply) →
  Mitigation: only the *seed/default* source changes; keep `getMaxHp` /
  `getMoveRange` and the setters/clamps intact, preserve delegation, and exercise
  an override edit during manual verify.
- **`maxHp` scope creep** beyond a pure movement/attack refactor → Mitigation:
  default `3` everywhere keeps behavior identical; the field is inert until
  admin-mode/Stage 2 edits it.

## Migration Plan

Pure client-side refactor on top of the merged `dungeon-tactics-admin-mode`. No
DB migration, no API, no Caddy/deploy changes; ships via the normal
`client-games` Vite build. Rollback is a straight revert — no persisted data or
schema to clean up. The revert must restore `statOverrides.ts`'s own default
constants (since this change removes them), which a clean git revert handles.

## Open Questions

- Should NPC target selection be folded into the footprint helper now rather than
  deferred? (Current plan: defer — selection logic is harder to generalize and
  out of scope for removing stat/shape branching.)
- Is `stop_at_first` sufficient to express the ranger's "first unit *or*
  structure" stop, or does penetration need a target-class qualifier? (Assumed
  sufficient for Stage 1; revisit if a later stage distinguishes.)
