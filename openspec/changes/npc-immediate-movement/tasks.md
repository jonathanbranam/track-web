## 1. Types & data model (`types.ts`)

- [x] 1.1 Change `TurnPhase` to `'placement' | 'player' | 'npc-move' | 'npc-attack'` (remove `'pc-playback'` and `'npc-playback'`).
- [x] 1.2 Remove the `move-attack` variant from the `NpcAction` union; movement (`move` | `exit` | `stay`) and `attack` are now separate actions.
- [x] 1.3 Define the stored attack-telegraph type (e.g. `NpcAttackPlan = { kind: 'attack'; unitId; targetCol; targetRow }`) and narrow `GameState.npcPlans` to `NpcAttackPlan[]` (NPCs that only move/stay have no entry).

## 2. NPC turn computation (`npc.ts`)

- [x] 2.1 Refactor `computeNpcPlans` into `computeNpcTurns(state, replanIds?)` returning `{ moves: NpcAction[] (move|exit|stay), attackPlans: NpcAttackPlan[] }`; preserve the per-archetype targeting/move-range/A* logic (`findShortRangeTarget`, `findLongRangeTarget`, `resolveTargetPos`, `plannedPath`) and the `workingUnits` sequential threading so each NPC plans against prior NPCs' post-move positions.
- [x] 2.2 Where the old code emitted `move-attack`, emit a `move` in `moves` plus a separate `attack` entry in `attackPlans`, with the attack target computed from the NPC's post-move destination.
- [x] 2.3 Update `resolveNpcAction` to drop the `move-attack` branch (keep the independent `move`, `attack`, `exit` branches used by the two phases).
- [x] 2.4 Remove `beginNpcPlayback`; update `initialState` so it no longer pre-computes bundled `npcPlans` (start with empty attack telegraphs — round-1 movement runs on Start).
- [x] 2.5 Update `endRound` to reset per-turn state with empty `npcPlans` and **not** pre-compute the next round's turn (the `npc-move` phase computes it).
- [x] 2.6 Update the `npc.ts` module export list to match (`computeNpcTurns` in, `beginNpcPlayback` out).

## 3. Orchestration (`DungeonTacticsGame.tsx`)

- [x] 3.1 Add `runNpcMovePhase()`: set `phase = 'npc-move'`, call `computeNpcTurns`, animate each move in turn order (`animateNpcAction` + `resolveNpcAction`), set `npcPlans = attackPlans`, then set `phase = 'player'`, clear the movement overlay, redraw, rerender.
- [x] 3.2 Add `runNpcAttackPhase(plans, idx)`: set `phase = 'npc-attack'`, animate + resolve each stored attack in turn order (attack-only successor to `runNpcPlayback`), skipping plans whose unit has died.
- [x] 3.3 Update `handlePlacementDone` (the "Start" button) to commit PC positions and then call `runNpcMovePhase()` so round-1 NPCs move before the first player turn.
- [x] 3.4 Update `handleConfirmEndTurn` to run `runNpcAttackPhase(state.npcPlans)`; on completion call `endRound`, then chain into `runNpcMovePhase()` for the next round.
- [x] 3.5 Remove `runNpcPlayback` and the `beginNpcPlayback` import/usage.
- [x] 3.6 Update `applyDefChange` so a player-phase `replanIds` recompute updates **attack telegraphs only** (movement already executed and is immutable for the round).

## 4. Rendering (`DungeonTacticsScene.ts`)

- [x] 4.1 In `drawPlanningOverlay`, delete the NPC move/move-attack **route polyline + arrowhead** block and the `exit` movement-arrow telegraph; keep the attack marker (circle / magic-user & red footprint) driven by `npcPlans`.
- [x] 4.2 Update `animateNpcAction` to drop the `move-attack` branch (keep `move`, `exit`, `attack`); confirm `clearPlanningOverlay` still clears correctly between phases.

## 5. Tests & verification

- [x] 5.1 Update `npc.test.ts` for `computeNpcTurns` (split moves/attacks), removal of `move-attack`, and attack target = post-move position.
- [x] 5.2 Update/replace any turn/playback tests for the two-phase (`npc-move` / `npc-attack`) orchestration and immediate movement.
- [x] 5.3 Run `npm run build` and the game test suite; confirm no type/lint errors from the removed `TurnPhase`/`NpcAction` variants.
- [x] 5.4 Manually verify the full round in-browser: Start → NPCs move immediately in turn order with no route preview → only attack telegraphs shown during player turn → Done/Confirm → telegraphed attacks resolve; confirm pace feels faster and PCs reach contact sooner.
