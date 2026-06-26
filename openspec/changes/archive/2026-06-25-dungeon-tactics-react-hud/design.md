## Context

The dungeon-tactics-solo game is a Phaser game embedded in a thin React host. `DungeonTacticsGame.tsx` holds the authoritative `GameState` in a `useRef` (`stateRef`) and forces re-renders through a manual tick counter (`rerender()`); `DungeonTacticsScene.ts` is a single Phaser scene that draws **both** the board (world layer / main camera) **and** the entire HUD (a separate `uiLayer` painted by a dedicated screen-anchored `uiCamera` at zoom 1).

The HUD is drawn with raw Phaser graphics in `drawHud()` and helpers (`drawStatusPill`, `drawUnitPopup`, `drawConfirmModal`, `addHudButton`). There are no real buttons — input is manual screen-space hit-testing in the scene's `pointerup` handler comparing pointer coordinates against stored `Phaser.Geom.Rectangle` hit regions. HUD activations are emitted as scene events (`hud-reset`, `hud-done-confirm`, `hud-placement-done`, `hud-undo`, `popup-attack-toggle`, `popup-close`) that `DungeonTacticsGame.tsx` listens for, mutates state, and pushes back via `scene().redraw(state)`. One piece of UI state — the confirm modal's `confirmOpen` flag — is currently owned by the scene itself.

A DOM-over-Phaser overlay pattern already exists: `ScenarioEditor.tsx` is an absolutely-positioned React panel toggled by a React `<button>`, communicating purely through React callback props. This change generalizes that pattern to the whole HUD.

Constraints: React 19 + Tailwind 4 (dark-only, mobile-first) are already present in client-games. No test runner is configured in the repo. Local device testing runs over plain HTTP on a LAN IP (non-secure context), so verification is manual in a browser.

## Goals / Non-Goals

**Goals:**
- Render all screen-anchored HUD chrome (status pill, Reset/Start/Done/Undo, unit info popup, confirm modal) as ReactDOM elements over the Phaser canvas.
- Move the confirm-modal open/closed state into React; remove it from the scene.
- Replace the `hud-*` / `popup-*` Phaser event round-trip with direct React handlers calling the existing engine functions.
- Delete the dead Phaser HUD drawing/hit-testing code (`drawHud` and helpers, `uiLayer`/`uiCamera`, HUD branches of `pointerup`).
- Keep board-anchored visuals (move arrows, highlights, ghosts, NPC intent arrows, order labels, HP pips) in Phaser.
- Leave a clean DOM seam for a future simple unit image in the popup portrait area.

**Non-Goals:**
- No change to gameplay rules, turn logic, NPC AI, scenario/persistence behavior, or `GameState` shape.
- Not adding the actual unit images now — only readying the portrait DOM element.
- Not introducing a state-management library (zustand, etc.) or a global store.
- Not restyling the board or migrating any tile-relative rendering to the DOM.

## Decisions

### D1: HUD reads from `stateRef.current`; keep the existing `rerender()` tick
The HUD components live inside `DungeonTacticsGame`'s render tree and read `stateRef.current` directly. Engine mutations already call `rerender()` (a `setTick` bump) after updating `stateRef`, which re-renders the component and therefore the HUD with fresh values.

- **Why:** Minimal churn. State is already React-owned and already triggers a re-render on every mutation; we only need to read it during render. No new store, no prop-threading of state.
- **Alternative — promote `stateRef` to `useState`:** Rejected. The scene also reads/holds state and the ref is mutated synchronously by engine functions before `rerender()`; converting to `useState` risks stale-closure and ordering bugs across the React↔scene boundary for no real benefit.
- **Alternative — zustand/context store:** Rejected as over-engineering for a single embedded component; out of scope per Non-Goals.

### D2: Overlay container is `pointer-events: none`, interactive controls are `pointer-events: auto`
A single absolutely-positioned, full-bleed overlay `<div>` (sibling of `<PhaserGame>`, same parent as the existing editor overlay) wraps the HUD with `pointer-events-none`; each interactive control (buttons, popup panel, modal) sets `pointer-events-auto`. This satisfies the spec requirement that empty HUD regions pass taps through to the board.

- **Why:** Standard, reliable way to overlay interactive DOM on a canvas without stealing board input. Matches the `ScenarioEditor` overlay approach.
- **Alternative — route board taps through the HUD layer:** Rejected; brittle and duplicates hit logic the canvas already does.

### D3: Confirm-modal state moves to React `useState` in `DungeonTacticsGame`
Replace the scene's `confirmOpen` with a React state value (e.g. `confirmOpen`/`setConfirmOpen`). Done opens it; Cancel closes it; Confirm closes it and runs the end-turn engine path.

- **Why:** The modal becomes a React component, so its visibility must be React state. Removes the last scene-owned UI flag and the related `pointerup` branches.

### D4: Extract engine actions into named handlers, called directly by HUD `onClick`
The bodies currently run inside the scene-event listeners (reset, placement-done, done→confirm, undo, popup attack-toggle, popup-close) are extracted into named functions in `DungeonTacticsGame` (e.g. `handleReset`, `handlePlacementDone`, `handleConfirmEndTurn`, `handleUndo`, `handleToggleAttack`, `handleClosePopup`). HUD controls call these directly; the corresponding `game.events` listeners and scene emissions are deleted.

- **Why:** Removes an indirection layer (DOM event → scene hit-test → scene emit → React listener) and satisfies the "invoke the engine directly" requirement. Board-driven events that must stay in Phaser — `unit-tapped`, `cell-tapped` — are untouched; the same handlers can be shared.

### D5: Component decomposition
New components under `dungeon-tactics-solo/hud/` (co-located with the game): `Hud.tsx` (layout container + phase routing), `StatusPill.tsx`, `ActionButtons.tsx` (Reset/Start/Done/Undo with enabled/disabled), `UnitInfoPopup.tsx` (name, HP/Move/Attack via existing `unitDisplayName`/`getMaxHp`/`getMoveRange`/`attackDamage`/`hasAttacked`, portrait `<div>`, Close, Attack toggle), `ConfirmModal.tsx`. Each takes the current `GameState` (or derived props) plus handler callbacks — no internal game state beyond local UI concerns.

- **Why:** Mirrors the spec's requirement boundaries one-to-one, keeping each testable/inspectable in isolation and styleable with Tailwind. Portrait as its own `<div>` is the future image seam.

### D6: Respect the animation guard
HUD controls honor the existing `animatingRef` guard: while NPC/PC tweens play, action controls are disabled (or their handlers no-op), matching today's behavior where the scene ignores input during animation.

- **Why:** Preserves current UX and prevents mid-animation state corruption.

### D7: Scene cleanup
Delete `drawHud`, `drawStatusPill`, `drawUnitPopup`, `drawConfirmModal`, `addHudButton`, the `confirmOpen` field, the stored HUD hit `Rectangle`s, and the `uiLayer`/`uiCamera` setup and their camera `ignore` wiring. The scene keeps `worldLayer`, the main camera, board drawing (`drawTiles`, `drawUnits`, `drawPlanningOverlay`, `drawHighlights`), animations, and the board-input branches of `pointerup`.

- **Why:** The `uiCamera`/`uiLayer` exist solely to screen-anchor the HUD; with the HUD in the DOM they are dead. Removing them simplifies the scene to pure board rendering.

## Risks / Trade-offs

- **Interaction parity gaps** (a former hit region has no working DOM control) → Build a control-by-control checklist from the spec scenarios (Reset, Start, Done→confirm, Undo enabled/disabled, popup Close, Attack toggle, modal Cancel/Confirm) and manually verify each before deleting the Phaser HUD code.
- **Overlay blocks the board** (wrong `pointer-events`/z-index) → Container `pointer-events-none` with `-auto` only on controls; verify board taps land in regions adjacent to controls and through transparent gaps.
- **Stale HUD if a mutation path skips `rerender()`** → Audit that every engine mutation already funnels through `rerender()`; the HUD relies on the same tick that the board redraw does.
- **Mobile layout / safe areas** (popup and bottom buttons overlapping the home indicator) → Use the project's `--sab`/safe-area conventions and test at phone width; the popup is bottom-anchored like today.
- **Animation-time input** (HUD clickable mid-tween) → Gate controls on `animatingRef` (D6).
- **Two HUDs visible during transition** (if built before old one is removed) → Build behind the existing HUD, verify parity, then remove Phaser HUD in the same change so only one ships.

## Migration Plan

1. Add the DOM overlay container and HUD components reading `stateRef.current`, rendered over the canvas (Phaser HUD still present underneath).
2. Wire HUD controls to extracted handlers (D4) and move confirm state to React (D3).
3. Verify interaction parity against the spec-scenario checklist.
4. Remove the Phaser HUD code and `uiLayer`/`uiCamera`; drop the `hud-*`/`popup-*` events (D7).
5. Final pass: pointer-events/stacking, mobile/safe-area, animation guard.

**Rollback:** Pure client-side, no schema or API change. Revert the commit(s); single-user self-hosted deploy makes this low-risk.

## Testing

No automated test runner is configured in this repo, so coverage is **manual browser verification** driven by the spec scenarios (each `#### Scenario` is a test case). Capture Playwright screenshots to `/tmp/track-verify/` per project convention. Minimum matrix:

- Status pill text in placement / player / enemy phases.
- Reset from each phase returns to the active scenario start.
- Start present only in placement and begins the first turn.
- Done present only in player phase and opens the modal; Cancel keeps turn; Confirm ends turn → enemy phase.
- Undo enabled after an action and reverts it; disabled + dimmed + no-op when stack empty.
- Unit popup shows name + HP/Move/Attack for a selected unit; Close dismisses; Attack toggle flips attack mode and updates the board overlay; portrait area present.
- Empty-region taps pass through to the board; board pan/zoom keeps HUD screen-anchored while board visuals transform.

## Open Questions

- Should HUD controls render as Tailwind-styled buttons matching `ScenarioEditor`, or do we want a distinct game-HUD visual style? (Default: reuse the editor's button styling for consistency.)
- Exact bottom-anchor stacking order of the unit popup vs. the Done/Undo buttons on narrow screens — confirm during step 5.
