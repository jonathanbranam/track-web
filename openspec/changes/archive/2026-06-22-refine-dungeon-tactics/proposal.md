## Why

The current Dungeon Tactics implementation treats all PCs and NPCs as generic, undifferentiated units with identical stats and behavior. Adding distinct archetypes — each with unique movement ranges, attack patterns, and visual identity — makes the game tactically interesting and lays the foundation for future per-type enhancements (e.g., rogue abilities).

## What Changes

- **PC archetypes**: Four distinct PC types replace the generic PC unit:
  - **Melee**: moves 4, attacks adjacent cells (range 1), deals 2 damage
  - **Ranger**: moves 3, ranged attack in a straight line (minimum 1-tile gap, skips over units), deals 1 damage
  - **Magic User**: moves 3, area attack — center tile + 4 orthogonal neighbors — via a straight-line aim (minimum 1-tile gap), deals 1 damage per hit
  - **Rogue**: moves 4, melee attack adjacent cells, deals 1 damage (stub for future enhancement)
- **NPC archetypes**: Two distinct enemy types replace the generic NPC unit:
  - **Short-range**: moves 3, attacks up to 2 tiles in a straight line, deals 1 damage
  - **Long-range**: moves 3, attacks in a straight line with a minimum 1-tile gap; projectile passes over all intervening units and hits only the target tile, deals 1 damage
- **Visual differentiation**: Each PC type and each NPC type renders in a distinct color; same-type units share a color
- **Attack pattern rendering**: Attack range previews and targeting visuals update to reflect each archetype's unique pattern
- **Projectile animation**: Ranger and long-range NPC attacks display a traveling projectile (arrow/bolt) that visually passes over intervening units

## Capabilities

### New Capabilities
- `pc-archetypes`: Stat blocks, movement ranges, attack patterns, and targeting rules for the four PC types (melee, ranger, magic-user, rogue)
- `npc-archetypes`: Stat blocks, movement ranges, attack patterns, and targeting rules for the two NPC types (short-range, long-range)

### Modified Capabilities
- `dungeon-tactics-solo`: Unit model gains a `unitType` discriminator field; movement/attack resolution branches by type; scene rendering maps unit type to color; attack-square computation and NPC planning extend to support archetype-specific logic

## Impact

- **`types.ts`**: `Unit` type gains `unitType` field; new union types for PC/NPC archetypes; new attack-pattern types (line-with-gap, aoe-cross)
- **`pc.ts`**: `validMoveDests`, `attackSquares`, `resolvePcAction` branch on archetype
- **`npc.ts`**: `computeNpcPlans`, `resolveNpcAction` branch on archetype; long-range NPC skips targeting units between self and target
- **`DungeonTacticsScene.ts`**: Unit sprites/colors mapped by type; projectile tween added for ranger/long-range NPC attacks; AoE highlight for magic user
- **`map.ts`** / initial state: Spawner configuration updated to place typed units
- No new routes, APIs, or database changes required
