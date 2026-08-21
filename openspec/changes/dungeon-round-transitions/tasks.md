## 1. The engine owns both transitions

- [x] 1.1 Add `startScenario(state): SequencerResult` to `sequencer.ts` —
      `placement → npc-move`, clearing `selectedUnitId` and `planningPhase`.
      Refused outside `placement`.
- [x] 1.2 Add `endPlayerTurn(state): SequencerResult` — `player → npc-attack`,
      same clearing. Refused outside `player`; when the phase is `npc-move`,
      the reason names the enemies `unplannedNpcs` still reports.
- [x] 1.3 Export both from `index.ts`.
- [x] 1.4 Tests: both transitions, both refusals, the unplanned-enemy message,
      and that a stale selection does not survive either transition.

## 2. The game calls them

- [x] 2.1 `handlePlacementDone` calls `startScenario`; drop the direct
      `{ ...s, phase: 'npc-move', ... }` write.
- [x] 2.2 `handleConfirmEndTurn` calls `endPlayerTurn`; drop its direct write.
- [x] 2.3 Keep each host-side phase guard that prevents starting an animation,
      and do not start the driver when the engine refuses.
- [x] 2.4 Update the two comments that explain why the host performs these
      transitions itself — they are now wrong.

## 3. The bench calls them (sibling `harness` repo)

- [x] 3.1 `BenchStore.endPlayerTurn` wraps the engine's; delete its local phase
      check and its local unplanned-enemy message.
- [x] 3.2 Confirm the bench's own `selectedId` is unaffected and the timeline
      still records the transition as one frame.

## 4. Verify

- [x] 4.1 track-web: full suite + Gherkin, and `tsc -b` in `client-games`.
- [x] 4.2 harness: full suite + `npm run typecheck`.
- [x] 4.3 Browser: play a game round through placement, player turn, and
      resolution; and a bench round through the same.
