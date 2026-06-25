## Context

The unit editor (`client-games/src/games/dungeon-tactics-solo/ScenarioEditor.tsx`) renders five numeric fields per archetype through a shared `numField` helper. As of the now-landed `dungeon-tactics-live-unit-def-edits` change, edits apply **live**: `numField`'s `onChange` rounds the value, schedules a trailing-edge debounced commit (`editNum` → `commitNow`), and `commitNow` runs every archetype through **`clampDef`** (in `defStore.ts`) before pushing it to the store. So clamp-on-commit infrastructure **already exists** — but with bounds that don't match this change:

```ts
// defStore.ts (current)
const HP_MIN = 1, HP_MAX = 9
const MOVE_MIN = 0, MOVE_MAX = 12
export function clampDef(def) { /* maxHp [1,9], move [0,12], damage/min/maxRange [0,99] */ }
```

Two gaps remain: (1) the bounds are wrong for this change (HP caps at 9 not 20, move at 12 not 22, damage/ranges are an effectively-unbounded 99, `maxRange` min is 0 not 1), and there is **no cross-field rule**; (2) the `<input>`s carry no native `min`/`max` attributes, so the spinner/mobile keypad give no affordance. The designer can still type `-5`, `0`, or `40` and (post-clamp) get a silently-different value, or invert the range pair.

The board is **16×8** (`GRID_COLS=16`, `GRID_ROWS=8` in `map.ts`), so the maximum Manhattan distance corner-to-corner is `(16-1)+(8-1) = 22` — any range or movement beyond 22 is unreachable on this board.

The fields and the def paths they mutate (`types.ts`):
- Max HP → `maxHp`
- Move → `movement.range`
- Damage → `attack.damage`
- Min rng → `attack.targeting.minRange`
- Max rng → `attack.targeting.maxRange`

The backend already validates every persisted write against a Zod schema, `unitDefSchema` in `src/games/dungeon-tactics/unitDefs.ts`, but with deliberately generous bounds (all numerics `min(0|1).max(99)`) — its header comment says *"Bounds are deliberately generous (the in-app editor applies tighter UX clamps)."* That split-authority model is what this change closes: the same bounds now live on both sides, with the schema authoritative.

**Ordering:** this change lands **second**, after `dungeon-tactics-live-unit-def-edits`, which reshapes the editor from apply-on-save to apply-on-edit (every field change mutates the in-memory store immediately) and rewrites the `numField`/commit path. This design assumes that reshape is already in place; the clamp logic layers onto the post-reshape commit path rather than today's `setDefs` buffer.

## Goals / Non-Goals

**Goals:**
- Prevent out-of-range values (negatives, illegal zeros, over-cap) from being committed to the in-memory store or persisted, regardless of how they're entered (typed, pasted, spinner).
- Enforce the cross-field invariant **Max rng ≥ Min rng** on both client and server.
- Make the **backend schema authoritative**: tighten `unitDefSchema` to the same bounds so any write — not just the editor — is rejected if out of range.
- Surface the bounds to the browser via native `min`/`max` for spinner/keyboard hinting.

**Non-Goals:**
- Validation of the non-numeric fields (Shape, Penetration) — those are already `<select>`s / `z.enum`s constrained to the known set.
- Re-validating or migrating already-persisted defs. Bounds are a write-time guard; reads are not re-validated (the bundled seed is already in-range).
- Tying the caps dynamically to live board dimensions. The board is fixed at 16×8; 22 is encoded as a named constant on each side, not derived at runtime.
- A shared client/server bounds module. The two live in separate npm workspaces and cannot share a module (same constraint that already forces `BUNDLED_UNIT_DEFS` to be duplicated with a SYNC NOTE).

## Decisions

### Retune the existing `clampDef` bounds (clamp stays the authority)

The clamp already runs at commit time inside `clampDef`; this change only **retunes its constants** and adds the two missing range constants. Native `<input min max>` attributes constrain only the spinner — a user can still type/paste out of range — so `clampDef` remains the authoritative floor/ceiling; the attributes are added purely for affordance.

Target bounds (replace the current `[1,9]`/`[0,12]`/`[0,99]`):

| Field    | min | max |
|----------|-----|-----|
| Max HP   | 1   | 20  |
| Move     | 0   | 22  |
| Damage   | 0   | 15  |
| Min rng  | 0   | 22  |
| Max rng  | 1   | 22  |

Implementation in `defStore.ts`: change `HP_MAX = 9 → 20`, `MOVE_MAX = 12 → 22`; add `DAMAGE_MAX = 15`, `RANGE_MAX = 22`, `MAXRANGE_MIN = 1`; update `clampDef` to use them (damage `[0,15]`, minRange `[0,22]`, maxRange `[1,22]`) and update its doc comment (which currently states `[1,9]`/`[0,12]`). Keep the names descriptive so the board-span rationale (`RANGE_MAX`/`MOVE_MAX` = 22 = board Manhattan span) lives in one place.

### `numField` gains native `min`/`max` attributes

`numField`'s signature grows `min`/`max` params that render as the input's `min`/`max` attributes (no behavioral clamp added here — `clampDef` already does that on commit). Each call site passes its bounds from the table above. This is purely the browser affordance half; the enforcement half is `clampDef`.

### Cross-field reconciliation for the range pair

Max rng ≥ Min rng can't be expressed with static per-field bounds, so the two range mutators reconcile the pair after clamping. The edited field always keeps the value the user entered; the **partner field is pushed to match** when the pair would otherwise be inverted:
- **Editing Min rng** to `v` (clamped to `[0, 22]`): set `minRange = v`; if `v > maxRange`, set `maxRange = v` (raise the ceiling up to meet it — both equal).
- **Editing Max rng** to `v` (clamped to `[1, 22]`): set `maxRange = v`; if `v < minRange`, set `minRange = v` (drop the floor down to meet it — both equal).

So increasing Min above Max pulls Max up; decreasing Max below Min pulls Min down; in both cases the two land equal. The field the user is editing is never overridden.

_Alternative considered:_ clamp the edited field instead (block Max from going below Min, block Min from going above Max). Rejected — that silently ignores the user's keystroke. Pushing the partner honors the entered value and keeps both fields independently editable.

This reconciliation lives in the two range-field `mutate` callbacks at their `numField` call sites (which receive the full def and know which field changed), not in `numField` or `clampDef`. It must be the per-field mutate because the partner-push is **direction-dependent**: from a committed `{min:5,max:3}` alone you cannot tell whether the user raised min (→ push max to 5) or lowered max (→ pull min to 3). Only the editing handler knows. `clampDef` keeps a cheap defensive `maxRange = max(minRange, maxRange)` so the engine never sees an inverted pair from any non-editor path, but the UX semantics come from the mutates. The same invariant is the schema refinement server-side (below) — the client reconciles for good UX, the schema rejects as the backstop.

Because edits apply through `editNum` (which writes local state synchronously before the debounced commit), the pushed partner value shows in its input immediately, not after the debounce.

### Rounding stays

The existing `Math.round` is preserved (all these fields are integer tile/HP/damage counts). Clamp is applied after rounding.

### Backend schema enforces the same bounds (authoritative)

Tighten `unitDefSchema` in `src/games/dungeon-tactics/unitDefs.ts` to mirror the client clamps:

| Field    | Zod bound (was → now) |
|----------|------------------------|
| `maxHp`             | `int().min(1).max(99)` → `int().min(1).max(20)` |
| `movement.range`    | `int().min(0).max(99)` → `int().min(0).max(22)` |
| `attack.damage`     | `int().min(0).max(99)` → `int().min(0).max(15)` |
| `targeting.minRange`| `int().min(0).max(99)` → `int().min(0).max(22)` |
| `targeting.maxRange`| `int().min(0).max(99)` → `int().min(1).max(22)` |

Add the cross-field rule with a `.superRefine` (or `.refine`) on the object that fails when `attack.targeting.maxRange < attack.targeting.minRange`, attaching the issue to the `maxRange` path so the API error is specific.

Encode the caps as named constants at module top with a SYNC NOTE pointing at the client's copy — the same pattern `BUNDLED_UNIT_DEFS` already uses, since the two workspaces can't share a module. Update the existing "Bounds are deliberately generous (the in-app editor applies tighter UX clamps)" comment to state the schema is now the authority and mirrors the editor's bounds.

This is enforced automatically on the bulk write — `PUT /:slug/scenarios/:scenario/unit-defs` already runs `bulkUnitDefsSchema = z.record(z.string(), unitDefSchema)` through `zValidator`, so no route change is needed; tightening the leaf schema is sufficient.

_Why bounds match exactly:_ if the schema were looser than the editor, the "authority" would be the UI again (defeating the point); if tighter, a value the editor lets you type would fail to save with a confusing API error. Exact parity makes the editor's clamp the UX affordance and the schema the backstop, never in conflict.

## Risks / Trade-offs

- **[Empty/NaN input]** Clearing the field yields `Number('') === 0`, which then clamps to the field's min (e.g. Max HP snaps to 1). → Acceptable and arguably desirable: the committed value is always valid. No mid-typing empty state is persisted because the editor commits live.
- **[Existing out-of-range data]** A previously-saved scenario could already hold an out-of-range value (e.g. legacy `maxRange: 30`). Reads aren't re-validated, so it still loads and displays; but the next **save** of that archetype now fails backend validation until the value is brought in-range. → Acceptable: the seed/bundled defaults are all in-range (`maxRange` ≤ 15, `damage` ≤ 2), and the editor will have clamped any value the user touches before save. Worst case is a clear API rejection prompting an edit, not data loss.
- **[Tighter schema rejects a previously-valid write]** Tightening `unitDefSchema` means a payload that passed before (e.g. `damage: 40`) is now a 400. → Intended. The bundled-default drift test (`unitDefs.test.ts`) confirms the seed still validates; add cases for the new rejections so the bound is locked in.
- **[Built on the landed `dungeon-tactics-live-unit-def-edits`]** That change has landed/archived; its `clampDef` + live-commit path is the surface this change retunes. → No rebase risk remains. The work is now small and additive: change four constants, add three, extend `clampDef`'s damage/range clamps, add native `min`/`max` attributes, special-case the two range mutators, and tighten the backend schema. The `persisted-unit-defs` spec delta appends new requirements rather than editing the reshaped ones.

## Migration Plan

No data migration and no DB/schema-shape change. The client clamp ships with the normal Vite build of `client-games`; the tighter Zod bounds ship with the server build. Order doesn't matter between the two halves — a looser old client against the tighter new schema simply gets its out-of-range writes rejected (and the editor wouldn't produce them anyway). Rollback is reverting the commit; persisted def shape is unchanged, so saved scenarios remain readable across either version.

## Open Questions

None.
