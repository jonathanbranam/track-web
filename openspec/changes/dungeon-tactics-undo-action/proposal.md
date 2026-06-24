## Why

The game currently uses a plan-then-execute model where PC actions are queued and played back as animations. Making actions immediate removes the animation delay, giving the game a snappier, more direct feel. With immediate movement, undo becomes the essential recovery mechanism: players need a safe way to rethink positioning without restarting the round.

## What Changes

- **Remove deferred plan/playback model for PCs**: when a PC moves or attacks, the action takes effect immediately (no queued animation playback phase for PCs).
- **Add undo stack for PC move actions**: every PC movement is pushed onto an undo stack; the stack is cleared when any PC attacks or when the round ends.
- **Add Undo button to the game HUD**: enabled when the undo stack is non-empty, disabled otherwise; clicking it pops and reverses the most recent PC move.

**Example sequence:**
1. Move PC 1 two squares → pushed to undo stack
2. Move PC 2 one square → pushed to undo stack
3. Click Undo → PC 2 movement reversed
4. Move PC 3 one square → pushed to undo stack
5. Attack with PC 4 → undo stack cleared; Undo button disabled (PC 4 is now locked: it cannot move or attack again this turn)
6. Move PC 1 one more square → pushed to undo stack; Undo button re-enabled
7. Click Undo → PC 1 movement reversed

## Capabilities

### New Capabilities
- `dungeon-tactics-undo`: Undo stack for PC move actions and the corresponding Undo button UI. Defines what goes on the stack, when it is cleared, and how undo is invoked.

### Modified Capabilities
- `dungeon-tactics-solo`: The core game spec's scenario descriptions reference the plan-then-execute model ("PC playback"). Requirements need updating to reflect the immediate-action model and the presence of the Undo button.

## Impact

- `client-games/src/games/dungeon-tactics-solo/GridScene.ts` — primary change: remove PC animation playback phase; add immediate move/attack dispatch; integrate undo stack.
- `client-games/src/games/dungeon-tactics-solo/GridModel.ts` — add undo stack to game state; add helpers for push/pop/clear.
- `client-games/src/games/dungeon-tactics-solo/GridRenderingGame.tsx` — add Undo button to HUD; wire enabled/disabled state to undo stack.
- `openspec/specs/dungeon-tactics-solo/spec.md` — update scenarios to reflect immediate action model.
