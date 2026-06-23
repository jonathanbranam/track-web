## 1. Selection model (pc.ts)

- [ ] 1.1 Change `selectUnit()` so selecting a PC returns `planningPhase: 'selecting-move'`, and selecting an NPC sets `selectedUnitId` with `planningPhase: 'none'` (info-only).
- [ ] 1.2 Add a helper for the NPC display name (returns the unit's `unitType` string) and confirm `moveRange`/`attackDamage` are exported for popup use.
- [ ] 1.3 Confirm `beginPlanAttack()` / `beginPlanMove()` / `cancelSelection()` remain the transitions for activate-action / cancel-action / dismiss (no signature changes).

## 2. Phaser popup container (DungeonTacticsScene.ts)

- [ ] 2.1 Add a bottom-anchored popup `Container` with `setScrollFactor(0)` and a depth above the planning/highlight overlays; build it as a reusable bottom-HUD element.
- [ ] 2.2 Render the PC popup variant: archetype, HP/max (3), move range, attack damage; leave layout room for a future portrait.
- [ ] 2.3 Render the NPC popup variant: name (`unitType`), movement (move range), HP/max — no action bar.
- [ ] 2.4 Add a Close (X) interactive that emits a `popup-close` event.
- [ ] 2.5 Add the PC action bar with an Attack button (interactive) that emits `popup-attack-toggle`; render it highlighted when `planningPhase === 'selecting-attack'`, normal otherwise; label stays "Attack".
- [ ] 2.6 Draw/refresh the popup from `state.selectedUnitId` inside `redraw()`; hide it when nothing is selected or when `phase !== 'player'`.

## 3. Tap routing (DungeonTacticsScene.ts)

- [ ] 3.1 In `pointerdown`, emit `unit-tapped` for NPC tiles too (currently ignored), while preserving the rule that during `selecting-attack` a unit's cell emits `cell-tapped` so NPC tiles stay attackable.

## 4. Component wiring (DungeonTacticsGame.tsx)

- [ ] 4.1 Remove the React Move/Attack/Cancel action menu; keep the Done button and its confirm dialog in React DOM.
- [ ] 4.2 In the `unit-tapped` handler, route a PC tap into PC selection (→ walk tiles + PC popup) and an NPC tap into info-only selection (NPC popup); selecting a different unit replaces the current popup and clears prior overlays.
- [ ] 4.3 Handle `popup-attack-toggle`: if inactive call `beginPlanAttack()`, if active call `beginPlanMove()`; redraw.
- [ ] 4.4 Handle `popup-close`: call `cancelSelection()`; redraw.
- [ ] 4.5 Implement the two-tier cell-tap cancel: in `selecting-attack`, a non-target tile calls `beginPlanMove()` (cancel action, keep popup); in `selecting-move`, a non-walk-destination/non-self tile calls `cancelSelection()` (dismiss unit). Keep existing actionable-tap behavior (plan move / set attack / clear-on-base-tap).

## 5. Verification

- [ ] 5.1 `npm run build` completes without errors.
- [ ] 5.2 Manually verify PC flow: select PC → popup + walk tiles; tap Attack → highlight + attack tiles; re-tap Attack or tap non-target → walk tiles return; tap walk tile → move planned.
- [ ] 5.3 Manually verify NPC flow: select NPC → info-only popup (name/movement/HP), no tiles or action bar; Close (X) dismisses.
- [ ] 5.4 Manually verify dismiss + precedence: empty-tile tap dismisses when no action active; during active Attack, tapping an NPC-occupied target attacks it rather than selecting the NPC; popup stays fixed while panning/zooming.
