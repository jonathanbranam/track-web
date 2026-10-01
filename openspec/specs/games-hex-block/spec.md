# games-hex-block

**App**: games

## Purpose

Hex Block, a single-player hex block puzzle in the Hex FRVR style: drag mixed-colour hex pieces from a tray onto a hexagon board; filling a full line along any of the 3 hex axes clears it. Nothing falls. The rules live in pure modules under `client-games/src/games/hex-block/` (`hex.ts`, `pieces.ts`, `logic.ts`, `dragMath.ts`); the board is rendered as SVG with React and DOM pointer events, no Phaser. This is a first version designed from the human's description; the reference game may turn out to be a fill-the-board puzzle without clearing.

## Requirements

### Requirement: Registered as a top-level game
Hex Block SHALL be a `single-player` entry in the game registry with slug `hex-block`, mounted at `/game/hex-block`.

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** Hex Block is listed as a single-player game

### Requirement: Board and clears
The board SHALL be every axial cell (q, r) with max(|q|, |r|, |s|) ≤ `RADIUS` (4, giving 61 cells), laid out pointy-top. The 27 lines (constant q, constant r, constant s) are precomputed. After a piece is placed, every full line SHALL clear at the same time; a cell in two full lines clears once. Remaining cells SHALL stay where they are.

#### Scenario: Crossing lines clear together
- **WHEN** a placement completes two crossing lines
- **THEN** both clear in that move and the shared cell clears once

### Requirement: Pieces and colours
Pieces SHALL be 1 to 4 connected hexes in fixed orientations (no rotation): single, straight 2, 3 and 4, triangle, bent three, rhombus, arc and zigzag, each in every distinct orientation. Each hex of a piece SHALL have its own colour, red, blue or green, so a piece can mix colours. Each colour SHALL show an outline symbol: red a bird, blue a musical note, green a leaf. Smaller pieces SHALL be drawn more often than larger ones.

### Requirement: Tray
The tray SHALL hold 3 random pieces and refill with 3 new ones only once all 3 have been placed.

### Requirement: Game over
The game SHALL end when none of the pieces remaining in the tray fits anywhere on the board. Play again starts a fresh game.

### Requirement: Scoring
A move SHALL score 1 point per hex placed. If it cleared lines, it SHALL also score `(2 × cleared cells + 4 × M) × 2^(lines − 1)`, where `M` is the total length of the cleared lines whose tiles are all one colour (so such a line counts ×3). A shared cell counts once in the cleared cells. These numbers are this game's own choice. The game SHALL show running counts of birds, notes and leaves cleared (cleared hexes per colour) and the best score; the best score is kept in `localStorage` and not sent to the server.

#### Scenario: One-colour line
- **WHEN** a move clears a single line of `n` hexes that are all red
- **THEN** it scores `1 + 6n` and the bird count rises by `n`

### Requirement: Touch drag
The game SHALL be playable in phone portrait by touch drag. The dragged piece SHALL ride above the finger, snap to the board with a ghost preview, and highlight the cells a drop would clear before it lands. A drop where the piece does not fit SHALL spring the piece back to its tray slot.
