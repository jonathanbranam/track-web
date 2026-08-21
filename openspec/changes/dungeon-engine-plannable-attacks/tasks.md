## 1. The query

- [x] 1.1 Add a query to `sequencer.ts` taking the same `NpcMoveChoice`
      `commitNpcTurn` accepts and returning the tiles attackable from the
      resulting position.
- [x] 1.2 Derive it from the same evaluation `commitNpcTurn` performs, rather
      than re-deriving targeting — a query that can disagree with the commit it
      predicts is the failure mode `preview` exists to avoid.
- [x] 1.3 Return no tiles for a move the enemy could not legally make, matching
      the move validation `commitNpcTurn` applies.
- [x] 1.4 Export it from `index.ts`.

## 2. Tests

- [x] 2.1 Targets come from the post-move position, not the current one.
- [x] 2.2 Staying put reports targets from the current position.
- [x] 2.3 **Agreement with the commit**: every reported tile is accepted by
      `commitNpcTurn` with the same move, and a tile that was not reported is
      refused. This is the requirement that keeps the two from drifting.
- [x] 2.4 An illegal move reports no tiles.
- [x] 2.5 The query changes nothing when called repeatedly.

## 3. Verify

- [x] 3.1 `npm test` and `npm run test:dungeon-tactics` clean.
- [x] 3.2 Confirm nothing under `client-games/` changed — this is additive.
