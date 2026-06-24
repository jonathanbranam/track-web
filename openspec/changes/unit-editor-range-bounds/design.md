## Context

The unit editor (`client-games/src/games/dungeon-tactics-solo/ScenarioEditor.tsx`) renders five numeric fields per archetype through a shared `numField` helper:

```ts
const numField = (archetype, value, mutate) => (
  <input type="number" ... value={value}
    onChange={(e) => setField(archetype, (d) => mutate(d, Math.round(Number(e.target.value))))} />
)
```

It rounds to an integer but applies no bounds, so a designer can type `-5` or `0` and commit a `UnitDef` that the engine treats as invalid (a unit with `maxHp` ≤ 0 is unplaceable; an attack with `maxRange` < 1 reaches nothing). The board is **16×8** (`GRID_COLS=16`, `GRID_ROWS=8` in `map.ts`), so the maximum Manhattan distance corner-to-corner is `(16-1)+(8-1) = 22` — any range or movement beyond 22 is unreachable on this board.

The fields and the def paths they mutate (`types.ts`):
- Max HP → `maxHp`
- Move → `movement.range`
- Damage → `attack.damage`
- Min rng → `attack.targeting.minRange`
- Max rng → `attack.targeting.maxRange`

This is a client-only validation change; no backend, API, or schema touches.

## Goals / Non-Goals

**Goals:**
- Prevent out-of-range values (negatives, illegal zeros, over-cap) from being committed to the in-memory store or persisted, regardless of how they're entered (typed, pasted, spinner).
- Enforce the cross-field invariant **Max rng ≥ Min rng**.
- Surface the bounds to the browser via native `min`/`max` for spinner/keyboard hinting.

**Non-Goals:**
- Backend / API request validation. The write endpoint is unchanged; the editor is the only writer and clamping there is sufficient for this single-user, self-hosted app.
- Validation of the non-numeric fields (Shape, Penetration) — those are already `<select>`s constrained to enum values.
- Tying the caps dynamically to live board dimensions. The board is fixed at 16×8; 22 is encoded as a named constant, not derived at runtime.

## Decisions

### Clamp on commit, not just native `min`/`max`

Native `<input type="number" min max>` attributes only constrain the spinner arrows and validity styling — a user can still **type or paste** an out-of-range value and it fires `onChange` with that value. So the authoritative enforcement is a `clamp(round(v), min, max)` applied inside the `onChange` handler before the value reaches `mutate`. The `min`/`max` attributes are added too, purely for browser affordance (spinner stops, mobile keypad hints).

_Alternative considered:_ rely on native validation + an HTML form `:invalid` state. Rejected — the editor commits live on every change (no form submit gate), so an invalid intermediate value would already be in the store; clamping at the source is simpler and airtight.

### Generalize `numField` with `min`/`max` parameters

Extend the helper signature to `numField(archetype, value, min, max, mutate)` (or an options object). The clamp becomes `Math.min(max, Math.max(min, Math.round(Number(e.target.value))))`. Each call site passes its bounds:

| Field    | min | max |
|----------|-----|-----|
| Max HP   | 1   | —   (no cap; large HP is legitimate) |
| Move     | 0   | 22  |
| Damage   | 0   | 15  |
| Min rng  | 0   | 22  |
| Max rng  | 1   | 22  |

`max` is optional; Max HP passes no upper bound (omit the attribute and skip the upper clamp, or pass `Infinity`).

Define the caps as named constants at module top (e.g. `BOARD_SPAN = 22`, `MAX_DAMAGE = 15`, `MIN_HP = 1`) rather than inline magic numbers, so the board-span rationale is documented in one place.

### Cross-field reconciliation for the range pair

Max rng ≥ Min rng can't be expressed with static per-field bounds, so the two range mutators reconcile the pair after clamping:
- **Editing Min rng** to `v`: set `minRange = v`, and if `v > maxRange`, raise `maxRange` to `v` (push the ceiling up to stay valid).
- **Editing Max rng** to `v`: clamp to `[1, 22]`, then set `maxRange = max(v, minRange)` (never let the ceiling drop below the floor).

_Alternative considered:_ make Max rng's effective `min` a dynamic value of `minRange` and block edits that violate it. Rejected — pushing the partner field is less surprising than silently rejecting a keystroke, and keeps both fields independently editable.

This reconciliation lives in the per-field `mutate` callbacks (which already receive the full def), not in `numField`, since it's specific to the range pair.

### Rounding stays

The existing `Math.round` is preserved (all these fields are integer tile/HP/damage counts). Clamp is applied after rounding.

## Risks / Trade-offs

- **[Empty/NaN input]** Clearing the field yields `Number('') === 0`, which then clamps to the field's min (e.g. Max HP snaps to 1). → Acceptable and arguably desirable: the committed value is always valid. No mid-typing empty state is persisted because the editor commits live.
- **[Existing out-of-range data]** A previously-saved scenario could already hold an out-of-range value (e.g. legacy `maxHp: 0`). The input will display it, but it isn't re-clamped until the field is edited. → Out of scope; clamping is a write-time guard, not a migration. The seed/bundled defaults are all in-range.
- **[Collision with `dungeon-tactics-live-unit-def-edits`]** That in-flight change rewrites `numField`/the commit path (apply-on-edit) and the same spec. → Coordinate ordering; whichever lands second rebases. The clamp logic is small and localized to `numField` + the range mutators, so a rebase is mechanical.

## Migration Plan

No data migration. Pure client behavior change shipped with the normal Vite build of `client-games`. Rollback is reverting the commit; no persisted state shape changes, so already-saved scenarios remain readable either way.

## Open Questions

None.
