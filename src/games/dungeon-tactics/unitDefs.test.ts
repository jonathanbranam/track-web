import { describe, it, expect } from 'vitest'
import { unitDefSchema, BUNDLED_UNIT_DEFS } from './unitDefs'

// Guards against drift between the TS `UnitDef` interface (compile-time) and the
// Zod schema (runtime): every bundled archetype default must validate, so a shape
// change that breaks one without the other fails here.
describe('dungeon-tactics unit defs', () => {
  for (const [archetype, def] of Object.entries(BUNDLED_UNIT_DEFS)) {
    it(`bundled default for "${archetype}" satisfies the UnitDef schema`, () => {
      const result = unitDefSchema.safeParse(def)
      expect(result.success).toBe(true)
    })
  }

  it('rejects a definition with maxHp below 1', () => {
    const bad = { ...BUNDLED_UNIT_DEFS.melee, maxHp: 0 }
    expect(unitDefSchema.safeParse(bad).success).toBe(false)
  })

  // Per-field bound rejections (schema is now authoritative, mirroring the editor).
  const withTargeting = (over: Record<string, number>) => ({
    ...BUNDLED_UNIT_DEFS.melee,
    attack: {
      ...BUNDLED_UNIT_DEFS.melee.attack,
      targeting: { ...BUNDLED_UNIT_DEFS.melee.attack.targeting, ...over },
    },
  })

  const outOfRange: Array<[string, Record<string, unknown>]> = [
    ['maxHp of 0', { ...BUNDLED_UNIT_DEFS.melee, maxHp: 0 }],
    ['maxHp of 25', { ...BUNDLED_UNIT_DEFS.melee, maxHp: 25 }],
    ['damage of 40', { ...BUNDLED_UNIT_DEFS.melee, attack: { ...BUNDLED_UNIT_DEFS.melee.attack, damage: 40 } }],
    ['movement.range of 30', { ...BUNDLED_UNIT_DEFS.melee, movement: { range: 30 } }],
    ['maxRange of 0', withTargeting({ maxRange: 0 })],
  ]
  for (const [label, bad] of outOfRange) {
    it(`rejects ${label}`, () => {
      expect(unitDefSchema.safeParse(bad).success).toBe(false)
    })
  }

  it('rejects an inverted range pair (maxRange < minRange)', () => {
    const bad = withTargeting({ minRange: 5, maxRange: 3 })
    expect(unitDefSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts in-range upper-bound values', () => {
    const ok = { ...withTargeting({ minRange: 0, maxRange: 22 }), maxHp: 20, movement: { range: 22 } }
    ok.attack = { ...ok.attack, damage: 15 }
    expect(unitDefSchema.safeParse(ok).success).toBe(true)
  })

  it('rejects an unknown propagation shape', () => {
    const bad = {
      ...BUNDLED_UNIT_DEFS.melee,
      attack: { ...BUNDLED_UNIT_DEFS.melee.attack, propagation: { shape: 'radius', penetration: 'none' } },
    }
    expect(unitDefSchema.safeParse(bad).success).toBe(false)
  })
})
