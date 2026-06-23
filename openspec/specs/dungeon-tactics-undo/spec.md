**App**: dungeon-tactics-solo

## Purpose

Defines the immediate-action model for PC moves in Dungeon Tactics Solo and the undo stack that backs it: what a committed move records, when the stack is cleared, how undo reverses a move, and how the Undo control is rendered in the Phaser HUD.

## Requirements

### Requirement: PC moves commit immediately with animation
When the player selects a destination for a PC during the player phase, the move SHALL be committed immediately — there SHALL be no plan-then-execute deferral and no batched end-of-turn playback step for PC moves. The committed move SHALL still be animated: the PC SHALL slide along its planned A* path from origin to destination rather than snapping. Player input SHALL be guarded while a move animation is in flight so taps cannot interleave mid-animation.

#### Scenario: Selecting a destination commits the move immediately
- **WHEN** a PC is selected and the player taps a valid walk destination
- **THEN** the PC's position in `GameState.units` is updated to the destination as the action commits, without waiting for a Done/playback step

#### Scenario: Committed move is animated along its path
- **WHEN** a PC move commits
- **THEN** the PC SHALL animate sliding through each cell of its planned path in order, at the existing per-tile speed, before control returns to the player

#### Scenario: Input is guarded during the move animation
- **WHEN** a PC move animation is in progress
- **THEN** taps on the board and HUD SHALL be ignored until the animation completes

### Requirement: Undo stack records PC move actions
The game state SHALL maintain an undo stack. Every committed PC move SHALL push a reversible record onto the stack capturing at minimum the moving unit's id and its origin and destination coordinates, plus any other state the move mutated, sufficient to fully restore the prior state when popped. The stack SHALL live in `GameState` and be mutated only by pure reducers in `pc.ts` (e.g. `pushUndo`, `undoLastMove`, `clearUndo`), so it is testable without Phaser.

#### Scenario: A committed move is pushed onto the undo stack
- **WHEN** a PC move commits
- **THEN** a record for that move SHALL be appended to the undo stack

#### Scenario: Stack preserves move order
- **WHEN** multiple PC moves commit in sequence
- **THEN** the undo stack SHALL hold them in the order they were committed, with the most recent on top

### Requirement: Undo reverses and animates the most recent move
Invoking Undo SHALL pop the top record from the undo stack and restore the affected PC to its origin position and any other state the move changed. The reversal SHALL be animated: the PC SHALL slide back along its path to its original square rather than snapping. Invoking Undo when the stack is empty SHALL be a no-op. Input SHALL be guarded while the undo animation is in flight.

#### Scenario: Undo restores the most recent move
- **WHEN** the undo stack is non-empty and the player invokes Undo
- **THEN** the top record is popped and the affected PC SHALL be returned to its pre-move position

#### Scenario: Undo animates the reversal
- **WHEN** Undo is invoked
- **THEN** the PC SHALL animate sliding back along its path to its original square before control returns to the player

#### Scenario: Undo on an empty stack does nothing
- **WHEN** the undo stack is empty
- **THEN** invoking Undo SHALL leave game state unchanged

### Requirement: Undo stack cleared on attack or round end
The undo stack SHALL be emptied whenever any PC attack resolves and whenever the round ends. Once cleared, prior moves SHALL no longer be undoable.

#### Scenario: PC attack clears the stack
- **WHEN** a PC attack resolves
- **THEN** the undo stack SHALL become empty

#### Scenario: Round end clears the stack
- **WHEN** the round ends
- **THEN** the undo stack SHALL become empty

#### Scenario: Moves after a clear are independently undoable
- **WHEN** the stack has been cleared and a PC then commits a new move
- **THEN** that new move SHALL be pushed onto the now-empty stack and SHALL be undoable

### Requirement: Undo button rendered in the Phaser HUD
The Undo control SHALL be rendered inside the Phaser scene's HUD (`uiLayer`, drawn by the UI camera), consistent with the existing Reset and Done buttons — not as a React DOM element. Its enabled state SHALL be derived purely from the undo stack: enabled when the stack is non-empty, disabled when empty. A disabled Undo button SHALL render dimmed and SHALL register no hit region so taps are ignored. Tapping an enabled Undo button SHALL emit a `hud-undo` event that the React host applies via the undo reducer.

#### Scenario: Undo button enabled when stack is non-empty
- **WHEN** the undo stack has at least one record during the player phase
- **THEN** the HUD SHALL render an enabled Undo button with an active hit region

#### Scenario: Undo button disabled when stack is empty
- **WHEN** the undo stack is empty
- **THEN** the HUD SHALL render the Undo button dimmed with no hit region, and taps where it sits SHALL not trigger an undo

#### Scenario: Tapping enabled Undo emits the event
- **WHEN** the player taps an enabled Undo button
- **THEN** the scene SHALL emit a `hud-undo` event and the host SHALL apply the undo reducer and redraw

#### Scenario: Button state tracks the example sequence
- **WHEN** the player moves PC 1, moves PC 2, undoes PC 2, moves PC 3, attacks with PC 4, then moves PC 4
- **THEN** the Undo button SHALL be enabled after each move, reflect the popped state after the undo, become disabled when the attack clears the stack, and re-enable after the subsequent move
