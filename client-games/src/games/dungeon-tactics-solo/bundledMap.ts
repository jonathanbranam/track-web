import type { ContentTree } from './contentTypes'

// The bundled offline/error fallback for board content — the refactored former
// `map.ts` data (a faithful 1:1 port of the original hardcoded 16×8 board). The
// content store loads the persisted default map at game start and falls back to
// this when that fetch fails (the role `unitDefs.ts` plays for unit stats).
//
// SYNC NOTE: this is an intentional copy of the server seed
// `BUNDLED_MAP` in `src/games/dungeon-tactics/map.ts`. When you change one,
// mirror the other. `contentStore.test.ts` asserts this deserializes to the
// prior board and `map.test.ts` (server) asserts the seed validates.

// terrain extracted verbatim from the original `INITIAL_MAP` (note: cells under
// structures do not follow the `(col+row)%4` formula, so the grid is literal).
const SEED_TERRAIN = [
  ['plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone'],
  ['forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains'],
  ['water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'plains', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest'],
  ['stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water'],
  ['plains', 'forest', 'water', 'stone', 'plains', 'plains', 'water', 'stone', 'plains', 'forest', 'water', 'plains', 'plains', 'forest', 'water', 'stone'],
  ['forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains'],
  ['water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'plains', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest'],
  ['stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water'],
] as const

export const BUNDLED_MAP: ContentTree = {
  region: {
    id: 'default',
    name: 'Classic',
    theme: 'classic',
    order: 0,
    terrainTypes: ['plains', 'forest', 'water', 'stone'],
  },
  map: {
    id: 'default',
    regionId: 'default',
    name: 'Classic Board',
    order: 0,
    size: { cols: 16, rows: 8 },
    terrain: SEED_TERRAIN.map(row => [...row]) as ContentTree['map']['terrain'],
    objects: [
      { col: 8, row: 3, kind: 'power-center', hp: 3 },
      { col: 5, row: 4, kind: 'power-center', hp: 3 },
      { col: 11, row: 4, kind: 'power-center', hp: 3 },
      { col: 2, row: 6, kind: 'power-center', hp: 3 },
      { col: 8, row: 6, kind: 'tower', hp: 5 },
      { col: 14, row: 6, kind: 'power-center', hp: 3 },
    ],
    enemySpawnZone: ['0,1', '4,0', '7,0', '10,0', '15,1'],
    playerSpawnZone: [
      '6,4', '7,4', '8,4', '9,4', '10,4',
      '3,5', '4,5', '5,5', '6,5', '7,5', '8,5', '9,5', '10,5', '11,5', '12,5', '13,5',
      '3,6', '4,6', '5,6', '6,6', '7,6', '9,6', '10,6', '11,6', '12,6', '13,6',
      '1,7', '2,7', '3,7', '4,7', '5,7', '6,7', '7,7', '8,7', '9,7', '10,7', '11,7', '12,7', '13,7', '14,7', '15,7',
    ],
  },
  encounter: {
    id: 'default',
    mapId: 'default',
    name: 'Classic Encounter',
    order: 0,
    waves: [
      {
        index: 0,
        start: { trigger: 'immediate' },
        enemies: [
          { archetype: 'short-range', count: 3 },
          { archetype: 'long-range', count: 2 },
        ],
      },
    ],
    win: [{ type: 'clear-all-waves' }],
    lose: [{ type: 'all-pcs-defeated' }],
    achievements: [],
  },
}
