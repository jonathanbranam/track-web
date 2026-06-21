## 1. Types

- [ ] 1.1 Add `PcType = 'melee' | 'ranger' | 'magic-user' | 'rogue'` and `NpcType = 'short-range' | 'long-range'` to `types.ts`
- [ ] 1.2 Add `unitType: PcType | NpcType` field to the `Unit` interface in `types.ts`
- [ ] 1.3 Add `hp: number` field to the `Unit` interface in `types.ts`

## 2. Unit stats helper

- [ ] 2.1 Add `moveRange(unit: Unit): number` helper in `pc.ts` (or a shared `stats.ts`) returning per-archetype move ranges (melee/rogue → 4, ranger/magic-user/short-range/long-range → 3)
- [ ] 2.2 Add `attackDamage(unit: Unit): number` helper returning per-archetype damage (melee → 2, all others → 1)

## 3. PC movement

- [ ] 3.1 Replace the hardcoded `steps >= 2` limit in `validMoveDests` with `steps >= moveRange(unit)` using the helper from task 2.1

## 4. PC attack squares

- [ ] 4.1 Update `attackSquares` in `pc.ts` to return adjacent cell (1 tile) for melee and rogue archetypes
- [ ] 4.2 Update `attackSquares` to return all cells at distance ≥ 2 in the chosen direction for ranger archetype (up to grid boundary)
- [ ] 4.3 Update `attackSquares` to return the 5-tile cross centered at distance 2 for magic-user archetype
- [ ] 4.4 Ensure `attackSquares` handles no `attackDir` set (returns empty array) for all archetypes

## 5. PC attack resolution

- [ ] 5.1 Update `resolvePcAction` to reduce target unit `hp` by `attackDamage(attacker)` instead of removing units directly
- [ ] 5.2 Update `resolvePcAction` for ranger: find first unit/structure at distance ≥ 2 in the attack direction (passes over all intervening)
- [ ] 5.3 Update `resolvePcAction` for magic-user: deal 1 damage to every unit/structure on the AoE cross (center at distance 2 + 4 adjacent)
- [ ] 5.4 After HP reduction, filter out any unit with `hp <= 0` from `GameState.units`

## 6. NPC move range

- [ ] 6.1 Update NPC pathfinding step budget in `npc.ts` to use `moveRange(npc)` instead of any hardcoded value

## 7. NPC attack planning

- [ ] 7.1 Update `computeNpcPlans` for short-range NPCs: scan each cardinal direction for targets at distance 1–2; attack the first found before moving
- [ ] 7.2 Update `computeNpcPlans` for long-range NPCs: scan each cardinal direction for the first occupied tile at distance ≥ 2; attack if found, skip adjacency entirely
- [ ] 7.3 Ensure long-range NPC moves rather than attacks if only adjacent targets exist

## 8. NPC attack resolution

- [ ] 8.1 Update `resolveNpcAction` for short-range attacks: deal 1 damage to the target unit or structure (reduce `hp`, remove at 0)
- [ ] 8.2 Update `resolveNpcAction` for long-range attacks: skip all units between attacker and target; deal 1 damage to the first unit/structure at distance ≥ 2

## 9. Initial state

- [ ] 9.1 Update `initialState` in `npc.ts` to assign a `unitType` and `hp: 3` to every starting unit
- [ ] 9.2 Assign PC archetypes: pc-0 → melee, pc-1 → ranger, pc-2 → magic-user, pc-3 → rogue
- [ ] 9.3 Assign NPC archetypes across the 5 starting NPCs (mix of short-range and long-range)

## 10. Scene: colors

- [ ] 10.1 Replace `PC_FILL` / `NPC_FILL` constants in `DungeonTacticsScene.ts` with a `UNIT_COLORS` map keyed by `unitType`
- [ ] 10.2 Update `drawUnit` to look up fill color from `UNIT_COLORS[unit.unitType]`

## 11. Scene: HP pips on units

- [ ] 11.1 Add HP pip rendering to the unit draw call in `DungeonTacticsScene.ts`: 3 pip slots stacked bottom-to-top on the left edge, filled using `UNIT_COLORS[unit.unitType]` for filled pips, outlined for empty
- [ ] 11.2 Verify pip rendering matches the structure pip style (same pip dimensions and gap as `structureHp` pips)

## 12. Scene: attack highlight updates

- [ ] 12.1 Update the attack-square overlay to highlight all tiles returned by `attackSquares` (supports the magic-user cross and ranger line)
- [ ] 12.2 Add a distinct AoE cross highlight style for magic-user (e.g., different color or opacity from the default attack highlight)

## 13. Scene: projectile animations

- [ ] 13.1 Add a projectile tween in `DungeonTacticsScene.ts` for ranger PC attacks: small circle travels from ranger tile to target tile
- [ ] 13.2 Add the same projectile tween for long-range NPC attacks

## 14. Build verification

- [ ] 14.1 Run `npm run build` and confirm zero TypeScript errors across all affected modules
