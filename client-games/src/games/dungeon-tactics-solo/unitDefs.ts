import type { PcType, NpcType, UnitDef } from './types'
import { GRID_COLS } from './map'

// Canonical, data-defined behavior for every unit archetype. This table is the
// single source of truth for per-archetype move range, max HP, attack damage,
// and attack footprint — the engine derives those from here instead of
// `switch (unitType)` branches. `statOverrides.ts` seeds the admin override layer
// from these defaults (Stage 1 of the unit framework; values reproduce the
// previous hardcoded behavior exactly).
//
// `line` footprints extend to the board edge; their `maxRange` is set to the
// longest cardinal reach on this board (`GRID_COLS - 1`), so edge-clipping in
// `attackFootprint` yields the same tiles the old "walk until off-board" loops
// did. `plus` uses `maxRange` as the center distance; `single` uses `minRange`.
const LINE_TO_EDGE = GRID_COLS - 1

export const unitDefs: Record<PcType | NpcType, UnitDef> = {
  // ─── PCs ───
  melee: {
    maxHp: 3,
    movement: { range: 4 },
    attack: {
      damage: 2,
      targeting: { mode: 'direction', arc: 'cardinal', minRange: 1, maxRange: 1 },
      propagation: { shape: 'single', penetration: 'none' },
    },
  },
  rogue: {
    maxHp: 3,
    movement: { range: 4 },
    attack: {
      damage: 1,
      targeting: { mode: 'direction', arc: 'cardinal', minRange: 1, maxRange: 1 },
      propagation: { shape: 'single', penetration: 'none' },
    },
  },
  ranger: {
    maxHp: 3,
    movement: { range: 3 },
    attack: {
      damage: 1,
      targeting: { mode: 'direction', arc: 'cardinal', minRange: 2, maxRange: LINE_TO_EDGE },
      propagation: { shape: 'line', penetration: 'stop_at_first' },
    },
  },
  'magic-user': {
    maxHp: 3,
    movement: { range: 3 },
    attack: {
      damage: 1,
      targeting: { mode: 'direction', arc: 'cardinal', minRange: 2, maxRange: 2 },
      propagation: { shape: 'plus', penetration: 'none' },
    },
  },
  // ─── NPCs ───
  // NPC resolution always damages the single chosen target tile, so the
  // resolution `shape` is `single`; the line-scan / distance-1-then-2 target
  // *selection* lives in npc.ts and reads these range bounds.
  'short-range': {
    maxHp: 3,
    movement: { range: 3 },
    attack: {
      damage: 1,
      targeting: { mode: 'direction', arc: 'cardinal', minRange: 1, maxRange: 2 },
      propagation: { shape: 'single', penetration: 'stop_at_first' },
    },
  },
  'long-range': {
    maxHp: 3,
    movement: { range: 3 },
    attack: {
      damage: 1,
      targeting: { mode: 'direction', arc: 'cardinal', minRange: 2, maxRange: LINE_TO_EDGE },
      propagation: { shape: 'single', penetration: 'stop_at_first' },
    },
  },
}
