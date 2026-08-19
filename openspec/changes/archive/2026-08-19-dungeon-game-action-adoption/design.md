## Context

See `proposal.md`. The engine surface this adopts landed in `2026-08-19-dungeon-engine-action-surface`; the audit behind both is in the sibling harness repo at `docs/dungeon-harness/harness-rebuild/action-surface-plan.md`.

The game's action handling is spread across three files: `DungeonTacticsScene.ts` decides which tiles to highlight and emits taps, `DungeonTacticsGame.tsx` turns a tap into an action, and `hud/UnitInfoPopup.tsx` decides which controls to show. Each holds a piece of "what may this unit do", and none of them agrees exactly with the engine.

`kb/phaser-mobile-input.md` applies: taps reach the game through the scene's own `this.input` pointer handling (Fix 1), and the HUD is a ReactDOM overlay whose buttons rely on DOM clicks (Fix 2). Both patterns are already in place and must survive this change untouched — the risk is regressing them while moving the handler bodies.

## Goals / Non-Goals

**Goals:**
- One source of truth for legality, shared with the harness.
- Delete the host-side derivation rather than fix it in place.
- Make the animation follow the definition, so a def edit is depicted honestly.

**Non-Goals:**
- The round/phase sequencer and the NPC telegraph window — the deferred change.
- Reworking the HUD's layout or visual design beyond adding the Move control and the disabled state.
- Changing NPC AI behaviour. `computeNpcTurns` still drives the enemy phase; only hand-committed actions go through the new surface.

## Decisions

### Delete the derivation, do not fix it

`DungeonTacticsGame.tsx:296-340` could be repaired with a membership check. It is deleted instead, because the same logic is now in the engine with tests, and leaving a second copy is how the two drifted in the first place. The tap handler becomes: ask the engine for the active action's targets, and commit if the tapped tile is one.

### The scene stops deriving highlights

`drawHighlights` currently unions `attackSquares` across four directions to decide what to paint. It instead paints the `targets` of whichever action is active, using the `overlay` hint to pick its treatment. The scene keeps its palette; the engine never learns about colours.

### Animation geometry comes from `preview().affected`

The ranger's projectile currently walks `for (let d = 2; ; d++)` and the magic-user's blast is a hardcoded cross at `dc * 2`. Both are replaced by the tiles the engine reports for the action about to resolve: the projectile travels to the last affected tile, the blast flashes the affected set. The per-archetype *style* (projectile vs. flash) stays in the scene — that is presentation. Only the geometry moves.

An alternative was to keep the loops and clamp them to the definition's ranges. Rejected: it keeps two derivations that must be kept in step by hand, which is the defect.

### `planningPhase` stays, and gains a `selecting-move` meaning it already had

The engine's `planningPhase` (`none` / `selecting-move` / `selecting-attack`) already models "which action is active", so it becomes the client's record of the active action rather than a new piece of state. `beginPlanMove` / `beginPlanAttack` keep their meaning. This keeps the change to the tap handler and the popup, not to the state shape.

### Move becomes a visible control

Today movement is implicit: selecting a PC lands in `selecting-move` and tiles light up, and there is no Move button to disable when the budget is spent — the tiles simply stop appearing, unexplained. The popup now renders both actions from `availableActions`, so "why can't I move?" is answered on screen. Selecting a PC still lands in `selecting-move`, so the default view is unchanged for a unit that can move.

### `move-attack` is removed, and its scenario rewritten rather than deleted

Deleting the scenario would discard the coverage instead of finally providing it. `melee-move-attack-same-turn` becomes two commits — a move, then an attack — asserting the budget is charged, the attack resolves from the new cell, and the unit locks. That is the behaviour the game actually ships, and nothing tests it today.

## Risks / Trade-offs

- **[Regressing the two Phaser input patterns while moving handler bodies]** → The scene's `this.input` pointer handling and the HUD's DOM-click path are left structurally alone; only the *body* of the tap handler changes. Verified in a browser before the change is closed.
- **[The popup grows a control and could crowd on a phone]** → The action bar already exists and is specified to hold more actions; Move joins it rather than adding a new region.
- **[Animation driven by preview could desynchronise if the state changes between preview and resolve]** → The preview is taken from the same state the commit is validated against, in the same tick, before any animation starts.
- **[NPC telegraph rendering still reads `npcPlans` directly]** → Unchanged and out of scope; the sequencer change owns it.

## Migration Plan

No data migration. The change is complete when the game plays identically except for the three intended differences (a non-target tap cancels instead of misfiring, disabled controls appear with reasons, and animations follow edited definitions), verified in a browser.
