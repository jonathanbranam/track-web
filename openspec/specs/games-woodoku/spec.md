# games-woodoku

**App**: games

## Purpose

Woodoku, a single-player wood block puzzle: drag polyomino pieces from a tray onto a 9×9 grid. Filling a row, column or 3×3 box clears it. Nothing falls. The rules live in pure modules under `client-games/src/games/woodoku/` (`logic.ts`, `pieces.ts`, `dragMath.ts`); the board is rendered with React and DOM pointer events, no Phaser.

## Requirements

### Requirement: Registered as a top-level game
Woodoku SHALL be a `single-player` entry in the game registry with slug `woodoku`, mounted at `/game/woodoku`.

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** Woodoku is listed as a single-player game

### Requirement: Board and clears
The board SHALL be `BOARD_SIZE` × `BOARD_SIZE` (9) cells, split into `BOX_SIZE` (3) boxes; both are constants in `logic.ts`. After a piece is placed, every full row, full column and full box SHALL clear at the same time, so a cell in two full lines clears once. Remaining cells SHALL stay where they are.

#### Scenario: Row, column and box clear together
- **WHEN** a placement completes a row, a column and a box
- **THEN** all three clear in that move

### Requirement: Tray
The tray SHALL hold 3 randomly chosen pieces from a fixed set of polyominoes (1 to 5 cells, in fixed orientation; no rotation). It SHALL refill with 3 new pieces only once all 3 have been placed.

#### Scenario: Refill
- **WHEN** the third piece of a tray is placed
- **THEN** a new tray of 3 pieces appears

### Requirement: Game over
The game SHALL end when none of the pieces remaining in the tray fits anywhere on the board. Play again starts a fresh game.

### Requirement: Scoring
A move SHALL score 1 point per cell placed; plus, if it cleared `n` lines (rows, columns, boxes), `10 × n × n` points (the combo bonus: clearing several at once beats clearing them separately); plus, if it is the k-th consecutive clearing move with k ≥ 2, `10 × (k − 1)` (the streak bonus). A move that clears nothing resets the streak. These numbers are this game's own choice, not taken from the original. The best score SHALL be shown and kept in `localStorage`; it is not sent to the server.

### Requirement: Touch drag
The game SHALL be playable in phone portrait by touch drag. The dragged piece SHALL ride above the finger, snap to the grid with a ghost preview, and highlight the cells a drop would clear before it lands. A drop where the piece does not fit SHALL spring the piece back to its tray slot.

#### Scenario: Invalid drop
- **WHEN** the player releases a piece over cells that are occupied or off the board
- **THEN** the piece animates back to its tray slot and the board is unchanged

### Out of scope
Undo, power-ups, rotation, levels, daily modes, leaderboard.
