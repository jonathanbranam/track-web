## Why

`dungeon-engine-action-surface` added the engine layer that answers "what may this unit do, what may the player pick, and is the pick legal". The game still answers those questions itself, in a React component and a Phaser scene, and gets two of them wrong.

**The targeting derivation has a live bug.** `DungeonTacticsGame.tsx:308` resolves a tapped tile to an attack direction by axis alignment, without checking the tile is in any footprint. Tap four tiles straight up from a melee PC — outside the highlight and outside every footprint — and it attacks the adjacent tile instead. Attacks are committal, so this clears the undo stack and locks the unit for the turn. The spec already forbids it (`dungeon-tactics-unit-selection` says a tap on a non-target tile cancels the action); the implementation has never matched, and could not be tested where it sits.

**The attack animations contradict the definitions.** The scene hardcodes the ranger's minimum range as `for (let d = 2; ...)` and the magic-user's blast as a five-tile cross at `col + dc * 2`. `attackFootprint` derives both from the unit definition. Edit an archetype's range in the unit editor and the animation plays the old geometry while damage lands on the new — the game misreports the exact edit the harness exists to support.

**`move-attack` is dead, and its scenario is a false green.** Nothing has constructed a PC `move-attack` since commit `104e695` replaced plan-then-commit with immediate actions. The `melee-move-attack-same-turn` scenario still exercises it, passing `path: []` — a free teleport costing no movement. The behaviour it names is real and is currently untested.

## What Changes

- The game drives every PC and NPC action through `availableActions` / `preview` / `commitAction`. The tile→direction derivation in `DungeonTacticsGame.tsx` is **deleted**, and with it the axis-alignment bug.
- The unit popup renders the engine's action list: **Move and Attack both appear**, each enabled or disabled from the engine's answer, with the engine's reason shown when disabled. Today Move is implicit (highlighted tiles only) and Attack silently vanishes when spent.
- The scene highlights the tiles the engine offers rather than unioning `attackSquares` over four directions itself.
- Attack animations derive their geometry from `preview().affected` instead of hardcoded archetype constants, so they follow an edited definition.
- The live def-edit path calls the engine's `reconcileHp` instead of its own copy of the max-HP rule.
- **BREAKING (internal):** the `move-attack` `PcAction` variant is removed, along with its resolution branch and its unreachable animation branches. The `melee-move-attack-same-turn` scenario is rewritten as two commits through the action surface, asserting the movement budget is charged and the unit locks — turning a false green into real coverage.

## Capabilities

### Modified Capabilities
- `dungeon-tactics-unit-selection`: the action bar is engine-driven and lists unavailable actions with reasons; attack aiming is specified as choosing a target tile rather than a direction.
- `data-driven-unit-defs`: the single footprint derivation drives attack **animation** as well as preview and resolution.
- `pc-archetypes`: archetype scenarios are re-phrased around aiming at a target tile, and melee's move-and-attack scenario describes the immediate-action model it actually ships.

## Impact

- `client-games/src/games/dungeon-tactics-solo/`: `DungeonTacticsGame.tsx`, `DungeonTacticsScene.ts`, `hud/UnitInfoPopup.tsx`, `features/steps/pc.steps.ts`, `features/melee.feature`.
- `packages/dungeon-engine/src/types.ts` and `pc.ts`: the `move-attack` variant and its branch.
- Player-visible: a tap on a non-target tile now cancels instead of misfiring; disabled Move/Attack controls appear with reasons where controls previously vanished.
- Touches Phaser pointer input, so `kb/phaser-mobile-input.md` applies.
