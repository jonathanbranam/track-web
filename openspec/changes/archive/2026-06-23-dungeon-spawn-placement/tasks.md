# Tasks: dungeon-spawn-placement

## 1. Types & map data

- [x] 1.1 Add `placement` to the `TurnPhase` union in `types.ts`.
- [x] 1.2 In `map.ts`, encode the authored placement map literally as a constant (e.g. `SPAWN_ZONE_LAYOUT` — one string per row mirroring the design map, or an explicit `{col,row}` list) covering exactly the 41 placeable tiles from `design.md`.
- [x] 1.3 In `map.ts`, add the four fixed default PC start tiles as constants: melee `(4,5)`, ranger `(6,5)`, magic-user `(10,5)`, rogue `(13,5)`.

## 2. State & query helpers

- [x] 2.1 Add a `spawnZoneTiles()` helper (in `map.ts` or `turn.ts`, next to `structureKeys`) returning the `Set<string>` of `"c,r"` keys for the authored layout.
- [x] 2.2 In `pc.ts`, add `placeUnit(state, id, col, row)`: relocate the unit only when the target is in `spawnZoneTiles()`, holds no structure, and is not in `occupiedKey(units)`; otherwise return state unchanged.
- [x] 2.3 In `pc.ts`, support placement selection — either a `selectForPlacement(state, id)` helper or `selectUnit` leaving `planningPhase: 'none'` while `phase === 'placement'` (PC selected, no move/attack planning).
- [x] 2.4 In `npc.ts`, change `initialState()` to return `phase: 'placement'` with the four PCs seeded at their fixed start tiles (task 1.3); keep `computeNpcPlans` running so plan data exists but stays hidden.

## 3. Scene rendering (`DungeonTacticsScene.ts`)

- [x] 3.1 In `drawHighlights()`, add a leading branch: when `phase === 'placement'`, stroke+fill every `spawnZoneTiles()` tile in yellow `0xffff00` (stroke alpha 0.9, fill alpha 0.15), matching the walk-tile style; draw the zone only during placement.
- [x] 3.2 Confirm `drawPlanningOverlay()` keeps its `phase === 'player'` guard so NPCs render but show no planned move/attack during placement.
- [x] 3.3 In `drawUnitPopup()`, when `phase === 'placement'` render the Attack button in a disabled (dimmed, non-active) style and set `attackRect = null` so its hit region never fires `popup-attack-toggle`; keep Close (X) active.
- [x] 3.4 Add a placement Done control to the HUD that emits a distinct event (e.g. `hud-placement-done`) and bypasses the end-turn confirm modal.

## 4. Game wiring (`DungeonTacticsGame.tsx`)

- [x] 4.1 In the `unit-tapped` handler, add a `phase === 'placement'` branch ahead of the `player` branch: select the tapped PC for placement (open the dialog) without entering planning.
- [x] 4.2 In the `cell-tapped` handler, add a `phase === 'placement'` branch: when a PC is selected, call `placeUnit(...)`; ignore taps with no valid relocation (selection retained).
- [x] 4.3 Handle the placement Done event: set `phase: 'player'`, clear any placement selection, and redraw so combat overlays and NPC plans render normally.
- [x] 4.4 Verify `hud-reset` returns to the `placement` phase (it calls `initialState()`, now placement) — no extra work expected; confirm by inspection.

## 5. Tests & verification

- [x] 5.1 Add pure-logic checks: `spawnZoneTiles()` equals the 41-tile authored set (structure holes and trimmed flank corners absent), and each of the four PC start tiles is a member.
- [x] 5.2 Add pure-logic checks for `placeUnit`: in-zone empty tile relocates; out-of-zone, structure, and occupied targets are rejected (state unchanged); repositioning is repeatable.
- [x] 5.3 Run the client-games build (`npm run build`) and confirm zero TypeScript errors across all `phase` switches.
- [x] 5.4 Manual verification (dev server already running): start a match → yellow zone matches the map and NPCs are inert; selecting a PC opens the dialog with Attack disabled; relocate each PC and confirm illegal taps no-op; press Done → zone clears, NPCs gain plans, combat resumes; Reset → returns to placement.
