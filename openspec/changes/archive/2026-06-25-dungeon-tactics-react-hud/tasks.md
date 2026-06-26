## 1. Scaffold the React HUD overlay

- [x] 1.1 Create `client-games/src/games/dungeon-tactics-solo/hud/` and add a `Hud.tsx` container rendered as a sibling of `<PhaserGame>` in `DungeonTacticsGame.tsx`, absolutely positioned full-bleed over the canvas
- [x] 1.2 Set the overlay container to `pointer-events-none` and establish the convention that only interactive controls set `pointer-events-auto` (D2)
- [x] 1.3 Pass `stateRef.current` (and the existing render tick) into the HUD so it re-renders on every `rerender()` (D1); confirm no new store is introduced

## 2. Status pill

- [x] 2.1 Add `StatusPill.tsx` deriving its text from `state.phase` / `state.planningPhase` (placement prompt, PC-actions, enemy-actions)
- [x] 2.2 Verify the pill text matches each phase (placement / player / enemy)

## 3. Action buttons

- [x] 3.1 Add `ActionButtons.tsx` rendering Reset (all phases), Start (placement only), Done (player phase only), Undo (player phase only)
- [x] 3.2 Drive Undo enabled/disabled + dimmed state from the undo stack length; no-op when empty
- [x] 3.3 Gate action handlers on `animatingRef` so controls are inert during tween playback (D6)
- [x] 3.4 Style buttons consistently with `ScenarioEditor` (Tailwind), respecting `--sab` safe-area at the bottom

## 4. Unit info popup

- [x] 4.1 Add `UnitInfoPopup.tsx` shown when a unit is selected; render display name and HP/Move/Attack via existing helpers (`unitDisplayName`, `getMaxHp`, `getMoveRange`, `attackDamage`, `hasAttacked`)
- [x] 4.2 Add a portrait `<div>` as the future unit-image seam (empty placeholder for now)
- [x] 4.3 Add Close and Attack-toggle controls wired to handlers (sections 6–7)

## 5. Confirmation modal (React-owned state)

- [x] 5.1 Add `ConfirmModal.tsx` and a React `confirmOpen` `useState` in `DungeonTacticsGame` (D3)
- [x] 5.2 Render the confirmation prompt and the "N units have not attacked" warning when applicable
- [x] 5.3 Wire Cancel (close, keep turn) and Confirm (end turn → enemy phase) controls

## 6. Extract engine handlers and wire HUD controls

- [x] 6.1 Extract the existing event-listener bodies into named handlers in `DungeonTacticsGame` (`handleReset`, `handlePlacementDone`, `handleConfirmEndTurn`, `handleUndo`, `handleToggleAttack`, `handleClosePopup`) (D4)
- [x] 6.2 Wire all HUD controls (sections 2–5) to call these handlers directly via `onClick`
- [x] 6.3 Confirm `unit-tapped` / `cell-tapped` board events remain in Phaser and share the same handlers where applicable

## 7. Verify interaction parity (before removing Phaser HUD)

- [x] 7.1 With both HUDs present, walk the spec-scenario checklist: status pill per phase; Reset; Start (placement-only) begins turn; Done → modal → Cancel/Confirm; Undo enabled/disabled+no-op; popup name+stats, Close, Attack toggle updates board overlay
- [x] 7.2 Verify empty-region taps pass through to the board and that board pan/zoom keeps the DOM HUD screen-anchored while board visuals transform
- [x] 7.3 Capture Playwright screenshots to `/tmp/track-verify/` for each phase and the popup/modal

## 8. Remove Phaser HUD and event round-trip

- [x] 8.1 Delete `drawHud`, `drawStatusPill`, `drawUnitPopup`, `drawConfirmModal`, `addHudButton`, the `confirmOpen` field, and the stored HUD hit `Rectangle`s from `DungeonTacticsScene.ts` (D7)
- [x] 8.2 Remove the `uiLayer` / `uiCamera` setup and their camera `ignore` wiring; keep `worldLayer`, the main camera, board drawing, and animations
- [x] 8.3 Remove the HUD branches from the scene `pointerup` handler, keeping board-input branches
- [x] 8.4 Remove the `hud-*` / `popup-*` event emissions in the scene and their listeners in `DungeonTacticsGame`

## 9. Final pass and verification

- [x] 9.1 Re-check pointer-events/stacking, mobile/narrow-screen layout, safe areas, and the animation guard
- [x] 9.2 Run `npm run build:watch` (client-games) and confirm zero TypeScript errors
- [x] 9.3 Re-run the full spec-scenario checklist in the browser to confirm parity with the removed Phaser HUD; capture final screenshots to `/tmp/track-verify/`
