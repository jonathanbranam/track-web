## 1. Dependency setup

- [ ] 1.1 Add `@amiceli/vitest-cucumber` as a devDependency in `client-games/package.json` and run `npm install` from the repo root.

## 2. Feature directory and example scenario

- [ ] 2.1 Create `client-games/src/games/dungeon-tactics-solo/features/`.
- [ ] 2.2 Write one trivial `.feature` file exercising a melee PC attack (e.g. `melee-attack.feature`) with Given/When/Then steps.
- [ ] 2.3 Write the matching step-definition file as `melee-attack.feature.test.ts` (`.test.ts` suffix, per design.md's file-naming decision — required for the root Vitest include glob to pick it up), using `@amiceli/vitest-cucumber`'s `loadFeature()`/`describeFeature()` and calling `pc.ts` functions directly against a hand-built `GameState`/`Unit`, with no `loadFromServer()` call and no import of `defStore.ts`/`contentStore.ts` beyond what `pc.ts` already uses internally.

## 3. Documentation

- [ ] 3.1 Write `client-games/src/games/dungeon-tactics-solo/features/README.md` documenting the step-writing convention: build `GameState`/`UnitDef` inputs and assert outcomes via direct `pc.ts`/`npc.ts`/`turn.ts` calls; never import `defStore.ts`/`contentStore.ts` in a step definition; step-definition files must use the `.test.ts` suffix, not `.spec.ts`.

## 4. Verification

- [ ] 4.1 Run `npm test` from the repo root and confirm the new Gherkin-driven scenario executes and passes alongside the existing `dungeon-tactics-solo` unit tests.
- [ ] 4.2 Run `npm run build:games` (or the equivalent `client-games` build script) and confirm zero TypeScript errors.
- [ ] 4.3 Confirm no other client app's test config, build script, or deploy file (`Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`) needed changes — this change adds no new client app or API route.
