## Why

The unit editor's numeric fields (Max HP, Move, Damage, Min rng, Max rng) accept any value the user types — including negatives and zero. Several of these produce invalid or nonsensical unit definitions: a unit with `maxHp` ≤ 0 is dead/unplaceable, and an attack with `maxRange` < 1 can never reach a target. Clamping each field in the editor prevents the designer from saving a broken scenario; enforcing the **same bounds in the backend Zod schema** makes them authoritative so no write path (editor or otherwise) can persist an out-of-range def.

## What Changes

- Add per-field range bounds to the numeric inputs in the unit editor (`ScenarioEditor.tsx`):
  - **Max HP** — range **1–20** (cannot be 0 or negative).
  - **Move** — range **0–22** (0 = immobile is valid; 22 spans the board).
  - **Damage** — range **0–15** (0 = non-damaging is valid).
  - **Min rng** — range **0–22** (cannot be negative).
  - **Max rng** — range **1–22** (an attack must reach at least one tile; cannot be 0 or negative).
- Enforce the cross-field rule **Max rng ≥ Min rng**: editing either field reconciles the pair so Max rng is never less than Min rng (raising Min rng pushes Max rng up to match).
- Enforce bounds on entry: each field renders native `min`/`max` attributes for browser hinting, and the value committed to the def is clamped to the field's range (in addition to the existing integer rounding) so typed or pasted out-of-range values cannot reach the store.
- **Tighten the backend Zod schema (`src/games/dungeon-tactics/unitDefs.ts`) to the same bounds**, replacing today's deliberately-generous 1–99 ranges: `maxHp` 1–20; `movement.range` 0–22; `attack.damage` 0–15; `minRange` 0–22; `maxRange` 1–22; plus a cross-field refinement that rejects `maxRange < minRange`. Every persisted write (the bulk `PUT .../unit-defs`) is validated against this, so the schema — not just the UI — is the authority.

## Capabilities

### New Capabilities

_None._ This change tightens validation on the existing editor; no new spec file is introduced.

### Modified Capabilities

- `persisted-unit-defs`: Adds two requirements — (a) the editor's numeric fields enforce per-field range bounds (clamped on edit) and the cross-field rule Max rng ≥ Min rng; (b) the backend write-validation schema enforces the same bounds (and the same cross-field rule), so out-of-range values (negatives everywhere; zero for Max HP and Max rng; over-cap values) cannot be persisted by any client. Tightens the existing "writes definitions over a validated API" requirement, whose validation is currently described as generous.

## Impact

- **Client (`client-games/src/games/dungeon-tactics-solo/ScenarioEditor.tsx`):** `numField` gains per-field `min`/`max` parameters; the `onChange` clamp applies them after rounding. Each call site (Max HP, Move, Damage, Min rng, Max rng) passes its bounds. The Min/Max rng mutators additionally reconcile the pair to keep Max rng ≥ Min rng.
- **Backend (`src/games/dungeon-tactics/unitDefs.ts`):** tighten `unitDefSchema` bounds to match and add a cross-field refinement for `maxRange ≥ minRange`; update the "deliberately generous" rationale comment. The bundled defaults already satisfy the tighter bounds (`maxRange` ≤ 15, `damage` ≤ 2), so the seed and `unitDefs.test.ts` drift guard still pass; add tests asserting the new bounds reject out-of-range values and the cross-field rule.
- No API surface, route, or DB schema changes. No data migration (reads are not re-validated; only writes are guarded).
- **Ordering: this change lands second**, after `dungeon-tactics-live-unit-def-edits` (which reshapes the same editor to apply-on-edit and modifies the same `persisted-unit-defs` spec). The design builds on that apply-live editor; the clamp logic layers onto the post-reshape `numField`/commit path.
