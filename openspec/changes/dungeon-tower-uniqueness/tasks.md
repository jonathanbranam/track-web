## 1. The tower helper

- [ ] 1.1 `packages/dungeon-engine/src/turn.ts`: add `towerTiles(cells): Tile[]`
      beside `powerCenterCount`, returning every tower's tile in row-major order.
      Export it from `index.ts` alongside `isTowerImmune`.
- [ ] 1.2 `packages/dungeon-engine/src/npc.ts`: replace the planning context's
      own tower scan (`npc.ts:127-136`) with `towerTiles(cells)[0] ?? null`.
      Behavior-preserving — the existing scan already takes the first in
      row-major order. Keep `towerImmune` exactly as it is.

## 2. At most one tower

- [ ] 2.1 `scenario.placeStructure`: when `kind === 'tower'` and the board
      already holds one, refuse with a reason naming the existing tower's tile.
      Order it with the other refusals, after bounds and occupancy.
- [ ] 2.2 Leave `moveStructure` and `removeStructure` alone. If a reviewer would
      ask why, say so in a one-line comment — moving the tower leaves one tower,
      and removing it must stay possible or a misplaced tower is unfixable.

## 3. A tower is required to start

- [ ] 3.1 `sequencer.startScenario`: refuse, with a reason, when
      `towerTiles(state.cells).length === 0`. Check it alongside the existing
      phase precondition; state unchanged on refusal.
- [ ] 3.2 Confirm the refusal reaches bench mode too — this is not fenced by
      `getEngineMode()`, and a test asserts that.

## 4. The game reports the refusal

- [ ] 4.1 `DungeonTacticsGame.tsx`: add `startRefusal: string | null` state.
      `handlePlacementDone` sets it from `result.reason` when the engine refuses
      (replacing the bare `if (!result.ok) return` at line 420) and clears it on
      success.
- [ ] 4.2 Thread it through `Hud` to `StatusPill` as an optional `refusal` prop.
- [ ] 4.3 `StatusPill`: prefer `refusal` over the phase text when present.
      Same placement and styling — no new component.

## 5. Tests

- [ ] 5.1 `scenario.test.ts`: a second tower is refused and the board is
      unchanged; the reason names the existing tower's tile; several power
      centers all place; the one tower moves and the board still holds one; the
      tower can be removed and then re-placed.
- [ ] 5.2 `sequencer.test.ts`: starting a towerless scenario is refused with a
      reason and nothing changes; the same in bench mode; a board with a tower
      starts into `npc-move` as before; removing the tower during placement
      succeeds and only the start is refused.
- [ ] 5.3 `npc.test.ts`: the planning context still resolves the same tower it
      did before — this is a refactor, and a test should say so.
- [ ] 5.4 Re-aim, do not weaken. Existing fixtures that author a board and start
      it may have no tower; give those a tower, since they describe "a scenario
      that starts". If any test turns out to be *asserting* that a towerless
      scenario starts, delete it and say so explicitly in the report — that is
      asserted behavior this change removes, not a fixture that drifted.

## 6. Verify

- [ ] 6.1 `npm test` in track-web and `tsc -b` clean. Paste failures verbatim.
- [ ] 6.2 Confirm `bundledMap` still starts — it has one tower at (8, 6) and five
      power centers, so the shipped path is unchanged.
- [ ] 6.3 Confirm `isTowerImmune` and the power-center count are untouched.
- [ ] 6.4 **Present to the developer. Do NOT commit and do NOT archive.** The
      harness adoption (`dungeon-bench-setup-boundary`, sibling repo) is where
      the browser verification happens, and this change must not be archived
      before that one is verified.
