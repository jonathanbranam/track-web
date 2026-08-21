> **Amended 2026-08-21, after implementation.** This change first landed with the
> phase guard lifted in bench mode, on a `dungeon-bench` requirement that had
> stopped being true. See `design.md`'s first decision and
> `harness:docs/dungeon-harness/harness-rebuild/phase-5-correction.md` §6 step 1.
> Tasks left ticked are unaffected by the amendment and already done; unticked
> ones are the correction.

## 1. The phase guard

- [ ] 1.1 In `availableActions`, report every action unavailable with a
      plain-English reason when `state.phase !== 'player'`. **No engine-mode
      condition** — drop `&& getEngineMode() !== 'bench'`. Empty target tiles,
      same shape as the other unavailability reasons.
- [ ] 1.2 Confirm `commitAction` refuses in the same case — it already routes
      availability through `availableActions`, so verify rather than duplicate.
- [x] 1.3 Delete the "What is deliberately NOT validated here: turn phase"
      comment at the top of `actions.ts`. It is now wrong, and leaving it would
      tell the next reader the opposite of what the code does.
- [ ] 1.4 Remove the now-unused `getEngineMode` import from `actions.ts`, and
      correct the guard's own comment — it currently explains the bench
      exemption.

## 2. The action surface is the player's

- [ ] 2.1 `availableActions` reports every action of a `unit.kind === 'npc'`
      unavailable, in **every** phase, with a reason saying an enemy takes its
      turn by being planned. Order it ahead of the phase reason: it is true in
      every phase, and it tells a designer what to do instead.
- [ ] 2.2 Delete the `npcPlannedThisRound` check in `availableActions`. With 2.1
      an enemy is refused before it is ever reached — dead code, and a second
      answer to a question that now has one.
- [x] 2.3 `commitNpcTurn` and `advanceNpc` refuse an enemy that has already moved
      or attacked this round through the action surface.
- [x] 2.4 `unplannedNpcs` excludes such an enemy, or `advance` will keep offering
      it as the next thing to plan and the enemy phase will never end.
- [ ] 2.5 Re-describe 2.3/2.4 in `sequencer.ts`'s comments as **defence-in-depth**
      rather than the mirror of a live path: only `pc.ts` writes
      `movedThisTurn`/`attackedThisTurn`, and it is reachable only through
      `commitAction`, which now refuses every enemy. Say why they stay — the
      engine must be correct for a host that does not exist yet.

## 3. Demote the raw applier

- [x] 3.1 Remove `resolveNpcAction` from `packages/dungeon-engine/src/index.ts`.
      Keep `computeNpcTurns` exported — the game still re-derives telegraphs with
      it on a definition edit.
- [x] 3.2 Confirm nothing outside the package imports it, in **both** repos.

## 4. Tests

- [ ] 4.1 Out-of-phase acting is refused for a PC — and refused **the same way in
      bench mode**. The bench-mode case is now an assertion that the exemption is
      gone, not that it works; write it as such so nobody reads it as a leftover.
- [ ] 4.2 An enemy has no actions in any phase, including the player phase, and a
      commit against one is refused. Replaces the old "plan an enemy then drive
      it" test, whose first half no longer has a route.
- [ ] 4.3 The sequencer's defence-in-depth guard still holds. No public call can
      put an enemy into the spent state any more, so construct the state directly
      (`movedThisTurn: { 'npc-0': 1 }`) and assert planning refuses it, that
      `unplannedNpcs` omits it, and that the enemy phase still reaches the player
      phase. Note in the test why it builds state by hand.
- [x] 4.4 A new round clears both records.
- [ ] 4.5 Existing suites: `npm test` and `npm run test:dungeon-tactics`.
      **A test that now fails is a decision, not a chore.** Do not weaken a guard
      to keep a test green — report it instead.

## 5. Verify

- [ ] 5.1 Play a round of the game in a browser (a disposable second instance —
      `docs/dev-second-instance.md`, do not touch the dev database or restart a
      server you did not start): placement, PC turns, ending the turn, telegraph
      resolution, the round chain. The game should be unchanged; its HUD already
      offered these controls only during the player phase and only for PCs.
- [ ] 5.2 Confirm the refusals read well — an enemy's reason especially, since a
      designer will meet it by clicking one. It should name the planning seat.
- [ ] 5.3 The harness will be broken until its own change lands. Do not fix it
      here; report what breaks so `dungeon-bench-guard-adoption` can aim at it.
