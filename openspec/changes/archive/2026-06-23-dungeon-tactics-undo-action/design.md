## Context

Dungeon Tactics Solo (`client-games/src/games/dungeon-tactics-solo/`) currently uses a **plan-then-execute** model for the player turn:

- Tapping a PC opens an in-canvas popup; the player assigns a planned move and/or attack, which is stored in `GameState.plans` / `planOrder` (see `types.ts`).
- Nothing happens on the board until the player taps **Done**, which calls `endPlayerTurn()` and hands a precomputed `PcAction[]` list to `runPcPlayback()` in `DungeonTacticsGame.tsx`. Each action is then animated and resolved one at a time, followed by NPC playback.

The HUD is **already rendered entirely inside Phaser**, not in React DOM. `DungeonTacticsScene.drawHud()` rebuilds the Reset button (top-right), the Done button (bottom-right), the unit popup, and the end-turn confirm modal on every `redraw`, drawing them into a dedicated `uiLayer` rendered by a separate UI camera so they stay anchored while the board pans/zooms. Each button is a rounded-rect graphic plus text registered via `addHudButton()`, which returns a `Phaser.Geom.Rectangle` hit region. Taps are matched against those regions in screen space and the scene emits semantic events (`hud-reset`, `hud-done-confirm`, etc.) that the React host (`DungeonTacticsGame.tsx`) listens to and applies against `stateRef`.

This change makes PC actions **immediate** and adds an **Undo** affordance as the recovery mechanism (see `proposal.md`). Per the explicit design instruction from the user, the **Undo button is rendered in the Phaser UI** — consistent with how Reset/Done already work — not as a React DOM overlay.

> **Note on the proposal's Impact section:** it references `GridScene.ts`, `GridModel.ts`, and `GridRenderingGame.tsx`. Those are placeholder names; the actual files are `DungeonTacticsScene.ts`, `DungeonTacticsGame.tsx`, and the pure-logic modules `pc.ts` / `npc.ts` / `types.ts`. There is no separate model file — game state lives in `types.ts` (`GameState`) with reducers in `pc.ts` / `npc.ts`. The tasks artifact should map work to these real files.

## Goals / Non-Goals

**Goals:**
- PC **move** actions are committed immediately on tap — no plan-then-execute deferral — while the movement itself **still animates** (the PC slides along its path; it does not teleport).
- Maintain an undo stack of reversible PC move records in `GameState`.
- Render an **Undo** button in the Phaser HUD, enabled when the stack is non-empty and visibly disabled when empty.
- Clicking Undo pops the most recent move and restores the PC to its prior position (and any incidental state the move changed); the reversal is **animated** — the PC slides back along its path to its original square rather than snapping.
- Clear the stack when any PC attacks or when the round ends.
- Keep the undo stack logic in the pure reducer modules so it is unit-testable without Phaser.

**Non-Goals:**
- Undoing **attacks** or any NPC actions. Attacks are committal and clear the stack.
- A redo stack or multi-branch history.
- Changing the NPC playback model — NPC actions remain animated playback.
- Persisting the undo stack across reloads or rounds.
- Re-theming or relocating existing HUD controls beyond making room for the Undo button.

## Decisions

### 1. Undo button lives in the Phaser HUD, not React DOM

Render the Undo button inside `drawHud()` using the existing `addHudButton()` helper, store its hit region (`this.undoHit`), match taps against it in the screen-space tap handler, and emit a new `hud-undo` event. `DungeonTacticsGame.tsx` adds a `game.events.on('hud-undo', …)` handler that applies the undo reducer to `stateRef` and redraws.

- **Why:** The HUD is a single, unified surface owned by the scene and anchored by the UI camera. Adding a React DOM button would split the HUD across two rendering systems, require manual alignment against the canvas, and break the established "rebuild HUD from state on every redraw" pattern. The Reset/Done buttons set the precedent; Undo follows it.
- **Alternative considered — React DOM overlay button:** Rejected. It would float over the canvas with separate layout/safe-area handling, duplicate enabled/disabled styling logic, and diverge from the existing event-driven HUD architecture.

### 2. Undo stack stored in `GameState`, mutated by pure reducers

Add an `undoStack` field to `GameState` (`types.ts`) holding reversible move records — minimally `{ unitId, fromCol, fromRow, toCol, toRow }`, plus any derived state a move changes (e.g. consumed action flags) so a pop fully restores the prior state. Add reducers in `pc.ts`: `pushUndo(state, record)`, `undoLastMove(state)` (pop + reverse), and `clearUndo(state)`.

- **Why:** Game state is already a plain serializable object reduced by pure functions; keeping the stack there makes undo deterministic and unit-testable without instantiating Phaser. The scene stays a pure renderer of state.
- **Alternative considered — keep the stack in the scene:** Rejected. It would entangle undo logic with rendering and make it untestable under the project's (Phaser-free) test approach.

### 3. Immediate (animated) move commit replaces deferred PC playback

When the player chooses a move destination, the move is **committed immediately** — there is no plan-then-execute deferral and no batched `Done`→playback step for PC moves. The movement is still **animated**: the existing `animatePcAction()` slide-along-path animation plays as the move commits, then the state is applied (`units` updated) and an undo record is pushed. The deferred `Done`→`endPlayerTurn`→`runPcPlayback` batch flow for **PC moves** is removed; instead each move animates the moment it is chosen.

- **Why:** "Immediate" in the proposal refers to *when* the action takes effect (on tap, no queued playback phase), not to removing the animation. Keeping per-move animation preserves the game's readability — the player sees each PC traverse its path. The undo stack is built from these immediately-committed moves.
- **Sequencing:** Because a move now animates inline, input should be guarded while a move animation is in flight (ignore taps until the slide completes) so moves and undos can't interleave mid-animation. Undo likewise animates the reverse slide and re-guards input.
- **Alternative considered — instant teleport on commit:** Rejected. It removes the spatial feedback that makes moves legible and clashes with the existing animated NPC playback.
- **Trade-off:** Attacks may remain a brief animated resolution, but they are committal and clear the stack — see Decision 4. The exact attack-commit UX is refined in the spec, not here.

### 4. Stack cleared on attack or round end; button state derived from stack length

`undoStack` is emptied whenever any PC attack resolves and whenever the round ends (`endRound`). `drawHud()` derives the Undo button's enabled state from `undoStack.length > 0`: enabled buttons use the standard fill/stroke; disabled buttons render dimmed (lower-alpha fill, muted text) and register **no** hit region so taps are ignored.

- **Why:** Mirrors the proposal's example sequence exactly and keeps button state a pure function of game state, consistent with the rebuild-on-redraw HUD pattern. No separate enabled/disabled flag to keep in sync.

### 5. Button placement

Place Undo adjacent to the existing turn controls (e.g. bottom-left, mirroring Done at bottom-right, or beside Reset), lifted above the unit popup when one is open using the same `popupTop` offset logic Done already uses. Exact coordinates are an implementation detail for the tasks artifact.

## Risks / Trade-offs

- **State restoration completeness** → A move can have side effects beyond position (e.g. revealing tiles, consuming an action). If the undo record only captures position, undo could desync state. *Mitigation:* the undo record captures every field a move mutates; reducers are covered by unit tests asserting `undo(apply(s, move)) === s`.
- **Disabled button still intercepting taps** → If a disabled Undo button keeps a hit region, players could trigger undo on an empty stack. *Mitigation:* register the hit region only when enabled (Decision 4); the reducer is also a no-op on an empty stack as defense-in-depth.
- **Animations interleaving with input** → Since moves and undos now animate inline, a tap landing mid-animation could apply state out of order. *Mitigation:* guard input while a move/undo animation is in flight (Decision 3); ignore taps until it completes.
- **HUD crowding on small screens** → Adding a fourth control near Reset/Done/popup risks overlap on narrow viewports. *Mitigation:* reuse the `popupTop` lift logic and position Undo opposite Done; verify on a phone-width viewport.
- **Spec drift in the core game spec** → `openspec/specs/dungeon-tactics-solo/spec.md` still describes plan-then-execute "PC playback." *Mitigation:* the `dungeon-tactics-solo` modified-capability spec in this change updates those scenarios; sync before archiving.

## Migration Plan

This is a client-only, in-memory game feature — no database, API, or deploy-config changes (no Caddyfile/server-deploy edits). Rollout is a normal client build. Rollback is reverting the change; there is no persisted state to migrate, since the undo stack lives only in the in-memory `GameState` for the current round.

## Open Questions

- After committing a PC **attack**, should the move(s) leading up to it remain reflected on the board (stack merely cleared), or is there any visual confirmation of "actions locked"? Assumed: board state stays, stack clears, Undo greys out.
- Does ending the player turn require any confirmation now that moves are immediate, or is the end-turn confirm modal still warranted? Assumed: out of scope here; the existing confirm modal behavior is unchanged unless the spec says otherwise.
