## 1. State and engine mode

- [x] 1.1 Add `npcPlannedThisRound: string[]` and `npcPlansResolved: string[]` to
      `GameState` in `packages/dungeon-engine/src/types.ts`, documented as the
      round's progress record.
- [x] 1.2 Default both wherever state is constructed or reset — `initialState`,
      `endRound`, and any deserialization path — so existing serialized states
      still load.
- [x] 1.3 Add `packages/dungeon-engine/src/engine-mode.ts`: `EngineMode`
      (`'game' | 'bench'`), a module-level value defaulting to `'game'`, plus
      getter and setter. Document that tests must set and restore it.
- [x] 1.4 Fix `endRound` so it no longer sets `phase: 'player'` for a host to
      immediately overwrite. Check the existing `endRound` tests still pass.

## 2. Extract the per-unit planner

- [x] 2.1 Lift `computeNpcTurns`' shared setup (`towerImmune`, `towerPos`,
      `npcFilter`) into a context value.
- [x] 2.2 Extract the per-unit loop body into a function that plans one unit
      against current state and returns its move plus optional telegraph.
- [x] 2.3 Refold `computeNpcTurns` onto it, preserving the `workingUnits`
      threading so each unit still plans against where prior units moved.
- [x] 2.4 Run the existing `npc.test.ts` — it MUST pass unchanged. If a test
      needs adjusting to fit new behaviour, the refold is wrong; fix the refold,
      not the test.

## 3. The sequencer

- [x] 3.1 Create `packages/dungeon-engine/src/sequencer.ts` returning the
      `{ ok, reason }` result shape used by `actions.ts`.
- [x] 3.2 Planning: plan the next unplanned enemy via AI, plan one named enemy
      via AI, and plan an enemy from a host-supplied move and telegraph. All
      three execute the move, lock the telegraph from the post-move position,
      and record the enemy in `npcPlannedThisRound`.
- [x] 3.3 Validate every planning path identically: legal move from the current
      position, legal attack from the post-move position, and refusal if the
      enemy is already planned. `stay` is always legal.
- [x] 3.4 Execution: one `advance` operation taking **no unit id**. Plans the
      next unplanned enemy during the enemy phase, resolves the next unresolved
      telegraph during resolution, otherwise transitions phase. Skip a telegraph
      whose unit has left the board.
- [x] 3.5 Queries: next step, unplanned enemies, and a unit's locked telegraph.
      During resolution the next step MUST read the recorded plan, not compute a
      fresh decision.
- [x] 3.6 `amendTelegraph`: bench-gated, validated from the unit's current
      position, refusing on a dead or unplanned unit. Never alters position.
- [x] 3.7 Write every refusal reason as a plain-English sentence naming the unit
      and the condition, matching the tone already used in `actions.ts`.
- [x] 3.8 Export the new surface from `packages/dungeon-engine/src/index.ts`.

## 4. Tests

- [x] 4.1 Planning: each of the three sources produces the same result for the
      same decision; movement is applied; the telegraph is computed from the
      post-move position; the enemy is recorded as planned.
- [x] 4.2 Planning refusals: already planned, illegal move, illegal attack — each
      changes nothing and carries a readable reason.
- [x] 4.3 An all-`stay` round is accepted, since the bench must be able to make
      every enemy hold.
- [x] 4.4 Order: enemies planned in a non-default order resolve their telegraphs
      in that order; an enemy planned after another accounts for its position.
- [x] 4.5 Execution: `advance` resolves in planned order; a dead enemy's
      telegraph is skipped; the enemy phase does not end while an enemy is
      unplanned.
- [x] 4.6 Queries: the reported next step matches what advancing does, and
      querying repeatedly changes nothing.
- [x] 4.7 Engine mode: `amendTelegraph` refuses by default and is evaluated on
      its merits once the mode is bench. Set and restore the mode in setup and
      teardown.
- [x] 4.8 Amendment: retargeting works, illegal retargeting refuses and leaves
      the original intact, position is untouched, a dead unit refuses.
- [x] 4.9 **The double-act regression.** First reproduce today's defect —
      `computeNpcTurns` ignores `movedThisTurn`/`attackedThisTurn`, so an enemy
      driven through the action surface and then planned by the AI acts twice.
      Confirm it reproduces, then assert the sequencer's per-round accounting
      makes it unrepresentable. Report what the reproduction did.

## 5. Verify nothing moved

- [x] 5.1 `npm run typecheck` and `npm test` clean, including
      `npm run test:dungeon-tactics` (the Gherkin scenarios run under their own
      config and are not part of the default `npm test`).
- [x] 5.2 Confirm no file under `client-games/` was modified — this change is
      engine-only and both hosts must still run on their existing paths.
- [x] 5.3 Verified 2026-08-20 by playing the bundled Classic Board through
      several rounds in a browser. Enemies move at round start, telegraphs
      appear during the player phase, attacks resolve on confirm, and the round
      chains into the next — the `endRound` path this change touched. Damage
      accumulates as expected: three structures destroyed and one PC killed
      across the run. No console errors beyond the pre-existing favicon 404 and
      the pre-login 401s.

      Note for whoever repeats this: element refs change on every re-render, so
      reusing a captured `Done`/`Confirm` ref across rounds silently clicks
      nothing and the board looks frozen. Re-snapshot each cycle. An earlier
      attempt hit exactly that and was briefly mistaken for the engine failing
      to apply damage.
