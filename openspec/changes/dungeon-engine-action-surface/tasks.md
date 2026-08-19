## 1. The action surface

- [x] 1.1 Add `packages/dungeon-engine/src/actions.ts` with `ActionId`, `SelectionKind`, `ActionOption`, `ActionPreview`, and the effect union.
- [x] 1.2 Implement `availableActions(state, unitId)` — move and attack, each with availability, reason, selection kind, targets, and overlay hint. Unavailable actions are returned, not filtered.
- [x] 1.3 Implement tile→direction resolution internally, membership-checked, with a documented fixed scan order for ambiguous tiles.
- [x] 1.4 Implement `previewAction(state, unitId, action, tile)` returning affected tiles, cost, the effect union, and `hitsNothing`. No state mutation.
- [x] 1.5 Implement `commitAction(state, unitId, action, tile)` — validate unit, availability, target membership, movement budget and path, and prior attack; then delegate to `applyMove` / `resolvePcAction` / `resolveNpcAction`, preserving the PC-footprint vs NPC-single-tile asymmetry.
- [x] 1.6 Export the surface from `packages/dungeon-engine/src/index.ts`.

## 2. Supporting engine queries

- [x] 2.1 Add an exported `threatTiles(state, unitId)` in `npc.ts` (or a query module) over the same targeting walk the private scanners use.
- [x] 2.2 Add `reconcileHp(state, prevMax)` implementing the max-HP delta rule with the floor at 1; export it.

## 3. Tests

- [x] 3.1 `actions.test.ts`: availability matrix — unmoved PC, PC with spent movement, PC that has attacked, NPC — asserting reasons as well as flags.
- [x] 3.2 Targets: move targets equal `validMoveDests`; attack targets are the union across directions, including a magic-user's off-axis neighbours.
- [x] 3.3 Rejection: target outside the offered set; **axis-aligned tile beyond coverage** (the shipped bug — assert no damage anywhere); second attack in a turn; move beyond budget; an NPC aimed across the board. Each asserts the state is unchanged. Both guards verified load-bearing by removing each in turn and watching a test fail.
- [x] 3.4 Acceptance: a committed move charges the budget; a committed attack locks the unit; an off-axis magic-user commit resolves the cross containing that tile.
- [x] 3.5 Preview/commit agreement: for each archetype, a preview's reported effects match the state change the equivalent commit produces.
- [x] 3.6 `hitsNothing`: an attack over empty tiles is available, previews as hitting nothing, and commits successfully while still locking the unit.
- [x] 3.7 `threatTiles`: a ranged unit threatens its whole band; the result follows an edited definition.
- [x] 3.8 `reconcileHp`: raise, lower-past-current (floors at 1, unit survives), and untouched archetypes.

## 4. Gates

- [x] 4.1 `npm test` — new tests pass and the existing suite is unaffected.
- [x] 4.2 Package typechecks as part of the client build (this repo has no standalone typecheck script; `build:games` type-checks the engine through its consumer).
- [x] 4.3 `npm run build:games` clean — the engine is consumed by a client build.
- [x] 4.4 Confirm no file under `client-games/` changed: this change is additive by design.
