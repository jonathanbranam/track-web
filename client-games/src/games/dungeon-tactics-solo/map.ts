import type { Cell } from './types'

export const GRID_COLS = 16
export const GRID_ROWS = 8

// 16×8 map. Terrain: terrains[(col+row)%4] = plains/forest/water/stone.
// Power centers (P): (8,2) (5,4) (11,4) (2,6) (14,6)   Tower (T): (8,6)
// Spawners (E): (0,1) (4,0) (7,0) (10,0) (15,1)   PCs (C): (2,7) (6,7) (10,7) (13,7)
export const SPAWNER_POSITIONS: { col: number; row: number }[] = [
  { col: 0,  row: 1 },
  { col: 4,  row: 0 },
  { col: 7,  row: 0 },
  { col: 10, row: 0 },
  { col: 15, row: 1 },
]

// ─── Turn-0 spawn placement ────────────────────────────────────────────────────
//
// The valid spawn zone is a fixed, hand-authored layout — the exact placeable
// tiles ("Y" + the four PC-start markers) from the design map, encoded literally
// rather than derived at runtime. One string per row, mirroring the drawing:
//   'Y' = placeable spawn tile · '.' = not placeable.
// Structure holes (power centers, tower) and trimmed flank corners are simply
// left as '.'. The forward generator sits at (8,3); the zone's center front line
// is row 4, just behind it, and recedes toward the back row on the flanks.
// (41 placeable tiles total.)
export const SPAWN_ZONE_LAYOUT: string[] = [
  //     0123456789012345  (col)
  /*0*/ '................',
  /*1*/ '................',
  /*2*/ '................',
  /*3*/ '................',
  /*4*/ '......YYYYY.....',
  /*5*/ '...YYYYYYYYYYY..',
  /*6*/ '...YYYYY.YYYYY..',
  /*7*/ '.YYYYYYYYYYYYYYY',
]

// Fixed default PC start tiles, one per archetype, all inside the spawn zone.
export const PC_START_TILES: Record<'melee' | 'ranger' | 'magic-user' | 'rogue', { col: number; row: number }> = {
  melee:        { col: 4,  row: 5 },
  ranger:       { col: 6,  row: 5 },
  'magic-user': { col: 10, row: 5 },
  rogue:        { col: 13, row: 5 },
}

// The Set<string> of "c,r" keys for every placeable tile in the authored layout.
export function spawnZoneTiles(): Set<string> {
  const keys = new Set<string>()
  for (let r = 0; r < SPAWN_ZONE_LAYOUT.length; r++) {
    const rowStr = SPAWN_ZONE_LAYOUT[r]
    for (let c = 0; c < rowStr.length; c++) {
      if (rowStr[c] === 'Y') keys.add(`${c},${r}`)
    }
  }
  return keys
}

export const INITIAL_MAP: Cell[][] = [
  // row 0
  [
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
  ],
  // row 1
  [
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
  ],
  // row 2 — power center at col 8
  [
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
  ],
  // row 3
  [
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
  ],
  // row 4 — power centers at cols 5 and 11
  [
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
  ],
  // row 5
  [
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
  ],
  // row 6 — power centers at cols 2 and 14, tower at col 8
  [
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 5, structureKind: 'tower' },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'forest', hasStructure: false },
  ],
  // row 7 — PC start positions at cols 2, 6, 10, 13
  [
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
  ],
]
