## 1. Gherkin scenario coverage

- [x] 1.1 Add `melee-move-blocked` scenario to
      `client-games/src/games/dungeon-tactics-solo/features/melee.feature`:
      a melee PC on board row 7 (structure-free, per the existing
      move-range scenario's precedent) with a structure placed at one
      in-range tile and an NPC occupying another in-range tile; assert
      both occupied tiles are excluded from valid move destinations and
      an unaffected in-range tile remains valid.
- [x] 1.2 Add `melee-move-attack-same-turn` scenario to the same file: a
      melee PC moves adjacent to an NPC and attacks in the same turn
      action; assert the PC's new position and the NPC's resulting HP.
- [x] 1.3 Add a `a structure at column {int}, row {int}` Given step to
      `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`,
      setting `hasStructure: true` on that cell in `state.cells`.
- [x] 1.4 Add a `the PC moves to column {int}, row {int} and attacks to
      the {word}` When step to the same file, constructing a
      `move-attack` `PcAction` (empty `path`, since `resolvePcAction`
      only reads `toCol`/`toRow` during resolution) and calling
      `resolvePcAction`.
- [x] 1.5 Add a `the PC should be at column {int}, row {int}` Then step
      to the same file, asserting the PC unit's `col`/`row` in state.

## 2. Spec

- [x] 2.1 Confirm `openspec/changes/melee-move-attack-scenarios/specs/melee-archetype/spec.md`
      accurately reflects the two new scenarios added to
      `melee.feature` (wording only needs to match in substance, not
      verbatim Gherkin text).

## 3. Verification

- [x] 3.1 Run `npm run test:dungeon-tactics` and confirm all
      `melee.feature` scenarios pass, including the two new ones, with
      no regressions in the existing three. (5/5 passed.)
- [x] 3.2 Run `npx tsc --noEmit -p client-games/tsconfig.json` (or `npm
      run build:watch`) and confirm zero TypeScript errors. (Zero
      errors.)
- [x] 3.3 Run `npm test` and confirm no regressions elsewhere (this
      change touches no code outside `dungeon-tactics-solo`, so this
      should be a no-op check). (416/416 passed.)
