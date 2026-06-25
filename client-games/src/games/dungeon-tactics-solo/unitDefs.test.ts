import { describe, it, expect } from 'vitest'
import { unitDefs } from './unitDefs'
import { BUNDLED_MAP } from './bundledMap'
import type { PcType, NpcType } from './types'

const LINE_TO_EDGE = BUNDLED_MAP.map.size.cols - 1

// Each archetype's data must reproduce the pre-refactor hardcoded behavior:
// maxHp 3 everywhere; move range 4 for melee/rogue and 3 otherwise; melee deals
// 2 damage and everyone else 1; footprint shapes/ranges per design.md.
const EXPECTED: Record<PcType | NpcType, {
  maxHp: number
  range: number
  damage: number
  shape: 'single' | 'line' | 'plus'
  penetration: 'none' | 'stop_at_first'
  minRange: number
  maxRange: number
}> = {
  melee:        { maxHp: 3, range: 4, damage: 2, shape: 'single', penetration: 'none',          minRange: 1, maxRange: 1 },
  rogue:        { maxHp: 3, range: 4, damage: 1, shape: 'single', penetration: 'none',          minRange: 1, maxRange: 1 },
  ranger:       { maxHp: 3, range: 3, damage: 1, shape: 'line',   penetration: 'stop_at_first', minRange: 2, maxRange: LINE_TO_EDGE },
  'magic-user': { maxHp: 3, range: 3, damage: 1, shape: 'plus',   penetration: 'none',          minRange: 2, maxRange: 2 },
  'short-range':{ maxHp: 3, range: 3, damage: 1, shape: 'single', penetration: 'stop_at_first', minRange: 1, maxRange: 2 },
  'long-range': { maxHp: 3, range: 3, damage: 1, shape: 'single', penetration: 'stop_at_first', minRange: 2, maxRange: LINE_TO_EDGE },
}

describe('unitDefs', () => {
  for (const [type, exp] of Object.entries(EXPECTED)) {
    const def = unitDefs[type as PcType | NpcType]
    describe(type, () => {
      it('has the expected max HP and move range', () => {
        expect(def.maxHp).toBe(exp.maxHp)
        expect(def.movement.range).toBe(exp.range)
      })
      it('has the expected attack damage', () => {
        expect(def.attack.damage).toBe(exp.damage)
      })
      it('has the expected footprint shape, penetration, and ranges', () => {
        expect(def.attack.propagation.shape).toBe(exp.shape)
        expect(def.attack.propagation.penetration).toBe(exp.penetration)
        expect(def.attack.targeting.minRange).toBe(exp.minRange)
        expect(def.attack.targeting.maxRange).toBe(exp.maxRange)
        expect(def.attack.targeting.mode).toBe('direction')
        expect(def.attack.targeting.arc).toBe('cardinal')
      })
    })
  }
})
