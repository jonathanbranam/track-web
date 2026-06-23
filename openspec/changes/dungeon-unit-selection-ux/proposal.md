## Why

Selecting a PC in Dungeon Tactics today reveals only a generic Move/Attack/Cancel action menu, and the player must tap "Move" before any walk destinations appear — an extra step that hides where a unit can go and tells the player nothing about the unit they picked. Showing unit details and walk destinations the instant a unit is selected, and making attack a simple toggle, makes planning faster and more legible.

## What Changes

- **PC info popup on selection**: selecting a PC opens a small info popup describing that unit (archetype, current HP / max HP, move range, attack damage). The popup has a Close / dismiss (X) button that cancels the selection of that unit — clearing the walk/attack overlays and closing the popup. The popup also dismisses when another unit is selected.
- **NPC info popup on selection**: NPCs become tappable too. Selecting an NPC opens an info-only popup showing its name (the unit type, e.g. `short-range` / `long-range`), movement (move range), and current HP / max HP. It has the same Close (X) dismiss, but shows no walk/attack tiles and no Attack toggle (NPCs are not player-controlled).
- **Immediate walk-tile display (PCs)**: selecting a PC immediately shows its valid walk-destination tiles — no separate "Move" step. Tapping a highlighted tile plans the move as it does today.
- **Action buttons with active highlight replace the Move/Attack/Cancel menu**: while a PC is selected, an action bar shows the unit's actions — currently just **Attack**, but designed to hold multiple attacks/actions later.
  - Tapping **Attack** highlights the button to show it is active, hides the walk tiles, and shows the attack-target tiles.
  - The button stays labeled by its action name; its **highlighted/active state** (not a label change) indicates it is selected.
- **Canceling an action**: an active action is canceled — returning to the default walk-tile view with no action active — by tapping its highlighted button again **or** by tapping a non-targetable tile. Canceling an action does **not** dismiss the unit; the popup stays open.
- **Tap empty tile to dismiss the unit**: when no action is active (default walk view), tapping an empty / non-actionable tile cancels the unit selection and closes the popup — same effect as the Close (X).
- **BREAKING (UX)**: the explicit **Move** button is removed; move-target selection is the default state of a selected unit rather than an opt-in mode.

## Capabilities

### New Capabilities
- `dungeon-tactics-unit-selection`: The selection-time UX — the PC info popup with immediate walk-tile display and an action bar whose buttons highlight when active, and the info-only NPC popup. Covers what each popup shows, how actions are activated/canceled, how the unit is dismissed, and how selection drives the walk/attack overlays.

### Modified Capabilities
_None._ On review, the existing `dungeon-tactics-solo` spec specs module structure and planning helpers but never specced the Move/Attack/Cancel menu UX, and the exported helpers this change reuses (`selectUnit`, `cancelSelection`, `beginPlanMove`, `beginPlanAttack`) keep their signatures. No existing requirement's normative content changes, so this change is purely additive via the new capability above.

## Impact

- `client-games/src/games/dungeon-tactics-solo/pc.ts` — `selectUnit` should land in the move-selection state; `beginPlanMove`/`beginPlanAttack` and the planning phases may be simplified to a toggle.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsScene.ts` — render the unit info popup as a Phaser container (PC and NPC variants) with in-canvas Close (X) and PC-only Attack/Cancel-Attack toggle; make NPC tiles emit a tap so NPCs can be selected; overlay rendering already keys off `planningPhase` (walk tiles on select, attack tiles on toggle).
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsGame.tsx` — remove the Move/Attack/Cancel menu; handle popup callbacks (close, attack toggle) and route PC vs NPC selection; keep the turn-level Done button in React DOM.
- `client-games/src/games/dungeon-tactics-solo/pc.ts` — `selectUnit` must accept NPC units (info-only, no planning phase).
- `openspec/specs/dungeon-tactics-solo/spec.md` — update affected scenarios.
- Related (not blocking): the in-flight `dungeon-tactics-undo-action` change also touches this game; coordinate HUD button layout when both land.
