## Why

The dungeon-tactics-solo HUD (status pill, action buttons, unit info popup, confirmation modal) is currently drawn with Phaser graphics primitives — manual rectangles, `Text` objects, and screen-space pointer hit-testing. This makes text rendering, layout, and interactivity awkward and brittle: every element is rebuilt from scratch on each redraw, buttons are fake (hand-rolled hit regions), and styling is hard to evolve. ReactDOM renders text and interactive controls far more cleanly, and React already owns the authoritative game state — so moving the HUD to the DOM removes a whole class of bespoke drawing/input code and gives us a maintainable foundation for upcoming HUD features (e.g. simple unit images in the unit info panel).

## What Changes

- Render the HUD as ReactDOM elements layered over the Phaser canvas, replacing the Phaser-drawn HUD. Move as much screen-anchored chrome to the DOM as possible:
  - Status pill ("Place your units" / "PC Actions…" / "Enemy Actions…")
  - Reset button
  - Placement **Start** button, player-phase **Done** button, **Undo** button (with disabled state)
  - Unit info popup (portrait placeholder, name, HP/Move/Attack stat lines, close button, Attack toggle)
  - End-of-turn confirmation modal, including its open/closed UI state
- Migrate the confirm-modal open/closed state out of the Phaser scene (`confirmOpen`) into React, since the modal becomes a React component.
- Replace the Phaser HUD event round-trip (`hud-done-confirm`, `hud-reset`, `hud-placement-done`, `hud-undo`, `popup-attack-toggle`, `popup-close`) with direct React `onClick` handlers that call the existing engine functions.
- Remove the now-dead Phaser HUD drawing and hit-testing code from `DungeonTacticsScene.ts` (`drawHud`, `drawUnitPopup`, `drawConfirmModal`, `drawStatusPill`, `addHudButton`, the `uiLayer`/`uiCamera` HUD setup, and the HUD branches of the `pointerup` handler).
- **Keep board-anchored visuals in Phaser** — move arrows, attack/walk/spawn highlights, ghost destinations, NPC intent arrows, unit order labels, and HP pips remain world-layer Phaser rendering. Only DOM-anchored HUD chrome moves.
- Lay groundwork for later **simple unit images** in the unit info panel (the portrait area becomes a real DOM element ready to host an image).

No gameplay rules, turn logic, or persisted data change — this is a presentation/interaction-layer migration.

## Capabilities

### New Capabilities

- `dungeon-tactics-hud`: The dungeon-tactics-solo heads-up display rendered as ReactDOM overlay elements — status pill, action buttons (Reset, Start, Done, Undo), the unit info popup, and the end-of-turn confirmation modal — including how each reads game state and how its interactions invoke the game engine. Establishes that screen-anchored HUD chrome is DOM-rendered while board-anchored overlays remain in Phaser.

### Modified Capabilities

<!-- None. Unit-selection and solo gameplay requirements (what the popup shows, what actions exist, turn flow) are unchanged at the spec level; only the rendering technology of the HUD changes. -->

## Impact

- **Code (client-games/src/games/dungeon-tactics-solo/):**
  - `DungeonTacticsGame.tsx` — gains the React HUD components and their handlers; becomes the home for HUD/modal UI state; drops the `hud-*`/`popup-*` event listeners in favor of direct calls.
  - `DungeonTacticsScene.ts` — loses all HUD drawing, the HUD hit-testing branches, and the `uiLayer`/`uiCamera` HUD setup; keeps board/world rendering and animations.
  - New React HUD components (e.g. status pill, action buttons, unit info panel, confirm modal) alongside the existing `ScenarioEditor.tsx` overlay pattern.
- **State flow:** React continues to hold authoritative `GameState` in `stateRef`; HUD components read from it (the ref is promoted/exposed so the HUD re-renders on state changes).
- **Dependencies:** none added — uses existing React 19 + Tailwind already in client-games.
- **Risk:** input/interaction parity (every former Phaser hit region must have a working DOM control), and correct stacking/pointer-events so the DOM HUD overlays the canvas without blocking board interactions.
