import { z } from 'zod'

// Server-side authority for the dungeon-tactics `UnitDef` shape.
//
// This Zod schema mirrors the Stage 1 client TS interface in
// `client-games/src/games/dungeon-tactics-solo/types.ts`. It is the runtime
// validation guard for every persisted write and the seam that keeps the client
// and server shapes in sync. Bounds are deliberately generous (the in-app editor
// applies tighter UX clamps) — they only reject values that would corrupt the
// store. Enum-constrained fields reject anything outside the known set.
//
// SYNC NOTE: `BUNDLED_UNIT_DEFS` below is an intentional copy of the bundled
// defaults in `client-games/src/games/dungeon-tactics-solo/unitDefs.ts` (the two
// live in separate npm workspaces and cannot share a module). When you change a
// default there, mirror it here. `unitDefs.test.ts` asserts every default
// satisfies this schema so an interface/Zod drift fails fast.

export const unitDefSchema = z.object({
  maxHp: z.number().int().min(1).max(99),
  movement: z.object({
    range: z.number().int().min(0).max(99),
  }),
  attack: z.object({
    damage: z.number().int().min(0).max(99),
    targeting: z.object({
      mode: z.enum(['direction']),
      arc: z.enum(['cardinal']),
      minRange: z.number().int().min(0).max(99),
      maxRange: z.number().int().min(0).max(99),
    }),
    propagation: z.object({
      shape: z.enum(['single', 'line', 'plus']),
      penetration: z.enum(['none', 'stop_at_first']),
    }),
  }),
})

export type UnitDef = z.infer<typeof unitDefSchema>

// `line` footprints extend to the board edge; their `maxRange` is the longest
// cardinal reach on the dungeon-tactics board (`GRID_COLS - 1`, GRID_COLS = 16).
const LINE_TO_EDGE = 15

export const DUNGEON_TACTICS_SLUG = 'dungeon-tactics-solo'

// Mirror of the client bundled archetype table (see SYNC NOTE above). Seeds the
// `default` scenario on an empty store and is the on-failure fallback client-side.
export const BUNDLED_UNIT_DEFS: Record<string, UnitDef> = {
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
