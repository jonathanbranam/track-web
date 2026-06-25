import { z } from 'zod'

// Server-side authority for the dungeon-tactics serialized board content:
// Region → Map → Encounter. These Zod schemas mirror `content_model.md` and the
// client-side shape types in `client-games/src/games/dungeon-tactics-solo/
// contentTypes.ts`. They are the runtime validation guard for every persisted
// content write (the role `unitDefSchema` plays for unit stats).
//
// SYNC NOTE: `BUNDLED_MAP` below is an intentional copy of the client bundled
// fallback in `client-games/src/games/dungeon-tactics-solo/bundledMap.ts` (the
// two live in separate npm workspaces and cannot share a module). When you change
// one, mirror the other. `map.test.ts` asserts `BUNDLED_MAP` satisfies these
// schemas so an interface/Zod drift fails fast.

// Map size bounds. Min 4×4, max 16×16 — the seed stays 16×8. The 16×16 cap keeps
// every board within the current Manhattan-span move/range bounds (max 22).
export const MAP_SIZE_MIN = 4
export const MAP_SIZE_MAX = 16

// ─── Region ─────────────────────────────────────────────────────────────────

export const regionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  theme: z.string(),
  order: z.number().int().min(0),
  // The region's own terrain enum; every Map in it must draw terrain from here.
  terrainTypes: z.array(z.string().min(1)).min(1),
})

export type Region = z.infer<typeof regionSchema>

// ─── Map ──────────────────────────────────────────────────────────────────────

const sizeSchema = z.object({
  cols: z.number().int().min(MAP_SIZE_MIN).max(MAP_SIZE_MAX),
  rows: z.number().int().min(MAP_SIZE_MIN).max(MAP_SIZE_MAX),
})

// A tile object: `{ col, row, kind, hp? }`. `hp` is optional — present marks a
// destructible structure (power center, tower), absent an inert object.
const objectSchema = z.object({
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  kind: z.string().min(1),
  hp: z.number().int().min(1).optional(),
})

// Tile coordinate, position within the map's size enforced by the map refine.
const colRowSchema = z.object({
  col: z.number().int().min(0),
  row: z.number().int().min(0),
})

// "col,row" tile key.
const tileKeySchema = z.string().regex(/^\d+,\d+$/)

function parseTileKey(key: string): { col: number; row: number } {
  const [col, row] = key.split(',').map(Number)
  return { col, row }
}

// Structural map schema: grid dimensions, bounds, and the playerSpawnZone-vs-PC
// rule. Terrain values are validated against the parent region's `terrainTypes`
// by `mapSchemaForTerrain` — the structural schema alone treats them as strings.
export const mapSchema = z
  .object({
    id: z.string().min(1),
    regionId: z.string().min(1),
    name: z.string().min(1),
    order: z.number().int().min(0),
    size: sizeSchema,
    terrain: z.array(z.array(z.string().min(1))),
    objects: z.array(objectSchema),
    enemySpawnZone: z.array(tileKeySchema),
    playerSpawnZone: z.array(tileKeySchema),
    // Per-archetype default placements (kept as map content so placement is
    // unchanged from the hardcoded board). Tiles must be inside the map.
    pcStartTiles: z.record(z.string(), colRowSchema),
  })
  .superRefine((map, ctx) => {
    const { cols, rows } = map.size
    const inBounds = (col: number, row: number) =>
      col >= 0 && col < cols && row >= 0 && row < rows

    // Terrain grid is exactly rows × cols.
    if (map.terrain.length !== rows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `terrain must have ${rows} rows (size.rows), got ${map.terrain.length}`,
        path: ['terrain'],
      })
    }
    map.terrain.forEach((rowArr, r) => {
      if (rowArr.length !== cols) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `terrain row ${r} must have ${cols} cols (size.cols), got ${rowArr.length}`,
          path: ['terrain', r],
        })
      }
    })

    // Objects in bounds.
    map.objects.forEach((obj, i) => {
      if (!inBounds(obj.col, obj.row)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `object ${i} (${obj.col},${obj.row}) is out of bounds`,
          path: ['objects', i],
        })
      }
    })

    // Spawn-zone tiles in bounds.
    const checkZone = (zone: string[], field: 'enemySpawnZone' | 'playerSpawnZone') => {
      zone.forEach((key, i) => {
        const { col, row } = parseTileKey(key)
        if (!inBounds(col, row)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field}[${i}] tile ${key} is out of bounds`,
            path: [field, i],
          })
        }
      })
    }
    checkZone(map.enemySpawnZone, 'enemySpawnZone')
    checkZone(map.playerSpawnZone, 'playerSpawnZone')

    // PC start tiles in bounds.
    for (const [archetype, tile] of Object.entries(map.pcStartTiles)) {
      if (!inBounds(tile.col, tile.row)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `pcStartTiles.${archetype} (${tile.col},${tile.row}) is out of bounds`,
          path: ['pcStartTiles', archetype],
        })
      }
    }

    // playerSpawnZone must give real placement choice: more tiles than PCs.
    const pcCount = Object.keys(map.pcStartTiles).length
    if (map.playerSpawnZone.length <= pcCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `playerSpawnZone (${map.playerSpawnZone.length}) must exceed the player-unit count (${pcCount})`,
        path: ['playerSpawnZone'],
      })
    }
  })

export type GameMap = z.infer<typeof mapSchema>

// Map schema bound to a region's terrain enum: adds the rule that every terrain
// value must be one of the region's `terrainTypes`. The persistence/seed path
// validates a map against this once the parent region is known.
export function mapSchemaForTerrain(terrainTypes: string[]) {
  const allowed = new Set(terrainTypes)
  return mapSchema.superRefine((map, ctx) => {
    map.terrain.forEach((rowArr, r) => {
      rowArr.forEach((value, c) => {
        if (!allowed.has(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `terrain[${r}][${c}] value "${value}" is not in the region's terrainTypes`,
            path: ['terrain', r, c],
          })
        }
      })
    })
  })
}

// ─── Encounter ──────────────────────────────────────────────────────────────

// Wave start trigger — a single atomic tagged object. Composite triggers are a
// reserved future type; the discriminated union rejects anything else.
const startTriggerSchema = z.discriminatedUnion('trigger', [
  z.object({ trigger: z.literal('immediate') }),
  z.object({ trigger: z.literal('after-prev-cleared') }),
  z.object({ trigger: z.literal('after-turns'), turns: z.number().int().min(1) }),
])

const enemyEntrySchema = z.object({
  archetype: z.string().min(1),
  count: z.number().int().min(1),
})

const waveSchema = z.object({
  index: z.number().int().min(0),
  start: startTriggerSchema,
  enemies: z.array(enemyEntrySchema).min(1),
})

// Composite condition types are reserved for the future and rejected for now.
const COMPOSITE_CONDITION_TYPES = new Set(['all-of', 'any-of'])

// A single atomic condition: a tagged `{ type, …params }` object. Composite /
// nested boolean conditions are rejected (no `all-of`/`any-of`, no nested
// `conditions` list).
const conditionSchema = z
  .object({ type: z.string().min(1) })
  .passthrough()
  .superRefine((cond, ctx) => {
    if (COMPOSITE_CONDITION_TYPES.has(cond.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `composite condition type "${cond.type}" is not supported`,
        path: ['type'],
      })
    }
    if ('conditions' in cond) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'nested/composite conditions are not supported',
        path: ['conditions'],
      })
    }
  })

export const encounterSchema = z.object({
  id: z.string().min(1),
  mapId: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().min(0),
  waves: z.array(waveSchema).min(1),
  win: z.array(conditionSchema),
  lose: z.array(conditionSchema),
  achievements: z.array(conditionSchema),
})

export type Encounter = z.infer<typeof encounterSchema>

// A full bundled content tree (one region, one map, one encounter).
export interface BundledContent {
  region: Region
  map: GameMap
  encounter: Encounter
}

// ─── Bundled seed — a faithful 1:1 port of the current 16×8 board ──────────────
//
// terrain / objects extracted verbatim from `INITIAL_MAP`; `enemySpawnZone` from
// `SPAWNER_POSITIONS`; `playerSpawnZone` from the authored `SPAWN_ZONE_LAYOUT`;
// `pcStartTiles` from `PC_START_TILES`. The seed region's `terrainTypes` is the
// former global terrain set from `types.ts`.

const SEED_TERRAIN: string[][] = [
  ['plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone'],
  ['forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains'],
  ['water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'plains', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest'],
  ['stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water'],
  ['plains', 'forest', 'water', 'stone', 'plains', 'plains', 'water', 'stone', 'plains', 'forest', 'water', 'plains', 'plains', 'forest', 'water', 'stone'],
  ['forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains'],
  ['water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'plains', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest'],
  ['stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water', 'stone', 'plains', 'forest', 'water'],
]

export const BUNDLED_MAP: BundledContent = {
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
    terrain: SEED_TERRAIN,
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
    pcStartTiles: {
      melee: { col: 4, row: 5 },
      ranger: { col: 6, row: 5 },
      'magic-user': { col: 10, row: 5 },
      rogue: { col: 13, row: 5 },
    },
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
        // Today's spawn manifest: NPCs seeded at the five enemy spawner tiles —
        // three short-range, two long-range.
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
