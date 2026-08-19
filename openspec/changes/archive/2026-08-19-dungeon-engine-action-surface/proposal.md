## Why

`@repo/dungeon-engine` exports geometry (`attackFootprint`, `validMoveDests`) but not the layer above it: **what may this unit do right now, what may the player pick, and is the pick legal.** Every consumer therefore builds that layer itself, and there are now three — the Phaser game, the harness bench, and the Gherkin step definitions — with three different answers.

The consequences are already shipping. The game infers an attack direction from a tapped tile in a React component, without checking the tile is in any footprint, so an out-of-range axis-aligned tap attacks the adjacent tile instead. The engine's `resolvePcAction` never consults `validMoveDests`, the movement budget, or `hasAttacked`, and `applyMove` validates nothing at all — **all legality in the shipped game is enforced by which tiles the renderer chose to highlight.** The harness bench, meanwhile, presents four direction buttons for an attack the game targets by tile, so a designer reasoning about the magic-user in the bench is reasoning about a control scheme the game does not have.

Now, because the harness exists to tell a designer the truth about unit behaviour, and it currently cannot. This change adds the missing engine layer; two follow-on changes migrate the hosts onto it.

## What Changes

- **New `actions.ts` module** in `packages/dungeon-engine`, exported from the package index:
  - `availableActions(state, unitId)` — every action the unit could take, available or not, each carrying the tiles the UI may offer, how to paint them, and a plain-English reason when unavailable.
  - `previewAction(state, unitId, action, tile)` — what committing against that tile would do: affected tiles, movement cost, per-tile effects, and whether it hits nothing.
  - `commitAction(state, unitId, action, tile)` — validates and applies, returning either the new state or a rejection reason. **It re-derives legality rather than trusting the caller.**
- **Actions are committed against a tile, never a direction.** `Direction` becomes an engine-internal detail of attack resolution. This is what makes the magic-user divergence structurally impossible rather than merely fixed.
- **New `threatTiles(state, unitId)` query** backed by the same targeting scan the NPC AI uses, so hosts stop approximating "what can this unit hit" from definition fields.
- **New `reconcileHp(state, prevMax)`** — the max-HP delta rule (floored at 1, so lowering a maximum can never kill) moves out of a React callback in the game host and into the engine.
- No host is modified here. The change is additive: existing exports keep working, and the game behaves identically after it lands.

## Capabilities

### New Capabilities
- `dungeon-tactics-action-surface`: the engine-owned contract for driving a unit — enumerating available actions with their legal targets, previewing an action's effects, and committing an action through engine validation.

### Modified Capabilities
- `data-driven-unit-defs`: adds the max-HP reconciliation rule as an engine responsibility, and the targeting query derived from unit definitions.

## Impact

- `packages/dungeon-engine/src/`: new `actions.ts`, `actions.test.ts`; `index.ts` exports; `npc.ts` gains an exported targeting query over its existing private scanners; `defStore.ts` or a new module gains `reconcileHp`.
- No changes to `client-games/`, the harness, or any persisted data.
- Downstream: `dungeon-game-action-adoption` (this repo) and `dungeon-bench-action-adoption` (the sibling harness repo) both depend on this change landing first.
- Full plan and the audit behind it: `../../../harness/docs/dungeon-harness/harness-rebuild/action-surface-plan.md` in the sibling repo.
