## 1. NPC planner: granular re-plan

- [ ] 1.1 Add an optional `replanIds?: Set<string>` (or `string[]`) parameter to `computeNpcPlans(state, replanIds?)` in `npc.ts`. When omitted, behavior is byte-identical to today (plan all NPCs).
- [ ] 1.2 In the planning loop, for each NPC in order: if `replanIds` is provided and the NPC's id is **not** in it, reuse its existing action from `state.npcPlans` and thread that action's destination into `workingUnits`; otherwise recompute as today. Both branches must update `workingUnits` so collision-avoidance still holds.
- [ ] 1.3 Add unit tests in `npc.test.ts` (or extend an existing test file): (a) no-arg call equals current behavior; (b) `replanIds` re-plans only the named units and leaves others' actions identical; (c) a re-planned unit paths around earlier units' planned destinations and later units' current positions.

## 2. defStore: live-apply, diff, clamp

- [ ] 2.1 Add a structural def-equality / diff helper to `defStore.ts` (compare `maxHp`, `movement.range`, and the full `attack` block) that, given an incoming def map, returns the set of changed archetypes.
- [ ] 2.2 Add a clamp step so live-applied values are constrained to engine-valid ranges (max HP `[1,9]`, move `[0,12]`, non-negative integer damage/min-range/max-range) before they enter the store — mirroring the Zod write schema so the running match can never hold values the bulk write would reject.
- [ ] 2.3 Remove `persistDef` from `defStore.ts` (orphaned single-archetype persist, only used by admin mode).

## 3. Shared apply-def-change path + game wiring

- [ ] 3.1 In `DungeonTacticsGame.tsx`, refactor `applyEditedDefs` into a shared `applyDefChange(changedArchetypes)` that: reconciles each affected unit's current HP by the max-HP delta (floored at 1); re-plans only the changed **NPC** units via `computeNpcPlans(state, replanIds)` when the changed set contains an `NpcType`, `phase === 'player'`, and `!animatingRef.current`; then redraws + rerenders.
- [ ] 3.2 Change `reloadStore` to a hot def-swap instead of an `initialState()` restart: snapshot current store defs, run `loadFromServer()`, diff old vs new defs (task 2.1), and route the changed set through `applyDefChange` so the match keeps its positions/turn state. Leave Reset as the match-restart path.
- [ ] 3.3 Remove the `admin-stat-edit` event listener from `DungeonTacticsGame.tsx`.

## 4. Editor panel: live edits, Save persist-only, Reload

- [ ] 4.1 In `ScenarioEditor.tsx`, add a 500 ms trailing debounce (a `useRef` timer + a ref holding the latest pending defs). On each numeric `onChange`: update local state for input feedback **and** schedule a debounced commit that clamps and calls `applyDefChange` via the live-apply prop.
- [ ] 4.2 Flush the pending commit (cancel timer + apply now) on numeric input **blur**, on **Save**, and on editor **close/unmount**. Commit discrete `<select>` changes (shape, penetration) immediately with no debounce.
- [ ] 4.3 Make `onSave` persist-only: flush any pending commit, then call the bulk `putUnitDefs(slug, scenario, defs)` and report status. Remove the apply-on-save call (the store already reflects edits live).
- [ ] 4.4 Wire `onReload` to cancel the pending debounce, drop pending defs, and call the new hot-swap `reloadStore`; re-read `getCurrentDefs()` into local editor state afterward.
- [ ] 4.5 Adjust the editor's live-apply prop wiring so the panel feeds `changedArchetypes` (or the full edited map; the store computes the diff) into `applyDefChange`.

## 5. Remove admin mode from the Phaser scene

- [ ] 5.1 In `DungeonTacticsScene.ts`, remove `adminMode` state, the Admin HUD button and its tap handler, and ensure the toggle's removal doesn't leave dangling layout/anchor code.
- [ ] 5.2 Remove the admin branch of the unit info popup (extra panel height + stepper rows) and the `drawStatStepper` / stepper helper functions; the popup is permanently read-only.
- [ ] 5.3 Remove the `admin-stat-edit` event emission from the scene.

## 6. Backend: remove the single-archetype write endpoint

- [ ] 6.1 Remove the `PUT /api/games/:slug/scenarios/:scenario/unit-defs/:archetype` route from `src/routes/games.ts`. Keep the bulk `PUT .../unit-defs` and the repository per-archetype upsert.
- [ ] 6.2 Remove `putUnitDef` (single-archetype) from `client-games/src/api.ts`.
- [ ] 6.3 Update `src/routes/games.unit-defs.test.ts`: drop the single-archetype cases; confirm the bulk write, create-scenario, and set-default cases still pass.
- [ ] 6.4 Update `openapi.yaml`: remove the `.../scenarios/{scenario}/unit-defs/{archetype}` path.

## 7. Docs

- [ ] 7.1 Update `llm-context.md` to reflect that unit editing is exclusively via the Unit editor (admin mode removed), edits apply live, Save persists, and Reload hot-swaps without restarting the match.
- [ ] 7.2 Update `docs/app/planning.md` (or the relevant per-app planning doc) to mark admin-mode removal and the live-edit model as done, if tracked there.

## 8. Verify

- [ ] 8.1 Run the test suite (`npm test` / the project's test command) and confirm existing and new tests pass.
- [ ] 8.2 Run `npm run build:games` and `npm run build:server` and confirm zero TypeScript errors.
- [ ] 8.3 Manual check in the running app: editing a movement value live-changes walk tiles and re-plans only that NPC archetype; raising/lowering max HP shifts current HP (floored at 1); Save persists across a fresh load; Reload discards unsaved edits without restarting the match; the Admin toggle is gone and the popup is read-only.
