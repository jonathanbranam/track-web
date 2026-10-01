# games-favo

**App**: games

## Purpose

Favo, a single-player hex linking puzzle after Favo! by flow Inc.: drag mixed-element panels from a tray onto a hexagon board; connected groups of one element clear and fill that element's gauge. Hex Block stays alongside it for comparison. The rules live in pure modules under `client-games/src/games/favo/` (`pieces.ts`, `logic.ts`, `storage.ts`), reusing Hex Block's hex math and drag snapping (`../hex-block/hex.ts`, `dragMath.ts`); rendering is SVG with React and DOM pointer events, no Phaser. The board size, panel shapes, group size, points and gauge size are proposals, since the reference game does not document them. Not yet browser-tested. Out of scope: Challenge Mode (monsters), levels.

## Requirements

### Requirement: Registered as a top-level game
Favo SHALL be a `single-player` entry in the game registry with slug `favo`, mounted at `/game/favo`.

### Requirement: Board
The board SHALL be every axial cell with max(|q|, |r|, |s|) ≤ 3 (37 cells), pointy-top.

### Requirement: Panels and tray
A panel SHALL be 1 to 3 connected hexes (single, pair, straight three, triangle, bent three), each hex red (bird), blue (note) or green (leaf), so colours can mix. The tray SHALL hold 3 panels and refill with 3 new ones once all are placed.

#### Scenario: Tap rotates
- **WHEN** the player taps a tray panel without dragging past a small slop
- **THEN** the panel turns 60°, moving its elements with it, and nothing is placed

### Requirement: Placing
Dragging a panel SHALL show it above the fingertip, snap it to the board with a ghost preview, and highlight the hexes the drop would clear. A drop that overlaps a hex or leaves the board SHALL spring the panel back to its slot.

### Requirement: Linking
After a placement, every connected (6-neighbour) group of one element with 3 or more hexes SHALL clear. Nothing falls and there are no chain reactions.

### Requirement: Scoring
A move scores 1 point per hex placed plus 10 per hex cleared, times 1, 2 or 4 when 1, 2 or 3 different elements cleared in that move. The best score SHALL be kept in localStorage (`favo.best`).

### Requirement: Gauges and merge panels
Each element SHALL have a gauge of 12 hexes cleared. When it fills the element's level goes up, the overflow carries over, and a merge panel of that element is queued. The first queued merge panel SHALL be offered in a fourth slot beside the tray. A merge panel is one hex that, placed touching a same-element hex, clears the whole connected group of that element whatever its size; placed touching none it just stays as a normal hex. Merge-cleared hexes fill gauges and score like any other.

### Requirement: Game over
The game SHALL end when no tray panel fits anywhere on the board and no merge panel can be placed on an empty cell. Play again starts a fresh game.
