## 1. Preparation

- [x] 1.1 Read `kb/phaser-mobile-input.md` and confirm both patterns before touching input code: scene-level `this.input` for canvas taps, `windowEvents: false` for the DOM overlay.

## 2. Retire `move-attack`

- [x] 2.1 Remove the `move-attack` variant from `PcAction` in `packages/dungeon-engine/src/types.ts`.
- [x] 2.2 Remove its branch from `resolvePcAction` in `pc.ts`, keeping `move` and `attack` behaviour identical.
- [x] 2.3 Remove the unreachable `move-attack` branches from `DungeonTacticsScene.ts` (`animatePcAction`, and the move branch's kind test).
- [x] 2.4 Remove the `move-attack` case from `nodeHost.test.ts`.
- [x] 2.5 Rewrite `melee-move-attack-same-turn` in `features/melee.feature` and its steps in `features/steps/pc.steps.ts` as two commits through the action surface: assert the movement budget is charged, the attack resolves from the new cell, and the PC is locked afterwards.

## 3. Adopt the action surface in the game

- [x] 3.1 `DungeonTacticsGame.tsx`: delete the tile→direction derivation block and commit taps through `commitAction`, surfacing a rejection reason instead of acting.
- [x] 3.2 `DungeonTacticsGame.tsx`: drive move taps through `commitAction` as well, so both actions share one path.
- [x] 3.3 `DungeonTacticsScene.ts`: paint highlights from the active action's `targets` and `overlay` rather than unioning `attackSquares`.
- [x] 3.4 `DungeonTacticsScene.ts`: derive attack animation geometry from `preview().affected`; delete the hardcoded ranger loop and magic-user cross.
- [x] 3.5 `hud/UnitInfoPopup.tsx`: render the engine's action list — Move and Attack, disabled with the engine's reason where unavailable.
- [x] 3.6 `DungeonTacticsGame.tsx`: replace the inline max-HP reconciliation in `applyDefChange` with the engine's `reconcileHp`.

## 4. Tests

- [x] 4.1 A test covering the fixed bug at the seam the game uses: an aligned tile beyond reach cancels and deals no damage.
- [x] 4.2 Gherkin: the rewritten melee move-then-attack scenario passes and fails if the budget is not charged.
- [x] 4.3 `npm test` — full suite passes.

## 5. Gates

- [x] 5.1 `npm run build:games` clean.
- [x] 5.2 Browser check with playwright against a locally started dev server, stopped afterwards: select a PC, confirm Move and Attack render; spend movement and confirm Move disables with a reason; attack and confirm both disable; tap an aligned out-of-range tile and confirm it cancels without damage; confirm a magic-user can be aimed at an off-axis arm.
- [x] 5.3 Confirm canvas taps and HUD button clicks both still work (the two `kb/phaser-mobile-input.md` patterns).

## 6. Found while implementing

- [x] 6.1 `DungeonTacticsGame.tsx` held the max-HP rule **twice** — in `applyDefChange` and in a second `reconcileHp` callback. Both now call the engine's rule; the callback is renamed `applyHpReconciliation` since it also redraws.
- [x] 6.2 `drawPlanningOverlay` iterated `state.plans`, which nothing has written since PC actions became immediate. The dead loop is removed; the NPC attack telegraphs it also drew are kept.
- [x] 6.3 Browser testing showed the engine's reasons naming units by internal id ("pc-2 has already attacked"). Reasons now use the unit's display name, which reads correctly for a player and still sits beside the id in the harness.
