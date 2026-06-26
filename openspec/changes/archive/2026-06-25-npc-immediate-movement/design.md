## Context

Today the NPC turn is fully deferred and replayed. `computeNpcPlans` (in `npc.ts`) is invoked at the *end* of the prior round (`endRound`) and after placement (`handlePlacementDone`). It produces `GameState.npcPlans: NpcAction[]`, where each action bundles **both** the move and the attack (`move`, `move-attack`, `attack`, `exit`, `stay`). The plan is computed against the board as it stands *before* any NPC has moved; it threads each NPC's destination through a local `workingUnits` array so later NPCs path around earlier ones.

During the player's turn the scene draws this telegraph as an orange **route polyline + arrowhead** (intended movement) plus an attack marker (circle / footprint). When the player clicks Done → Confirm, `handleConfirmEndTurn` calls `beginNpcPlayback` (switches `phase` to `npc-playback`) and `runNpcPlayback` walks the action list, animating each via `scene.animateNpcAction` and applying it via `resolveNpcAction` (which re-walks the committed path, stopping at anything now blocking, and applies attack damage). After the last action, `endRound` resets per-turn state and recomputes `npcPlans` for the next round.

Net effect the user dislikes: NPCs spend the whole round as static route previews and only physically advance *after* the player's turn, so PCs are routinely left out of contact and the loop feels slow.

Key code touchpoints:
- `npc.ts` — `computeNpcPlans`, `resolveNpcAction`, `beginNpcPlayback`, `endRound`, `initialState`.
- `types.ts` — `TurnPhase`, `NpcAction`, `GameState.npcPlans`.
- `DungeonTacticsGame.tsx` — `runNpcPlayback`, `handleConfirmEndTurn`, `handlePlacementDone`, `applyDefChange` (granular `replanIds` re-plan for live studio def edits).
- `DungeonTacticsScene.ts` — `drawPlanningOverlay` (NPC route polyline + arrowhead block, ~lines 340–395), `animateNpcAction`, `clearPlanningOverlay`.

## Goals / Non-Goals

**Goals:**
- NPCs **move immediately**, one at a time in turn order, at the start of each round — movement is applied to the real game state and animated as it happens, not previewed.
- Remove the NPC **movement** telegraph (the orange route polyline + arrowhead).
- Keep the NPC **attack** telegraph: after moving, each NPC stores its intended attack, which is rendered in the scene during the player turn.
- Preserve the existing attack-resolution timing and rules: planned attacks resolve only when the player ends their turn (Done → Confirm), unchanged.
- Preserve per-archetype targeting/move-range/attack logic (`findShortRangeTarget`, `findLongRangeTarget`, `resolveTargetPos`, `plannedPath`, A* via `pathToAdjacentCell`).

**Non-Goals:**
- No change to PC planning, undo, or the immediate-PC-move mechanics.
- No change to attack damage, footprints, archetype defs, or the data-driven unit-def model.
- No change to how/when the player confirms end of turn.
- No new persisted state, backend, DB, or deploy changes — client game logic + rendering only.

## Decisions

### 1. Split the NPC turn into two temporally separate phases
Replace the single deferred `npc-playback` with two animated phases:
- **`npc-move`** — runs at the *start* of a round (after placement for round 1, and immediately after the prior round's attacks resolve for later rounds). Each NPC, in turn order, decides its full turn, has its **movement applied + animated immediately**, and stores its attack as a telegraph.
- **`npc-attack`** — runs when the player clicks Confirm. Each stored attack telegraph resolves in turn order (same rules/animation as today's attack/move-attack resolution).

`TurnPhase` becomes `'placement' | 'player' | 'npc-move' | 'npc-attack'`. The legacy `'pc-playback'` value is unused (PC actions already resolve immediately) and is dropped while we are editing the type; any stray reference is removed. `'npc-playback'` is removed.

### 2. Decouple movement from attack in the action/plan model
Movement and attack are no longer bundled in one `NpcAction`. Instead:
- `computeNpcPlans` is refactored (or wrapped by a new `computeNpcTurns(state, replanIds?)`) to return **two** lists: the per-NPC **move actions** to execute now (`move` | `exit` | `stay`) and the per-NPC **attack telegraphs** to store. A unit that today produces `move-attack` now produces a `move` (executed in `npc-move`) *plus* a separate attack telegraph (resolved in `npc-attack`).
- `GameState.npcPlans` is narrowed to hold **attack telegraphs only** — `{ kind: 'attack'; unitId; targetCol; targetRow }` (plus an implicit "no attack" for NPCs that only moved/stayed, represented by simply having no entry). The `move-attack` variant of `NpcAction` is removed; resolution reuses the existing `move` and `attack` branches of `resolveNpcAction`, which already handle these independently.

The sequential `workingUnits` threading already in `computeNpcPlans` is preserved — because no PC moves during `npc-move`, computing all NPC moves up front against `workingUnits` is identical to interleaving compute-then-animate per NPC. We keep the up-front compute and animate the resulting move list in order. This satisfies "each NPC plans against the post-move board of prior NPCs" with no logic change to the targeting helpers.

### 3. Attack target is computed from the NPC's post-move position
This already falls out of the current code: stationary attackers (`findShortRangeTarget` / `findLongRangeTarget`) target from their current cell, and the former `move-attack` computed its structure target after choosing the adjacent destination. We keep that — the stored telegraph's `targetCol/targetRow` is the cell as seen from where the NPC ends up. Because the attack resolves later (after PC moves) via the existing `attack` branch, a PC that moves off the telegraphed cell is missed — consistent with today's "telegraph then react" loop and acceptable/desirable.

### 4. Orchestration in `DungeonTacticsGame.tsx`
- New `runNpcMovePhase()`: sets `phase = 'npc-move'`, gets `{ moves, attackPlans }` from `computeNpcTurns`, animates each move in turn order (`animateNpcAction` + `resolveNpcAction`), sets `npcPlans = attackPlans`, then sets `phase = 'player'`, clears any movement overlay, redraws (attack telegraphs now visible), rerenders.
- New `runNpcAttackPhase(plans, idx)`: sets `phase = 'npc-attack'`, animates + resolves each stored attack in turn order (mirrors today's `runNpcPlayback`, attack-only).
- `handlePlacementDone`: after committing PC positions, call `runNpcMovePhase()` (round 1 NPCs advance before the first player turn).
- `handleConfirmEndTurn`: run `runNpcAttackPhase` over `state.npcPlans`; on completion call `endRound` (reset per-turn state, **no** pre-computed plans) and then chain into `runNpcMovePhase()` for the next round.
- `beginNpcPlayback`/`runNpcPlayback` are replaced by the two phase drivers above.

### 5. Scene rendering
- Delete the NPC **move/move-attack route polyline + arrowhead** block in `drawPlanningOverlay` (~lines 340–360) and the `exit` arrow telegraph; keep the **attack** marker block (circle / magic-user & red footprint). The overlay now reflects `npcPlans` containing only attack telegraphs.
- `animateNpcAction` keeps its `move`/`exit`/`attack` branches (used live during the two phases); the `move-attack` branch is removed.

### 6. Live studio def-edit re-plan (`replanIds`)
With movement already executed, a live archetype-def edit during the player turn can no longer re-route movement. `applyDefChange` is updated so a player-phase replan recomputes **attack telegraphs only** (from NPCs' current, already-moved positions) via the attack side of `computeNpcTurns`. Movement is immutable once executed for the round.

## Risks / Trade-offs

- **Round-1 behavior change:** NPCs now advance once before the player's very first turn (after placement). This is intentional (faster closing) but is a visible behavior shift from today, where round 1 opened with NPCs still at spawn. Flagged for confirmation.
- **Loss of movement preview:** the player no longer sees *where* an NPC intends to move before it moves — but since movement is now immediate, the player instead sees the NPC's **actual** final position plus the attack telegraph, which is strictly more accurate information for planning the PC turn.
- **Test churn:** `npc.test.ts` and any playback/turn tests assume the bundled `move-attack` action and deferred playback; they need rewriting for the split move/attack model and the two-phase orchestration.
- **`move-attack` removal blast radius:** removing the `NpcAction` `move-attack` variant touches `types.ts`, `npc.ts` (`computeNpcPlans`, `resolveNpcAction`), and `DungeonTacticsScene.ts` (`animateNpcAction`, overlay). Mitigated by reusing the already-independent `move` and `attack` branches rather than inventing new resolution logic.
- **Animation pacing:** two animated NPC phases per round (move at start, attack at end) instead of one combined playback. Net on-screen NPC animation time is similar, but it is now split across the round; per-tile speeds are reused so individual animations feel unchanged.
