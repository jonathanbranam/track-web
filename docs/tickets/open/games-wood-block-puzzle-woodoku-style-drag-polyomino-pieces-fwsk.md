---
id: fwsk
title: "Games: wood block puzzle (Woodoku-style) — drag polyomino pieces up onto a 9x9 grid"
kind: feature
opened: 2026-10-01
repos: [track-web]
changes: []
specs: []
needs: []
see: []
tasks: [tw-55d2]
---


## The ask

From the human, 2026-10-01, via advisor (verbatim):

> I'd like you to do some research on some casual mobile games that I've seen someone play. One of them has a, kind of a brown background and a bunch of squares and tiles. It's kind of like, it's like Tetris-shaped tiles, but instead of dropping from above, they appear at the bottom, and the player drags them up to complete the grid above. There's some sort of scoring mechanism that I don't have identified.
> [...] then I'd like to get a prototype build of both of them once you have a good understanding of how they work.

And, on where it goes (verbatim):

> It's fine to just ship them under client games as new games directly. No need to go through the prototype phase there. They can be next to the Orbital Dodger and Space Golf.

So: a **new top-level game in `client-games`** (its own registry entry and route, beside Orbital Dodger and Space Golf). Not a prototype under `/game/prototypes`. Add an OpenSpec spec for it (`openspec/specs/games-<slug>/`, `**App**: games`). It's within the trial scope (`.bridle/rules/scope.md`). If it uses Phaser, Phaser stays externalised (CLAUDE.md).

## Research (advisor's subagent, 2026-10-01)

**Identification.** Most likely **Woodoku** (Tripledot), which has a wood-grain board and pieces on a warm brown theme. Generic "Wood Block Puzzle" clones are also a fit. BlockuDoku, 1010! and Block Blast share the mechanic but not the brown look. The thing that differs between them is whether 3x3 boxes clear. In Woodoku they do; in the clones only rows and columns clear.

**Core mechanics (genre-wide)**
- Board: 9x9 (Woodoku/BlockuDoku). A full row, column or 3x3 box clears. Everything completed by a move clears at once, and a shared cell clears once. There is no gravity: cleared cells just go empty.
- Tray: 3 pieces, used in any order, no rotation. It refills only when all 3 are placed. Placed pieces can't move.
- Pieces: the 1010! set has 19 pieces: 1x1; bars of 2–5 cells in both orientations; 2x2; 3x3; a 3-cell L and a 5-cell big L, each in 4 orientations. Woodoku adds T, S/Z and L/J tetrominoes in all orientations, plus 5-cell plus/T/U shapes.
- Game over: none of the remaining tray pieces fits anywhere. No timer.
- Scoring: Woodoku's formula isn't published. It confirms a **Combo** bonus (several regions in one move) and a **Streak** bonus (clears on consecutive moves). 1010! documents +1 per cell placed and 5·r·(r+1) for r lines.

**Sources:** Woodoku App Store (apps.apple.com/app/id1496354836); 1010! analysis (blog.coelho.net/1010-analysis/); mobi.gg Woodoku guide; Block Puzzle Wood: Classic App Store (id1615792350).

## Proposed rules for the build (advisor's proposal; the scoring is invented, not documented)

1. **Board:** 9x9 with faint 3x3 box shading, on a brown wood background with wood-toned pieces. Rows, columns and 3x3 boxes all clear, simultaneously.
2. **Tray:** 3 pieces, no rotation, used in any order, refilled when empty. Weighted draw over the 1010! set plus T, S/Z and L/J tetrominoes, with small pieces more common.
3. **Scoring:**
   - +1 per cell placed.
   - For `n` regions cleared in one move: `18·n`, multiplied by `n` when `n ≥ 2`.
   - Streak: `+10·(streak−1)` while consecutive moves keep clearing.
   - Optional +300 for emptying the board.
   - Show the score and the best score. The best score goes to localStorage, or the existing `game_scores` API if that's simple and already used by the other games.
4. **Game over:** checked after each placement and refill, when no tray piece fits. Then a restart.
5. **Feel:**
   - A picked-up piece scales to board size and rides about 1.5 cells above the finger.
   - Snap to the nearest cell, with a ghost preview.
   - Pre-highlight the rows, columns and boxes the drop would clear.
   - An invalid drop springs back to the tray; tray pieces that fit nowhere are dimmed.
   - Clears pop, with a "+N" popup and "Combo xN" / "Streak N" banners.
6. **Out of scope for now:** undo, power-ups, rotation, levels or daily modes.

Must work on a phone in portrait, with touch drag.

## Update, 2026-10-01: identification confirmed

From the human (verbatim), after seeing the Woodoku link:

> I see yes I think it is Woodoku. The grid felt larger than that but it looks right.

So build **Woodoku**: the original proposed rules above stand (9x9, with rows, columns and 3x3 boxes clearing). Make the board size a constant that's easy to change. A follow-up pass looked at large-board games (wood jigsaw, 15x15 "1515"), but those are not the target.
