## 1. Delete the step catalog

- [x] 1.1 Delete
      `client-games/src/games/dungeon-tactics-solo/features/steps-catalog.json`
- [x] 1.2 Delete `client-games/scripts/generate-step-catalog.ts`
- [x] 1.3 Remove the `generate:step-catalog` script from
      `client-games/package.json`
- [x] 1.4 Edit the catalog references out of
      `client-games/src/games/dungeon-tactics-solo/features/README.md`,
      leaving the frozen-status banner and the rest of the file intact

## 2. Delete the engineer skill

- [x] 2.1 Delete the `.claude/skills/scenario-to-change/` directory
- [x] 2.2 Confirm every other skill under `.claude/skills/` is still present

## 3. Refile the PC archetypes

- [x] 3.1 Verify the ADDED delta in
      `openspec/changes/dungeon-tactics-harness-backout/specs/pc-archetypes/spec.md`
      matches the source requirements character for character (6 melee
      scenarios, 4 rogue scenarios)
- [x] 3.2 Edit `openspec/specs/pc-archetypes/spec.md`'s `## Purpose` so it
      describes all four PC archetypes and no longer refers to melee having its
      own capability
- [x] 3.3 Delete `openspec/specs/melee-archetype/` and
      `openspec/specs/rogue-archetype/` (deleted directly rather than emptied
      by a delta — see design.md)
- [x] 3.4 Delete `openspec/specs/dungeon-tactics-step-catalog/` and
      `openspec/specs/dungeon-tactics-engineer-skill/`

## 4. Verify

- [x] 4.1 Grep for `steps-catalog`, `generate:step-catalog`, and
      `scenario-to-change`; confirm the only hits are archived changes and
      historical phase docs
- [x] 4.2 `npm test` passes
- [x] 4.3 `npm run test:dungeon-tactics` passes — the `melee` and `rogue`
      feature files still run green
- [x] 4.4 `npm run build:games` completes with zero TypeScript errors
