import type { PcType, NpcType, UnitDef } from './types'
import { BUNDLED_MAP } from './bundledMap'

// Data-defined behavior for every unit archetype. This table is the bundled
// seed / fallback for per-archetype move range, max HP, attack damage, and
// attack footprint. At runtime the engine reads from the in-memory `defStore`,
// which is loaded from the persisted default scenario at game start and falls
// back to this table when that fetch fails (Stage 2 of the unit framework). The
// values here reproduce the original hardcoded behavior exactly.
//
// SYNC NOTE: the server keeps a copy of these defaults (for seeding the default
// scenario) in `src/games/dungeon-tactics/unitDefs.ts` — keep the two in sync.
//
// `line` footprints extend to the board edge; their `maxRange` is set to the
// longest cardinal reach on the bundled board (`cols - 1`), so edge-clipping in
// `attackFootprint` yields the same tiles the old "walk until off-board" loops
// did. `plus` uses `maxRange` as the center distance; `single` uses `minRange`.
const LINE_TO_EDGE = BUNDLED_MAP.map.size.cols - 1

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
