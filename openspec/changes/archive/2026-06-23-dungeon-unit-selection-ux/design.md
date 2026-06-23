## Context

Dungeon Tactics renders the board in a Phaser scene (`DungeonTacticsScene.ts`) while the HUD (buttons, menus) is plain React DOM layered over the canvas (`DungeonTacticsGame.tsx`). Planning state lives in a single `GameState` object held in a `useRef`; mutations go through pure helpers in `pc.ts`, after which the component calls `scene.redraw(state)` and forces a re-render.

The relevant state field is `planningPhase: 'none' | 'selecting-move' | 'selecting-attack'`. The scene's `drawHighlights()` **already** renders walk-destination tiles when `planningPhase === 'selecting-move'` and attack-target tiles when `planningPhase === 'selecting-attack'`. Today, `selectUnit()` lands in `'none'`, and a React action menu (Move / Attack / Cancel) drives the transitions via `beginPlanMove()` / `beginPlanAttack()` / `cancelSelection()`.

So the desired behavior — walk tiles on select, an Attack/Cancel-Attack toggle, and a dismissable info popup — maps almost entirely onto the existing state machine. The work is rewiring the entry point and replacing the HUD, not building new rendering.

Constraints:
- Only PCs are selectable today; the scene's `pointerdown` handler emits `unit-tapped` for PC units and ignores NPCs. NPCs must become tappable for the info popup, but only as an info-only selection (no move/attack planning).
- During `selecting-attack`, tapping a unit's cell intentionally emits `cell-tapped` (not `unit-tapped`) so attacks can target a tile occupied by an NPC. This must be preserved — i.e., a PC mid-attack must still be able to target an NPC tile rather than selecting the NPC.

## Goals / Non-Goals

**Goals:**
- Selecting a PC immediately shows its walk-destination tiles (no Move step).
- A PC info popup appears on selection showing archetype, HP/maxHP, move range, and attack damage, with a Close (X) control that cancels the selection.
- Selecting an NPC opens an info-only popup showing its name, movement (move range), and HP/maxHP, with the same Close (X) — but no walk/attack overlays and no Attack toggle.
- A single Attack ⇄ Cancel Attack toggle swaps the overlay between walk tiles and attack tiles and relabels itself accordingly.
- Reuse the existing `planningPhase` state machine and scene rendering with minimal logic change.

**Non-Goals:**
- No move/attack planning for NPCs — their selection is purely informational.
- No change to how a move or attack is actually planned/resolved once a tile is tapped.
- No change to the Done/turn-resolution flow or NPC playback.
- No new persisted state or data-model fields.

## Decisions

### 1. Selecting a PC enters `selecting-move`; selecting an NPC stays in `none`
Change `selectUnit()` in `pc.ts` so that selecting a **PC** returns `planningPhase: 'selecting-move'` — making walk tiles the default overlay and letting the existing `drawHighlights()` path render them with no scene changes. Selecting an **NPC** sets `selectedUnitId` but leaves `planningPhase: 'none'`, so no walk/attack tiles are drawn (`drawHighlights()` already no-ops outside the two selecting phases). The popup variant is chosen from the selected unit's `kind`.

- **Alternative considered:** add a new `'selected'` phase distinct from `'selecting-move'`. Rejected — it would duplicate the move-tile rendering branch and the cell-tap handling for no behavioral gain. `'none'` now does double duty as the NPC info-only / unselected / playback state.

### 2. Action bar with active-highlight, modeled on existing `beginPlanAttack` / `beginPlanMove`
The selected-PC panel shows an **action bar** — currently a single **Attack** button, but structured to hold multiple attacks/actions in the future. An action button reflects an **active state by highlighting**, not by relabeling.

- **Attack** (inactive → active) → `beginPlanAttack()` (`→ selecting-attack`): scene hides walk tiles, shows attack tiles, and the button renders in its highlighted/active style.
- **Attack** (active → inactive, i.e. tapping the highlighted button again) → `beginPlanMove()` (`→ selecting-move`): scene hides attack tiles, shows walk tiles, button returns to its normal style.
- The active button is derived from state: a button is highlighted when `planningPhase === 'selecting-attack'` (for the Attack action). The label stays the action name in both states.

This reuses both helpers unchanged. Highlighting is the single source of "active" so the model scales: with multiple actions, each maps to its own selecting-phase and at most one is highlighted at a time.

- **Forward-looking note:** the binary `planningPhase: 'selecting-move' | 'selecting-attack'` will need to generalize to one phase per action (e.g. a `selectedAction` id) once a unit has more than one attack/action. Out of scope here; the highlight-from-state and click-to-toggle wiring is chosen so that generalization is additive.
- **Alternative considered:** relabel the button "Attack" → "Cancel Attack". Rejected — it doesn't scale to multiple actions (you can't cleanly relabel every action to "Cancel X"), and an active highlight reads more clearly as "this mode is on."

### 3. Unit info popup is rendered in Phaser, not React DOM
Render the popup inside the scene as a Phaser `Container`, **anchored to the bottom of the screen** with a fixed UI position (`scrollFactor(0)`) so it stays put while the board pans/zooms beneath it. Two reasons drive Phaser over React DOM: (1) future unit portraits reuse Phaser's texture/asset pipeline instead of a parallel `<img>` loader, and (2) this popup is the first of **several planned in-canvas HUD displays**, so establishing a reusable Phaser HUD container now avoids a DOM/canvas split that grows with each new display. The panel stays visually consistent with the board.

- Displayed fields come from the unit and the existing stat helpers in `pc.ts`: for PCs — archetype (`unit.unitType`), `hp`/max (max is 3, per the HP spec), `moveRange(unit)`, `attackDamage(unit)`; for NPCs — name (the `unitType` string, e.g. `short-range`), movement (`moveRange(unit)`), `hp`/max. The panel is designed to accommodate a unit portrait later.
- The popup contains a **Close (X)** as a Phaser interactive object that calls back into the component to run `cancelSelection()`, which clears `selectedUnitId` and resets `planningPhase` to `'none'`; the redraw then clears both overlays. This replaces the old standalone "Cancel" menu button.
- For **PCs**, the action bar (currently the **Attack** button, with its active-highlight state per Decision 2) lives inside the Phaser panel as Phaser interactives, keeping the selected-unit panel self-contained and ready for more actions and richer content. Action buttons call back to `beginPlanAttack()` / `beginPlanMove()`.
- **Trade-off accepted:** text layout and buttons are manual in Phaser (vs. CSS/flex in DOM), and in-canvas UI is not accessible to screen readers. Acceptable for this single-user, self-hosted game and outweighed by anchoring and asset-pipeline benefits.
- **Alternative considered:** React DOM popup in the HUD layer. Rejected because of camera-anchoring fragility and the future image requirement.
- **Update (during implementation):** the decision below to keep Done/Reset and the confirm dialog in React DOM was superseded — **all** HUD now renders in Phaser (see Decision 4).

### 3a. Component ↔ scene communication
Selection still flows through the existing event bus: the scene emits `unit-tapped`/`cell-tapped`, the component mutates state via the `pc.ts` helpers and calls `scene.redraw(state)`. The Phaser popup is drawn during `redraw()` from `state.selectedUnitId` (so it stays in sync with the single source of truth), and its in-canvas buttons (Close, Attack toggle) emit events (e.g. `popup-close`, `popup-attack-toggle`) that the component handles the same way it handles taps — keeping all state transitions in the component/`pc.ts`, not in the scene.

### 4. All HUD rendered in Phaser
Replace the three-button Move/Attack/Cancel menu with the bottom-anchored Phaser selected-unit popup (info + Close X, plus the Attack/Cancel-Attack toggle for PCs), shown whenever `phase === 'player' && selectedUnitId` (PC or NPC); for NPCs it shows info + Close only.

**All remaining HUD also moves into the Phaser scene** (revised from the original split that kept turn controls in React DOM):
- **Reset** — top-right; always available. Emits `hud-reset`; the component rebuilds initial state.
- **Done** — bottom-right; player phase only. Lifted above the unit popup when one is open. Opens the confirm modal (scene-owned UI state, no React round-trip).
- **End-of-turn confirm modal** — centered backdrop + panel with the unassigned-units warning and Cancel/Confirm. The scene owns its open/closed flag (`confirmOpen`); Cancel closes it, Confirm closes it and emits `hud-done-confirm` for the component to resolve the turn. While open it is blocking — every tap is captured and only Cancel/Confirm act.
- **Playback status pill** — top-center; shown while `phase !== 'player'`.

The component (`DungeonTacticsGame.tsx`) now hosts only the canvas and the event handlers that mutate `GameState`; it renders no HUD DOM. These displays form a reusable in-canvas HUD built on the same UI-camera/uiLayer container.

### 5. NPC tap and preserved re-tap / attack-targeting behaviors
- The scene's `pointerdown` handler now emits `unit-tapped` for **NPC** tiles too (it currently ignores them), so NPCs can be selected for their info popup. The component routes a PC tap into `selecting-move` selection and an NPC tap into info-only selection.
- The existing rule of emitting `cell-tapped` (not `unit-tapped`) while in `selecting-attack` is preserved and takes precedence: a PC mid-attack still targets an NPC-occupied tile rather than selecting that NPC.
- Re-tapping the selected unit while in `selecting-move` still clears a planned move (existing `clearPlanMove` path) — unchanged.
- **Two-tier cancel on a non-targetable tap.** Tapping a tile that is not an actionable target resolves by current phase:
  - In `selecting-attack` (an action is active): tapping a non-attack-target tile **cancels the action**, returning to the default walk view via `beginPlanMove()` (`→ selecting-move`). The unit stays selected and the popup stays open. (Tapping the move-base cell keeps its existing clear-attack behavior.)
  - In `selecting-move` (no action active, the default): tapping a tile that is neither a valid walk destination nor the selected unit **dismisses the unit** via `cancelSelection()` — clearing selection, popup, and overlays.
  This mirrors the button behavior: a non-targetable tap does to the active action exactly what re-tapping its highlighted button does, and only dismisses the whole unit when nothing is active. Tapping actionable targets keeps current behavior (plan move / set attack).

## Risks / Trade-offs

- **`planningPhase: 'none'` becomes dead for selected PCs** → Acceptable; leave the type member in place (still used for unselected/playback states) to avoid touching unrelated code paths.
- **Bottom-anchored popup could obscure lower-row tiles** → Mitigation: keep the panel compact, and since it has a fixed `scrollFactor(0)` position the player can pan the board up to reveal anything beneath it.
- **Stat values drift from rendering** (popup says one thing, board another) → Mitigation: source popup numbers from the same `moveRange`/`attackDamage` helpers the engine uses, not hardcoded copies.
- **Manual Phaser UI cost** (text layout, interactive buttons, depth/z-order, destroy-on-dismiss) → Mitigation: build a small reusable popup container; redraw it from `state` during `redraw()`; keep the simple turn-level Done button in DOM.
- **No accessibility for in-canvas popup** → Accepted for a single-user self-hosted game; revisit if the game is ever opened up.

## Migration Plan

Pure client-side UX change to one game; no data migration, no API or schema changes. Ships with the normal client build. Rollback is reverting the change. No feature flag needed.

## Open Questions

_None outstanding._ Resolved during design:
- A non-targetable tile tap cancels the **active action** if one is active, otherwise **dismisses the unit** (two-tier, Decision 5).
- Popup is **bottom-anchored** with a fixed UI position (Decision 3), not floating near the unit.
- NPC popup name is the **unit type** string.
