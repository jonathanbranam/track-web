## 1. The phase guard, gated on engine mode

- [ ] 1.1 In `availableActions`, report every action unavailable with a
      plain-English reason when `state.phase !== 'player'` **and** the engine is
      not in bench mode. Empty target tiles, same shape as the other
      unavailability reasons.
- [ ] 1.2 Confirm `commitAction` refuses in the same case — it already routes
      availability through `availableActions`, so verify rather than duplicate.
- [ ] 1.3 Delete the "What is deliberately NOT validated here: turn phase"
      comment at the top of `actions.ts`. It is now wrong, and leaving it would
      tell the next reader the opposite of what the code does.

## 2. Cross-check the two per-round ledgers

- [ ] 2.1 `availableActions`/`commitAction` refuse an enemy already in
      `npcPlannedThisRound`, with a reason saying its turn is spent.
- [ ] 2.2 `commitNpcTurn` and `advanceNpc` refuse an enemy that has already moved
      or attacked this round through the action surface — the mirror of 2.1.
- [ ] 2.3 `unplannedNpcs` excludes such an enemy, or `advance` will keep offering
      it as the next thing to plan and the enemy phase will never end. Check this
      explicitly; it is the failure mode that turns a refusal into a hang.

## 3. Demote the raw applier

- [ ] 3.1 Remove `resolveNpcAction` from `packages/dungeon-engine/src/index.ts`.
      Keep `computeNpcTurns` exported — the game still re-derives telegraphs with
      it on a definition edit.
- [ ] 3.2 Confirm nothing outside the package imports it, in **both** repos.

## 4. Tests

- [ ] 4.1 Out-of-phase acting is refused in game mode and permitted in bench
      mode, for both a PC and an enemy. Set and restore the mode around the
      bench-mode cases.
- [ ] 4.2 The double-act, both directions: plan an enemy then try to drive it,
      and drive an enemy then try to plan it. Both refused, nothing changed.
- [ ] 4.3 A spent enemy is not offered by `unplannedNpcs`, and the enemy phase
      still reaches the player phase with one on the board.
- [ ] 4.4 A new round clears both records, so the enemy is actable again.
- [ ] 4.5 Existing suites: `npm test` and `npm run test:dungeon-tactics`.
      **A test that now fails is a decision, not a chore.** One driving a unit
      out of phase should set bench mode or be re-aimed; one spending an enemy
      twice was asserting the defect. Do not weaken a guard to keep a test green
      — report it instead.

## 5. Verify both hosts still work

- [ ] 5.1 Play a round of the game in a browser: the phase guard is now live
      there, so confirm nothing that used to work has stopped — placement, PC
      turns, ending the turn, telegraph resolution, the round chain.
- [ ] 5.2 In the harness bench, confirm the spec'd out-of-sequence capability
      survives: drive an enemy by hand outside the player phase, and drive a PC
      during the enemy phase. Both should still be allowed, because the bench
      sets bench mode at startup.
- [ ] 5.3 In the bench, confirm the new refusal reads well: drive an enemy by
      hand, then try to plan it, and check the reason is a sentence a designer
      can act on.
