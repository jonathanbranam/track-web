## 1. Definition data structure and table

- [ ] 1.1 Add the `UnitDef` interface to `types.ts` (`maxHp`; `movement.range`; `attack.damage`; `attack.targeting { mode, arc, minRange, maxRange }`; `attack.propagation { shape: 'single' | 'line' | 'plus', penetration: 'none' | 'stop_at_first' }`)
- [ ] 1.2 Create `unitDefs.ts` exporting `Record<PcType | NpcType, UnitDef>` for all six archetypes (melee, rogue, ranger, magic-user, short-range, long-range) with values matching today's behavior (maxHp 3 all; range melee/rogue 4 else 3; damage melee 2 else 1; footprints per design)
- [ ] 1.3 Add a unit test asserting each archetype's `UnitDef` values (range, maxHp, damage, shape, ranges)

## 2. Shared attack footprint

- [ ] 2.1 Add a single `attackFootprint(def, origin, dir)` helper deriving covered tiles from `propagation.shape` + `targeting` range (`single` → tile at minRange; `line` → minRange..edge; `plus` → center at maxRange + 4 cardinal neighbors, board-clipped)
- [ ] 2.2 Add unit tests for the footprint helper per shape, including `plus` geometry/grid-clipping and the ranger `line` (distance 2→edge)

## 3. Rewire `pc.ts` to the data

- [ ] 3.1 Change `attackDamage(unit)` to read `unitDefs[unit.unitType].attack.damage`
- [ ] 3.2 Rewrite `attackSquares()` to use `attackFootprint` (drop its `switch (unitType)` block)
- [ ] 3.3 Rewrite `resolveAttack()` to use `attackFootprint` + `propagation.penetration` (`stop_at_first` halts at first unit/structure — ranger; `none` hits the whole footprint — magic-user plus)
- [ ] 3.4 Remove the now-dead per-archetype branch helpers and confirm no `switch (unitType)` / `unitType === …` remains in `pc.ts` for stats or attack shape

## 4. Rewire `npc.ts` to the data

- [ ] 4.1 Make `findShortRangeTarget` / `findLongRangeTarget` read move range, damage, and distance bounds from `unitDefs` (keep the existing scan-loop / target-selection structure)

## 5. Re-point the override defaults at the table

- [ ] 5.1 In `statOverrides.ts`, seed `maxHpByType` / `moveRangeByType` from `unitDefs` and remove the duplicated `DEFAULT_MAX_HP` / `defaultMoveRange()` constants; keep `getMaxHp` / `getMoveRange` / setters / clamps / `resetOverrides` and the `moveRange(unit)` delegation intact

## 6. Verify and document

- [ ] 6.1 Run existing tests (`placement.test.ts`, `undo.test.ts`) plus the new tests — all pass
- [ ] 6.2 Build client-games (`npm run build`) with zero TypeScript errors
- [ ] 6.3 Manually verify "plays identically": all nine units' reachable tiles, attack footprints, damage, and 3-pip HP match pre-change; confirm an admin-mode stat override still takes effect
- [ ] 6.4 Update `docs/games/dungeon-tactics/unit_framework.md` to remove dice/randomness from the effect spec (damage is a flat integer), keeping doc and implementation consistent
