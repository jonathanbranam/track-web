## Why

The unit editor's numeric fields (Max HP, Move, Damage, Min rng, Max rng) accept any value the user types — including negatives and zero. Several of these produce invalid or nonsensical unit definitions: a unit with `maxHp` ≤ 0 is dead/unplaceable, and an attack with `maxRange` < 1 can never reach a target. Clamping each field to a sensible range prevents the designer from saving a broken scenario and removes the need for downstream defensive handling.

## What Changes

- Add per-field range bounds to the numeric inputs in the unit editor (`ScenarioEditor.tsx`):
  - **Max HP** — minimum **1** (cannot be 0 or negative); no upper cap.
  - **Move** — range **0–22** (0 = immobile is valid; 22 spans the board).
  - **Damage** — range **0–15** (0 = non-damaging is valid).
  - **Min rng** — range **0–22** (cannot be negative).
  - **Max rng** — range **1–22** (an attack must reach at least one tile; cannot be 0 or negative).
- Enforce the cross-field rule **Max rng ≥ Min rng**: editing either field reconciles the pair so Max rng is never less than Min rng (raising Min rng pushes Max rng up to match).
- Enforce bounds on entry: each field renders native `min`/`max` attributes for browser hinting, and the value committed to the def is clamped to the field's range (in addition to the existing integer rounding) so typed or pasted out-of-range values cannot reach the store.

## Capabilities

### New Capabilities

_None._ This change tightens validation on the existing editor; no new spec file is introduced.

### Modified Capabilities

- `persisted-unit-defs`: Adds a requirement that the editor's numeric fields enforce per-field range bounds (clamped on edit) and the cross-field rule Max rng ≥ Min rng, so out-of-range values (negatives everywhere; zero for Max HP and Max rng; over-cap values) cannot be committed to the in-memory store or persisted.

## Impact

- **Client (`client-games/src/games/dungeon-tactics-solo/ScenarioEditor.tsx`):** `numField` gains per-field `min`/`max` parameters; the `onChange` clamp applies them after rounding. Each call site (Max HP, Move, Damage, Min rng, Max rng) passes its bounds. The Min/Max rng mutators additionally reconcile the pair to keep Max rng ≥ Min rng.
- No backend, API, or schema changes. No data migration.
- Note: the concurrent in-flight change `dungeon-tactics-live-unit-def-edits` also modifies `persisted-unit-defs` and reshapes the same editor (apply-on-edit). These changes touch the same file and spec; ordering/rebasing will need coordination.
