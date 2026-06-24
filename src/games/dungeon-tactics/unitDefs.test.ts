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

  it('rejects an unknown propagation shape', () => {
    const bad = {
      ...BUNDLED_UNIT_DEFS.melee,
      attack: { ...BUNDLED_UNIT_DEFS.melee.attack, propagation: { shape: 'radius', penetration: 'none' } },
    }
    expect(unitDefSchema.safeParse(bad).success).toBe(false)
  })
})
