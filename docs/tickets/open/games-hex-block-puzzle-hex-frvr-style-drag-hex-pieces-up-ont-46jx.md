---
id: 46jx
title: "Games: hex block puzzle (Hex FRVR-style) — drag hex pieces up onto a hexagon board, with bird tokens"
kind: feature
opened: 2026-10-01
repos: [track-web]
changes: []
specs: []
needs: []
see: [fwsk]
tasks: [tw-9110]
---


## The ask

From the human, 2026-10-01, via advisor (verbatim):

> The other game was pretty similar, but it was hexagonal based, and the grid tiles had different colors and some different symbols on them. And I didn't get a clear look, but some of them were like birds, kind of a, just an outline type of shape, and the different hexagonal groupings at the bottom, similar to Tetris, you know, several of them joined together at the edges, also with different colors and then they, they would drag them from the bottom up and again earn points in some manner.
> [...] then I'd like to get a prototype build of both of them once you have a good understanding of how they work.

And, on where it goes (verbatim):

> It's fine to just ship them under client games as new games directly. No need to go through the prototype phase there. They can be next to the Orbital Dodger and Space Golf.

So: a **new top-level game in `client-games`**, beside Orbital Dodger and Space Golf, with its own OpenSpec spec (`**App**: games`). Within the trial scope. Its sibling is [[games-wood-block-puzzle-woodoku-style-drag-polyomino-pieces-fwsk]] (the wood block puzzle); they share the tray, drag and scoring loop but not the grid geometry.

## Research (advisor's subagent, 2026-10-01)

**Identification:** the exact title is not confirmed, and no listing found mentions birds on a line-clearing hex board. The loop is the **Hex FRVR** genre (FRVR, 2015; hex.frvr.com):
- a hexagon-shaped board
- 3 pieces in a tray
- drag a piece up onto the board
- full lines along any of the 3 hex axes clear, with a combo bonus for several at once

Hex FRVR has 10 visual themes and no level goals. The likeliest explanation for the coloured tiles with outline birds is a **collect-the-symbol goal**: some board cells carry a symbol, and clearing a line through them collects it. Woodoku and Block Blast do this with gems. That is the advisor's inference.

**Close variants:**
- Hex Block Fit and other clones: same loop.
- Hexa Puzzle (Initfusion): colour-match clears.
- Hexagon Block: jewel-style tiles.

**Core mechanics (Hex FRVR as reference)**
- Board: a hexagon. Side 5 gives 61 cells (rows 5-6-7-8-9-8-7-6-5); the exact size is unpublished.
- Pieces: 1–4 hexes each, no rotation.
- Tray: 3 pieces, refilled when empty (genre convention).
- Clearing: a full edge-to-edge line on any axis clears. Crossing lines clear together, and a shared cell clears once.
- Game over: no tray piece fits.
- Colour: cosmetic in Hex FRVR.
- Scoring: unpublished. The multi-line bonus is reported as roughly doubling per line; that is a secondary source.

**Sources:** hex.frvr.com; en.wikipedia.org/wiki/Hex_Frvr; Google Play com.frvr.hex; riptidelab.com/?p=1688; Hexa Puzzle App Store (id1627174379).

## Proposed rules for the build (advisor's proposal)

1. **Coordinates:** axial (q, r) with s = −q−r. The board is all cells with max(|q|,|r|,|s|) ≤ 4, which is 61 cells. Use pointy-top pixel layout: x = size·√3·(q + r/2), y = size·1.5·r. The line families are constant q, constant r and constant s: 9 lines each, 27 in total, precomputed. Snap the pointer to a cell with cube rounding. Reference: redblobgames.com/grids/hexagons.
2. **Pieces:** fixed orientations, about 20 shapes:
   - 1 hex
   - straight 2, 3 and 4 along each axis
   - 3-hex triangles, pointing up and down
   - a 4-hex rhombus in 3 orientations
   - 4-hex arcs and zigzags

   Each piece has a colour (cosmetic). The draw is weighted toward small pieces.
3. **Tray:** 3 pieces, refilled when empty. Game over when none fits.
4. **Scoring:**
   - +1 per hex placed.
   - For each clear: (cells cleared × 2) × 2^(lines−1).
   - Streak multiplier: ×(1 + 0.5·streak) while consecutive placements keep clearing.
   - Best score kept, the same way as [[games-wood-block-puzzle-woodoku-style-drag-polyomino-pieces-fwsk]].
5. **Bird tokens (to match what the human saw):**
   - At the start, and again every N moves, seed some empty cells with a **bird token**, drawn as an outline glyph and kept visible under a placed hex.
   - Clearing a line through a bird collects it: +50, with a "Birds n" counter.
   - Optional later: a level mode with "collect X birds in Y moves".
6. **Feel:**
   - The dragged piece rides about 1.5 hexes above the finger.
   - Ghost preview when the placement is legal.
   - Pre-highlight the lines that would clear.
   - Clears take about 250 ms: scale and fade, staggered outward from the placed piece.

Must work on a phone in portrait, with touch drag.

## Update, 2026-10-01: more detail from the human, and a second research pass

From the human (verbatim):

> both games were in the Android app store.

> The hexes are red blue and green in that game. Blue are musical notes

> In the tray the colors could be mixed.

**Revised identification.** The best fit is now **Match Tiles: Block Puzzle Game** (RV AppStudios), https://play.google.com/store/apps/details?id=com.rvappstudios.tile.match3.block.puzzle.game. Three pieces appear in the tray and you place them on the board. Touching tiles of the same colour are collected and scored. It has square, triangle and hex boards, and its listing mentions "butterflies and birds". It also has a hold slot. Not confirmed from screenshots, and the board size is undocumented. Hex FRVR is now the fallback.

**This supersedes the earlier proposed rules where they conflict:**
- **Core mechanic:** colour-adjacency collection, not line-clear. A connected same-colour group of N or more clears (6-neighbour flood fill from the placed hexes). Default N = 3, configurable. Nothing falls after a clear.
- **Colours:** 3 colours, each with a fixed outline symbol: red = bird, blue = musical note, green = a third symbol (unknown; pick one, e.g. a leaf).
- **Pieces:** each hex in a piece can be a different colour (the human confirmed mixed colours).
- **Tray:** 3 pieces plus 1 hold slot.
- **Board:** larger than Hex FRVR, with a configurable radius. Default R = 6 (127 cells) or R = 7 (169 cells).
- **Scoring:** a proposal, to be confirmed with the human.
- **Bird tokens:** the "seed bird tokens on empty cells" idea above is dropped. The symbol belongs to the tile's colour. Keep a count of collections per symbol.

## Update 2, 2026-10-01: Match Tiles ruled out

From the human (verbatim):

> Not match tiles - everything was hex shaped, six sides.

> Second game very similar to hexa block game. With some additional twists.

So the reference is **Block Puzzles: Hexa Block Game** (RV AppStudios, also listed as "Blocks: Block Puzzle Games"; its "Hex Challenge" mode), App Store https://apps.apple.com/us/app/id1566701558. All cells and pieces are hexagons. The core is the **Hex FRVR-style line clear** in the original proposed rules: full lines along the 3 axes clear, 3-piece tray, no rotation. The colour-adjacency rules in Update 1 are superseded.

Facts from the human that still stand:
- Tiles are red, blue or green, each with an outline symbol (blue = musical note; birds on another colour).
- A piece in the tray can mix colours.

What exactly the "additional twists" are is still open with the human; see the task thread.

## Update 3, 2026-10-01: on hold

Asked what the colours do. The human (verbatim):

> There didn't seem to be clearing in that game the board was filled up I think. Idk I didn't seen closely

So this may be a fill-the-board puzzle, not a line clear. The rules aren't settled. The human chose "Woodoku only for now", so **this ticket gets no task** until the human has had another look at the game.

## Update 4, 2026-10-01: off hold, advisor designs v1

From the human (verbatim):

> Go ahead and design a hexagon game too and make a first version. Follow rules similar to the games you found.

**The v1 design (advisor's, from Hex FRVR and Hexa Block Game, plus the colours the human saw):**
- **Board:** a hexagon in axial coords, every cell with max(|q|,|r|,|s|) ≤ R. Default R = 4 (61 cells), as a constant. Pointy-top layout. Precompute the 27 lines (constant q, r or s).
- **Pieces:**
  - 1–4 hexes in fixed orientations (the set listed in the proposed rules above), weighted toward small pieces.
  - Each hex has its own colour (red, blue or green), so a piece can mix colours.
  - Each colour has an outline symbol: red = bird, blue = musical note, green = leaf.
- **Tray:** 3 pieces, no rotation, refilled once empty. Game over when none fits.
- **Clearing:** full lines along any of the 3 axes clear together. A cell shared by two lines clears once.
- **Scoring:**
  - +1 per hex placed.
  - Per move with clears: (cells cleared × 2) × 2^(lines − 1).
  - Colour twist: a cleared line whose tiles are all one colour scores ×3.
  - Show running counts of birds, notes and leaves cleared.
  - Show the best score.
- **Feel:** the same as Woodoku (tw-55d2):
  - lift the dragged piece above the finger, with snapping and a ghost preview
  - pre-highlight the lines a drop would clear
  - clears pop
- **Unknown:** the human thinks the real game might be fill-the-board, with no clearing. v1 is line-clear by design; revisit once the human has seen the game again.
