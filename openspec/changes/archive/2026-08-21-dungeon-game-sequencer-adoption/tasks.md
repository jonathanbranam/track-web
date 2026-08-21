## 1. Capture the baseline first

- [x] 1.1 Before changing anything, play a round in a browser and record what
      the enemy phase looks like: order, pacing, when telegraphs appear, when
      damage lands. This change is a relocation of ownership, so this recording
      is what "unchanged" is measured against — tests cannot see pacing.

## 2. One driver over the engine's round

- [x] 2.1 Replace `runNpcMovePhase`/`runNpcAttackPhase` with a single loop:
      `nextAction` to peek, animate if the step has something to animate,
      `advance` on animation completion, repeat until `nextAction` returns
      `null`.
- [x] 2.2 Map each step kind to its animation — `plan-enemy` animates its
      `action`, `resolve-telegraph` its `attack`, `skip-telegraph` and
      `phase-transition` animate nothing and advance immediately.
- [x] 2.3 Drop the host's own dead-NPC check; `skip-telegraph` is the engine
      already deciding it.
- [x] 2.4 Drop the host's round chaining. `endRound` and the call into the next
      NPC phase are the engine's `npc-attack → npc-move` transition.
- [x] 2.5 Keep `handleConfirmEndTurn` setting `phase: 'npc-attack'` — `advance`
      refuses during `player` and that is correct. It then starts the driver.
- [x] 2.6 Keep `animatingRef` accurate across the whole loop, including phase
      transitions, so HUD taps still cannot interleave mid-round.
- [x] 2.7 Advance on a refusal rather than retrying, so a step that cannot
      advance ends the loop instead of spinning.

## 3. Leave alone

- [x] 3.1 Do **not** change `applyDefChange`. Its `replanIds` path stays as it
      is: `amendTelegraph` is bench-gated and would refuse here, and the two are
      different operations — see design.md.
- [x] 3.2 Do not add the phase guard to `availableActions` or demote
      `resolveNpcAction`; both are `dungeon-sequencer-guards`.
- [x] 3.3 No engine changes. If this change seems to need one, report it.

## 4. Tests

- [x] 4.1 The existing `dungeon-tactics-solo` suites and the Gherkin scenarios
      (`npm run test:dungeon-tactics`) pass unchanged. They encode the round's
      observable behaviour, so an adjustment needed there means this change
      altered the game.
- [x] 4.2 `npm test` and the type build clean.

## 5. Verify in a browser — not optional

- [x] 5.1 Play several rounds and compare against the 1.1 recording: enemies
      move at round start in the same order, telegraphs appear before the player
      acts, attacks resolve on confirm, the round chains.
- [x] 5.2 Confirm animation pacing is unchanged — no step skipped, none played
      twice, no missing redraw between steps. This is what tests cannot see.
- [x] 5.3 Kill an NPC that has telegraphed, then confirm: its attack does not
      land and the rest resolve normally.
- [x] 5.4 Edit a unit definition mid-round via the Unit Designer and confirm
      affected telegraphs still refresh, with movement untouched.
- [x] 5.5 Tap HUD controls during an enemy animation and confirm they are still
      ignored rather than interleaving.
- [x] 5.6 Note: element refs change on every re-render, so re-snapshot before
      each click; a small target may ignore a synthetic click, in which case try
      clicking it via JS before concluding it is broken.
