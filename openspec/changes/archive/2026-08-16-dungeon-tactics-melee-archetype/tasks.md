## 1. Gherkin scenario coverage

- [x] 1.1 Add `melee-move-range` step definitions (Given/When/Then) to
      `client-games/src/games/dungeon-tactics-solo/features/melee.feature.test.ts`,
      calling `pc.ts`'s `validMoveDests` directly against hand-built
      `GameState`/`Unit` input (no `defStore`/`contentStore` imports, per
      the `dungeon-tactics-gherkin-runner` capability's convention).
- [x] 1.2 Add `melee-attack-targeting` step definitions to the same file,
      calling `pc.ts`'s `setPlanAttack` + `attackSquares`.
- [x] 1.3 Confirm the existing `melee-attack-adjacent-npc` scenario and
      step definitions are unchanged.

## 2. Verification

- [x] 2.1 Run `npm test` and confirm all `melee.feature` scenarios pass,
      with no regressions elsewhere. (427/427 passed, incl. 11/11 in
      `melee.feature.test.ts`.)
- [x] 2.2 Confirm `npm run build:server` / relevant client build has zero
      TypeScript errors (no engine code changes are expected, but the new
      step-definition file must type-check). (`tsc --noEmit -p
      client-games/tsconfig.json` — zero errors.)

## 3. Spec archival (handled by `archive-change`)

- [x] 3.1 Merge `features/melee.feature` from this change into the
      canonical `client-games/src/games/dungeon-tactics-solo/features/melee.feature`.
      (Done ahead of archive, since the step definitions needed to run
      against the real file to verify task 2.1.)
- [x] 3.2 Apply the `pc-archetypes` delta (remove "Melee PC archetype").
- [x] 3.3 Apply the `melee-archetype` delta (new capability spec, from the
      `TBD` Purpose placeholder onward).
