## 1. Client clamp bounds (`defStore.ts`)

- [x] 1.1 Update the clamp constants in `client-games/src/games/dungeon-tactics-solo/defStore.ts`: `HP_MAX` `9 → 20`, `MOVE_MAX` `12 → 22` (leave `HP_MIN = 1`, `MOVE_MIN = 0`); add `DAMAGE_MAX = 15`, `RANGE_MAX = 22`, `MAXRANGE_MIN = 1`, with a comment noting `RANGE_MAX`/`MOVE_MAX = 22` is the 16×8 board's max Manhattan span.
- [x] 1.2 Extend `clampDef` to clamp `attack.damage` to `[0, DAMAGE_MAX]`, `minRange` to `[0, RANGE_MAX]`, and `maxRange` to `[MAXRANGE_MIN, RANGE_MAX]` (replacing the current `[0,99]` clamps), then defensively apply `maxRange = max(minRange, maxRange)` so an inverted pair from any non-editor path can't reach the store.
- [x] 1.3 Update the `clampDef` doc comment (currently states "max HP [1,9], move [0,12]") to the new ranges and note it mirrors the backend Zod write schema.

## 2. Client editor fields + range coupling (`ScenarioEditor.tsx`)

- [x] 2.1 Give `numField` `min`/`max` parameters and render them as the `<input>`'s native `min`/`max` attributes (affordance only; commit-time clamping stays in `clampDef`).
- [x] 2.2 Pass each field's bounds at its call site: Max HP `1–20`, Move `0–22`, Damage `0–15`, Min rng `0–22`, Max rng `1–22`.
- [x] 2.3 Replace the inline Min rng / Max rng `mutate` callbacks with reconciling versions: setting `minRange` to `v` also raises `maxRange` to `v` when `v > maxRange`; setting `maxRange` to `v` also lowers `minRange` to `v` when `v < minRange`. The edited field keeps `v`; the partner is pushed to equal it.

## 3. Backend schema parity (`src/games/dungeon-tactics/unitDefs.ts`)

- [x] 3.1 Tighten `unitDefSchema` numeric bounds to match the editor: `maxHp` `int().min(1).max(20)`, `movement.range` `int().min(0).max(22)`, `attack.damage` `int().min(0).max(15)`, `minRange` `int().min(0).max(22)`, `maxRange` `int().min(1).max(22)` (replacing the `min(0|1).max(99)` ranges).
- [x] 3.2 Add a cross-field `superRefine` (or `refine`) on the schema that fails when `attack.targeting.maxRange < attack.targeting.minRange`, attaching the issue to the `maxRange` path so the `400` is specific.
- [x] 3.3 Update the "Bounds are deliberately generous (the in-app editor applies tighter UX clamps)" header comment to state the schema is now authoritative and mirrors the editor's bounds; keep/extend the existing client SYNC NOTE so the two duplicated bound sets stay in step.

## 4. Tests

- [x] 4.1 In `src/games/dungeon-tactics/unitDefs.test.ts`, add cases asserting the schema **rejects** out-of-range values (`maxHp` 0 and 25, `damage` 40, `movement.range` 30, `maxRange` 0) and **rejects** an inverted pair (`maxRange < minRange`); confirm the existing bundled-default validation cases still pass.
- [x] 4.2 Add client coverage for the new behavior: `clampDef` clamps each field to the new ranges and never yields `maxRange < minRange`; the Min/Max rng reconciliation pushes the partner in both directions (raise-min-pulls-max-up, lower-max-pulls-min-down) and leaves an already-ordered pair untouched.

## 5. Verify

- [x] 5.1 Run the test suite (server + client-games) and confirm green.
- [x] 5.2 Manually exercise the editor: typing negatives/zeros/over-cap values clamps on commit, native spinners stop at the bounds, and editing either range field keeps the pair ordered per the coupling rules.
