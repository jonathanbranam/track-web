## 1. State & reducers (Phaser-free)

- [ ] 1.1 Add `undoStack` to `GameState` in `types.ts` and define the undo record type (at minimum `{ unitId, fromCol, fromRow, toCol, toRow, path }`, plus any other fields a move mutates)
- [ ] 1.2 Initialize `undoStack: []` in `initialState()` (`npc.ts`)
- [ ] 1.3 Add pure reducers in `pc.ts`: `pushUndo(state, record)`, `undoLastMove(state)` (pop + restore origin and any mutated state), and `clearUndo(state)`; make `undoLastMove` a no-op on an empty stack
- [ ] 1.4 Change the move-commit path so selecting a destination applies the move to `units` immediately and pushes an undo record (replacing the deferred `plans`/`planOrder` write for moves)
- [ ] 1.5 Clear the undo stack whenever a PC attack resolves (in the attack resolution path) and whenever the round ends (`endRound` in `turn.ts`)

## 2. Animation & host wiring

- [ ] 2.1 In `DungeonTacticsGame.tsx`, drive an immediate animated move on destination selection: play `animatePcAction()` (slide along path), then apply state and redraw — removing the batched `endPlayerTurn`→`runPcPlayback` flow for PC moves
- [ ] 2.2 Add a `hud-undo` event handler in `onGameReady` that animates the PC back along its path to its origin, then applies `undoLastMove` and redraws
- [ ] 2.3 Guard input while a move or undo animation is in flight so taps cannot interleave mid-animation

## 3. Undo button in the Phaser HUD

- [ ] 3.1 In `DungeonTacticsScene.drawHud()`, render an Undo button via `addHudButton()` near the existing turn controls, lifted above the unit popup using the same `popupTop` offset logic as Done
- [ ] 3.2 Derive enabled state from `undoStack.length > 0`; render the disabled state dimmed (lower-alpha fill, muted text) and register no hit region when disabled
- [ ] 3.3 Store `this.undoHit`, match taps against it in the screen-space tap handler, and emit `hud-undo` only when enabled; reset `this.undoHit = null` at the top of `drawHud()` like the other hit regions

## 4. Spec alignment

- [ ] 4.1 Sync the delta specs into `openspec/specs/` (modified `dungeon-tactics-solo` A* requirement; new `dungeon-tactics-undo` capability) via `/opsx:sync`

## 5. Tests & build

- [ ] 5.1 Add unit tests for the undo reducers asserting `undoLastMove(applyMove(s, move))` restores `s`, that attack/round-end clear the stack, and that undo on an empty stack is a no-op
- [ ] 5.2 Run the existing test suite and confirm new and existing tests pass
- [ ] 5.3 Run `npm run build:watch` (client-games) and confirm zero TypeScript errors before marking implementation complete

## 6. Manual verification

- [ ] 6.1 Play through the proposal's example sequence and confirm the Undo button enables after each move, animates the reversal, disables when the attack clears the stack, and re-enables after the next move
