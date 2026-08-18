## 1. Gherkin scenario coverage

- [x] 1.1 Confirm `rogue-move-range` passes against the existing generic
      step definitions in
      `client-games/src/games/dungeon-tactics-solo/features/steps/pc.steps.ts`
      (`a {word} PC at column...`, `the player queries valid move
      destinations for the PC`, the two `should [not] be a valid move
      destination` Then steps) — no new step definitions expected, since
      these are already parameterized by unit type.
- [x] 1.2 Confirm `rogue-attack-targeting` passes against the existing
      generic step definitions (`the player selects the attack direction
      {word} for the PC`, `the attack target should be exactly column
      {int}, row {int}`).
- [x] 1.3 Confirm `rogue-attack-adjacent-npc` passes against the existing
      generic step definitions (`an NPC with {int} hp at column {int}, row
      {int}`, `the PC attacks to the {word}`, `the NPC's hp should be
      {int}`).
- [x] 1.4 If any step text in `features/rogue.feature` doesn't already
      match a registered Cucumber Expression in `pc.steps.ts`, add the
      missing step definition there (not a new per-unit file), following
      the file's existing parameterization convention. (Not needed — all
      step text already matched existing expressions verbatim.)

## 2. Verification

- [x] 2.1 Run `npm run test:dungeon-tactics` and confirm all
      `rogue.feature` scenarios pass, with no regressions in `melee.feature`
      or other dungeon-tactics-solo scenarios. (2 test files, 6/6 passed.)
- [x] 2.2 Run `npm test` and confirm no regressions elsewhere (this
      change touches no code outside `dungeon-tactics-solo`'s Gherkin
      layer). (46 test files, 416/416 passed.)
- [x] 2.3 Confirm `tsc --noEmit -p client-games/tsconfig.json` reports
      zero errors. (Confirmed — zero errors.)

## 3. Spec archival (handled by `archive-change`)

- [x] 3.1 Merge `features/rogue.feature` from this change into the
      canonical
      `client-games/src/games/dungeon-tactics-solo/features/rogue.feature`
      (new file — no prior canonical rogue.feature exists). (Done ahead
      of archive, since the step definitions needed to run against the
      real file to verify task 2.1.)
- [x] 3.2 Apply the `pc-archetypes` delta (remove "Rogue PC archetype").
- [x] 3.3 Apply the `rogue-archetype` delta (new capability spec, from
      the `TBD` Purpose placeholder onward).
