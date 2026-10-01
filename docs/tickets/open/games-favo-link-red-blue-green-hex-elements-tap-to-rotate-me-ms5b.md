---
id: ms5b
title: "Games: Favo — link red/blue/green hex elements, tap to rotate, merge panels"
kind: feature
opened: 2026-10-01
repos: [track-web]
changes: []
specs: []
needs: []
see: [46jx]
tasks: [tw-176c]
---


## The ask

The human identified the hex game they saw (2026-10-01, verbatim):

> FAVO is the hex game.

and, after the advisor described it:

> So yeah, go ahead and build Favo. You can leave the current game there too. I'll look at both of them.

So: a **new top-level game in `client-games`**, `favo`. Hex Block (tw-9110, see [[games-hex-block-puzzle-hex-frvr-style-drag-hex-pieces-up-ont-46jx]]) **stays**, and the human will compare the two. Favo gets its own OpenSpec spec (`openspec/specs/games-favo/`, `**App**: games`). It is within the trial scope.

Facts from the human, carried over from 46jx:
- The hexes are red, blue or green, with outline symbols: blue = musical notes, and birds on another colour.
- A piece in the tray can mix colours.
- "the board was filled up", i.e. no line clears.
- They watched someone play it on Android.

## Research (advisor, 2026-10-01)

**Favo!** by flow Inc. (Android and iOS, first released Aug 2018, v3.14 Aug 2026).

Store text, as quoted by the sources below:
- "Link the three elements (red, blue, and green) on the board to collect as many points as possible."
- "Slide the element panels with your finger to move them" and "Tap the panels to arrange the order of the elements."
- "When one of your collected element gauges is full, the element will level up and you will get a Merge Panel of the same element as a bonus." "Put a merge panel next to panels of the same color. You can merge all connected panels at once!"
- "2 color match = double points!! 3 color match = quadruple points!!!!"
- "When there is no more space left on the board, it's game over."
- Challenge Mode: defeat monsters by shooting collected elements at them.

**Not documented:** the board size, the panel shapes, how many linked elements make a match, the exact points, and what the symbols mean (presumably the art for each element).

**Sources:**
- play.google.com/store/apps/details?id=app.flow.favo
- apps.apple.com/app/id1409011944
- app-flow-favo.en.uptodown.com/android
- game-solver.com/favo/

## v1 design (advisor's reading; the undocumented parts are proposals)

- **Board:** a hexagon of hex cells in axial coordinates, with a configurable radius. Default R = 3 (37 cells), because Favo plays in fill-the-board style and a small board keeps the pressure on. Reuse Hex Block's hex math (`client-games/src/games/hex-block/`).
- **Elements:** red, blue and green, each with an outline symbol: red = bird, blue = musical note, green = leaf.
- **Panels:**
  - Groups of 1–3 hexes, each hex carrying its own element, so colours can mix.
  - 3 panels in a tray at the bottom, refilled when empty (or one at a time).
  - Drag a panel up onto the board.
  - **Tap a panel in the tray to rotate it**, i.e. cycle the order of its elements. Rotating the shape by 60° is acceptable too.
- **Linking:**
  - After a placement, any connected group of same-element hexes (6-neighbour) of size ≥ N clears.
  - N is a constant, default 3.
  - Cleared elements fill that element's gauge.
- **Scoring:**
  - Points are proportional to the hexes cleared.
  - Clearing 2 different colours in one move doubles the points; 3 colours quadruples them (documented).
  - Best score in localStorage.
- **Merge panel:**
  - When an element's gauge fills, that element levels up and the player gets a bonus merge panel of that element.
  - Placed next to same-element hexes, it clears the whole connected same-element group regardless of size.
- **Game over:** the board is full, or no tray panel fits.
- **Feel:** match Hex Block and Woodoku:
  - the dragged panel rides above the finger
  - snap with a ghost preview
  - pre-highlight the groups a drop would clear
  - show the gauges per element
- **Out of scope for v1:** Challenge Mode (monsters), levels.

Record any rule you had to choose on the task thread. The human will compare this with Hex Block and with the real game.
