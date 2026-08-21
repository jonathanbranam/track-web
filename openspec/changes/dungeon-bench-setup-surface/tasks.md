## 1. The scenario module

- [ ] 1.1 Create `packages/dungeon-engine/src/scenario.ts` with the result types
      (`ScenarioResult`, `ScenarioPlaceResult`) and the internal fence helper
      returning a distinct reason for game mode and for the wrong phase.
- [ ] 1.2 `newScenario(cells)` — bench-mode fence only; returns a state holding
      those cells, no units, no spawners, `phase: 'placement'`, and every round
      record empty (the fields `emptyState` currently sets in the harness).
- [ ] 1.3 Unit ids: an internal `nextUnitId(state, unitType)` deriving
      `<unitType>-<n>` from the highest numeric suffix in `state.units`. No
      module-level counter.
- [ ] 1.4 `placeUnit(state, unitType, tile, hp?)` — bounds, occupancy, and
      structure checks; HP defaults to `getMaxHp(unitType)`; returns the placed
      `Unit` alongside the new state.
- [ ] 1.5 `removeUnit`, `relocateUnit`, `setUnitHp`, `clearUnits` — the rule
      checks currently in `BenchStore`, including relocation ignoring movement
      range and leaving turn records untouched, and `setUnitHp` refusing below 1.
- [ ] 1.6 `placeStructure(state, kind, tile, hp?)`, `removeStructure`,
      `moveStructure` — copy-on-write over `cells` in the style of
      `damageStructure`; move preserves kind and current HP; export the per-kind
      default HP (`power-center: 3`, `tower: 5`).

## 2. Export and document

- [ ] 2.1 `index.ts`: `export * as scenario from './scenario'`, plus the two
      result types and the structure-HP defaults, under a section comment saying
      the surface is bench-only.
- [ ] 2.2 `engine-mode.ts`: extend the doc comment — the fence now covers two
      different kinds of thing (a rule-break the game must never reach, and an
      authoring surface the game has no use for), and being behind it does not
      mean the bench plays by different rules.

## 3. Tests

- [ ] 3.1 `scenario.test.ts`, setting bench mode in setup and restoring `'game'`
      in teardown.
- [ ] 3.2 The fence: every operation refused in game mode; every state-taking
      operation refused in each non-`placement` phase; the two reasons are
      distinguishable; the state is unchanged in both cases.
- [ ] 3.3 Units: placed outside every spawn zone; refused on an occupied,
      structure-holding, or off-board tile; default HP from the definition store
      including a session override; relocation beyond movement range leaves turn
      records untouched; HP refused at zero.
- [ ] 3.4 Ids: two units of one archetype differ; placing into a state whose ids
      have gaps collides with nothing.
- [ ] 3.5 Structures: placed, refused on a unit or another structure, moved with
      HP preserved, removed; and a placed structure changes what `validMoveDests`
      and `threatTiles` report.
- [ ] 3.6 An authored scenario passed to `startScenario` enters `npc-move` the
      same way a loaded one does.

## 4. Verify

- [ ] 4.1 `npm test` in track-web (unit + Gherkin) and `tsc -b` clean.
- [ ] 4.2 Confirm nothing in `client-games` changed and the game's own placement
      phase behaves as before — this surface is unreachable in game mode.
- [ ] 4.3 Present to the developer. The harness adoption lands as its own change
      (`dungeon-bench-setup-adoption` in the sibling repo) and browser
      verification belongs there; do not archive this one before it.
