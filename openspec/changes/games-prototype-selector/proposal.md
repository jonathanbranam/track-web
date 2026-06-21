## Why

The games home page currently places "Prototypes" between real games, and clicking it jumps directly into a single hard-coded prototype (TiltTester) with no way to choose. As the number of prototypes grows, a picker page is needed so users can select which prototype to run.

## What Changes

- Move the `prototypes` entry to the end of the games registry so real games appear first.
- When the user taps "Prototypes" on the home page, navigate to a prototype picker page (`/game/prototypes`) that lists all available prototypes.
- From the picker, tapping a prototype navigates to `/game/prototypes/:protoSlug` and renders that prototype full-screen (same chrome as the existing game page).
- Add a "Grid Rendering" prototype alongside the existing TiltTester.
- Update routing and the `inGame` detection so prototype sub-pages hide the nav bar and show the back header correctly.

## Capabilities

### New Capabilities
- `games-prototype-picker`: Prototype selector page at `/game/prototypes` — lists all registered prototypes as tappable cards; navigates to `/game/prototypes/:protoSlug` on tap.
- `games-grid-rendering-prototype`: A new grid-rendering prototype at `/game/prototypes/grid-rendering` — a minimal 2D turn-based tactical scene rendered in Phaser using primitive shapes (no sprites). Demonstrates the core game model, grid rendering, zoom/pan controls, unit selection, and move/attack action flow that real tactical games will build on.

  **Game model (non-Phaser, plain TypeScript):**
  Each cell stores `{ terrain, structure, object }`. Terrain types include at minimum `plains` and `forest`. The model is Phaser-agnostic so it can be unit-tested and reused by real games.

  **Initial layout — 4×4 fixed map (rows 0–3 top to bottom, cols 0–3):**
  - Each tile has a distinct terrain type with a unique background color (e.g. plains = tan, forest = dark green, water = blue, stone = grey) — the exact per-cell assignment is fixed and defined in code.
  - **Row 0–1:** 4 NPCs distributed across cells (exact positions fixed in the map definition).
  - **Row 2:** 2 structures at cols 1 and 2 (center tiles); cols 0 and 3 are passable terrain.
  - **Row 3 (bottom):** 2 PCs at cols 0 and 3 — flanking the structures above, not directly behind them.

  **Rendering — Phaser primitives only (no sprites):**
  - Each character is a filled polygon or circle with a unique fill color and contrasting stroke, distinguishing PCs from NPCs visually without art assets.
  - Terrain and structure differences are shown via tile fill color/pattern variations.

  **Controls:**
  - **Zoom:** two-finger pinch on mobile; mouse scroll wheel on desktop — Phaser camera zoom, clamped to reasonable min/max
  - **Select:** tap/click a PC tile to select it (highlight); a context menu appears with "Move" and "Attack" options

  **Turn rules:**

  *Planning phase (player input):*
  - The player assigns plans to PCs in any order. Tapping a PC selects it; plans can be freely reassigned until "Done" is pressed.
  - **Plan: Move** — highlight valid destination tiles (orthogonal adjacency, one square, must be empty — no structures, PCs, or NPCs). Tap a highlighted tile to set the move plan. An arrow is drawn from the PC's current position to the destination, and a ghost PC (transparent or dashed outline) is rendered at the destination to show the intended move.
  - **Plan: Attack** — shown after a move is planned; highlights the 4 orthogonal squares around the PC's *planned destination* (not its current position). Tap any of the 4 squares to assign an attack direction. Attack is a **cardinal direction**, not a specific target — on playback the PC attacks whatever occupies that square at the time of resolution.
  - A PC without a move plan can also be assigned an attack — the 4 squares around its *current position* are highlighted.
  - A PC with a plan is marked with a visual indicator; re-selecting it clears and replaces the plan.
  - The player phase never ends automatically. The round continues until the player explicitly taps **"Done"**.

  *PC playback phase (animated, player input blocked):*
  - After "Done", PC plans resolve one at a time in the order plans were last assigned, animated similarly to the NPC phase.
  - **Move resolution:** the PC animates to its planned destination. If the destination is now occupied (another PC moved there earlier this playback), the PC stays in place but still attacks in the planned direction.
  - **Attack resolution:** the PC attacks in its planned cardinal direction from its actual post-move position. If an NPC occupies that square, it is removed. Attacks on PCs and empty squares have no effect.
  - After all PC plans resolve, the NPC phase begins.

  *NPC phase (animated, player input blocked):*
  - Each NPC resolves its action in sequence, one at a time, over a few seconds total so the player can follow what happened.
  - Each NPC attempts to move one square toward the bottom of the map (increasing row). Resolution order for the target square:
    1. **NPC is on row 3** — the NPC exits the map (animate it moving off the bottom edge and remove it); this counts as a successful escape.
    2. **Target square (row + 1) is empty** — NPC moves there (animate movement).
    3. **Target square is occupied by a structure or another NPC** — NPC tries left, then right; if both are also blocked, the NPC stays in place.
    4. **Target square is occupied by a PC** — NPC attacks that PC instead of moving (animate an attack flash on both tiles); the PC is unaffected (attacks on PCs have no effect in this prototype).
  - After all NPCs have resolved, the player phase begins again with all PCs reset to unplanned.

### Modified Capabilities
- `prototypes-game`: Registry ordering changes (prototypes entry moves to last); navigation from the home card goes to the picker page instead of directly mounting `PrototypesGame`.

## Impact

- `client-games/src/games/registry.ts` — reorder entries, no schema change
- `client-games/src/games/prototypes/PrototypesGame.tsx` — replace with a prototype picker component
- `client-games/src/games/prototypes/grid-rendering/` — new prototype folder: `GridRenderingGame.tsx` (Phaser wrapper), `GridModel.ts` (pure TS game model), `GridScene.ts` (Phaser scene)
- `client-games/src/App.tsx` — add `/game/prototypes/:protoSlug` route; update `inGame` regex to cover prototype sub-pages
- `client-games/src/pages/GamePage.tsx` — detect prototypes slug and render picker instead of a `mount` component directly (or handle via the new route)
- No API or backend changes; no new dependencies
