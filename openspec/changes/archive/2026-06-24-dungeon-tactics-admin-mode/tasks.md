## 1. Session-scoped stat overrides

- [x] 1.1 Add `statOverrides.ts` with mutable per-`unitType` maps for `maxHp` and `moveRange`, seeded with current defaults (move: `melee`/`rogue` → 4, else 3; maxHp: 3 for all)
- [x] 1.2 Export `getMoveRange(unitType)`, `getMaxHp(unitType)`, `setMoveRange(unitType, n)`, `setMaxHp(unitType, n)` with integer clamping (HP 1–9, move 0–12), plus `resetOverrides()` for tests
- [x] 1.3 Rewrite `moveRange(unit)` in `pc.ts` to delegate to `getMoveRange(unit.unitType)`; confirm `validMoveDests`, `remainingMove`, and NPC planning still compile and behave unchanged at default values
- [x] 1.4 Seed/clamp unit `hp` to `getMaxHp(unitType)` in `initialState()` so a reset match respects edited max HP

## 2. Admin toggle (HUD)

- [x] 2.1 Add `private adminMode = false` to the scene; render an "Admin" toggle button in `drawHud()` in the upper-right (near Reset), with an active/highlighted style when on
- [x] 2.2 Record an Admin hit region and handle its tap in the pointer handler: flip `adminMode` and re-run `drawHud()` (no `GameState` change, no controller round-trip)
- [X] 2.3 Verify the toggle stays anchored upper-right while the board pans/zooms (UI camera) and reflects on/off state

## 3. Editable stats in the info popup

- [x] 3.1 In `drawUnitPopup`, source displayed max HP and movement from `getMaxHp`/`getMoveRange` instead of the literal `3` and `moveRange(unit)`
- [x] 3.2 When `adminMode` is on, render `− value +` steppers for max HP and movement; keep attack damage and other stats read-only; when off, render the existing read-only stat lines
- [x] 3.3 Extend `popupHit` with `hpMinus/hpPlus/moveMinus/movePlus` regions and emit `admin-stat-edit { stat, unitType, delta }` on tap (only when `adminMode` is on)

## 4. Controller wiring

- [x] 4.1 In `DungeonTacticsGame.tsx`, handle `admin-stat-edit`: for `move`, call `setMoveRange` and redraw; for `maxHp`, call `setMaxHp`, then shift every affected unit's `hp` by the effective delta (`newMax − oldMax`) in both directions — floored at 1 (`max(1, hp + effectiveDelta)`) so lowering max HP can never kill a unit — in `stateRef`, then redraw
- [X] 4.2 Confirm a movement increase immediately changes the selected unit's walk-destination tiles on redraw (per-archetype), and other archetypes are unaffected

## 5. On-board consistency

- [x] 5.1 Update `drawHpPips` (and structure/board pip rendering as needed) to use `getMaxHp(unit.unitType)` so board pips match edited max HP

## 6. Verification

- [X] 6.1 Verify gameplay is unchanged with admin off (popup read-only, default move/HP)
- [X] 6.2 Verify per-archetype editing: editing a melee unit changes all melee units; rangers/rogues/etc. unaffected
- [X] 6.3 Verify lowering an archetype's max HP clamps current HP of affected units
- [X] 6.4 Verify reload discards overrides (defaults restored) and turning admin off keeps committed overrides for the session
