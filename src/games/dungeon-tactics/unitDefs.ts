import { z } from 'zod'

// Server-side authority for the dungeon-tactics `UnitDef` shape.
//
// This Zod schema mirrors the Stage 1 client TS interface in
// `client-games/src/games/dungeon-tactics-solo/types.ts`. It is the runtime
// validation guard for every persisted write and the seam that keeps the client
// and server shapes in sync. The numeric bounds are now authoritative — they
// mirror the in-app editor's clamps exactly, so the schema (not just the UI)
// rejects any out-of-range or inverted-range write. Enum-constrained fields
// reject anything outside the known set.
//
// SYNC NOTE: these bounds duplicate the editor's clamp constants in
// `client-games/src/games/dungeon-tactics-solo/defStore.ts` (the two live in
// separate npm workspaces and cannot share a module). RANGE_MAX / move max = 22
// is the 16×8 board's max Manhattan span ((16-1)+(8-1)). Keep both copies in step.
// `BUNDLED_UNIT_DEFS` below is likewise an intentional copy of the bundled
// defaults in `client-games/src/games/dungeon-tactics-solo/unitDefs.ts`. When you
// change a default there, mirror it here. `unitDefs.test.ts` asserts every default
// satisfies this schema so an interface/Zod drift fails fast.

export const unitDefSchema = z
  .object({
    maxHp: z.number().int().min(1).max(20),
    movement: z.object({
      range: z.number().int().min(0).max(22),
    }),
    attack: z.object({
      damage: z.number().int().min(0).max(15),
      targeting: z.object({
        mode: z.enum(['direction']),
        arc: z.enum(['cardinal']),
        minRange: z.number().int().min(0).max(22),
        maxRange: z.number().int().min(1).max(22),
      }),
      propagation: z.object({
        shape: z.enum(['single', 'line', 'plus']),
        penetration: z.enum(['none', 'stop_at_first']),
      }),
    }),
  })
  .superRefine((def, ctx) => {
    if (def.attack.targeting.maxRange < def.attack.targeting.minRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxRange must be greater than or equal to minRange',
        path: ['attack', 'targeting', 'maxRange'],
      })
    }
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
