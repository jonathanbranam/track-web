## 1. Tool swap

- [x] 1.1 Add `quickpickle` as a devDependency (root `package.json`);
      remove `@amiceli/vitest-cucumber` (`client-games/package.json`).
- [x] 1.2 Wire the `quickpickle` plugin into the root `vitest.config.mts`,
      add the `.feature` glob to `test.include`, and point `test.setupFiles`
      at the new shared step library's barrel file.

## 2. Shared step library

- [x] 2.1 Create `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`
      with parameterized (`{int}`/`{word}`) Given/When/Then step definitions
      covering melee's existing 3 scenarios' step phrasing.
- [x] 2.2 Create `features/steps/index.ts` barrel registering all step
      modules.
- [x] 2.3 Delete `features/melee.feature.test.ts` (no longer needed —
      `.feature` files run directly).

## 3. Verification

- [x] 3.1 Run `npm test` and confirm all 3 `melee.feature` scenarios pass
      via the shared step library, with no regressions elsewhere (419/419).
- [x] 3.2 Regenerate the step catalog
      (`npx tsx client-games/scripts/generate-step-catalog.ts`) and confirm
      it's unaffected (still parses `.feature` files directly).

## 4. Docs

- [x] 4.1 Update `features/README.md`'s step-writing convention to describe
      `quickpickle`, the shared `steps/` directory, and parameterized step
      text.
- [x] 4.2 Apply the `dungeon-tactics-gherkin-runner` spec delta (handled by
      `archive-change`/`sync-specs`).

## 5. Follow-up (not done in this change)

- [ ] 5.1 If `npm test`'s wall-clock regression (~5.4s → ~8.8s, from the
      step library's global `setupFiles`) becomes bothersome as more
      scenarios/units are added, scope it to only the dungeon-tactics
      feature tests via a Vitest workspace/project split.
