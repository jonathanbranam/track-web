import { describe, it, expect } from 'vitest'
import { clampDef, withMinRange, withMaxRange } from './defStore'
import { unitDefs } from './unitDefs'
import type { UnitDef } from './types'

// A def with explicit out-of-range numerics, built off a bundled archetype so the
// enum fields stay valid.
function defWith(over: {
  maxHp?: number
  range?: number
  damage?: number
  minRange?: number
  maxRange?: number
}): UnitDef {
  const base = unitDefs.melee
  return {
    maxHp: over.maxHp ?? base.maxHp,
    movement: { range: over.range ?? base.movement.range },
    attack: {
      damage: over.damage ?? base.attack.damage,
      targeting: {
        ...base.attack.targeting,
        minRange: over.minRange ?? base.attack.targeting.minRange,
        maxRange: over.maxRange ?? base.attack.targeting.maxRange,
      },
      propagation: { ...base.attack.propagation },
    },
  }
}

describe('clampDef', () => {
  it('clamps each field to the new ranges', () => {
    const out = clampDef(defWith({ maxHp: -5, range: 30, damage: 40, minRange: -2, maxRange: 99 }))
    expect(out.maxHp).toBe(1) // [1,20] floor
    expect(out.movement.range).toBe(22) // [0,22] ceil
    expect(out.attack.damage).toBe(15) // [0,15] ceil
    expect(out.attack.targeting.minRange).toBe(0) // [0,22] floor
    expect(out.attack.targeting.maxRange).toBe(22) // [1,22] ceil
  })

  it('clamps over-cap maxHp down to 20 and zero maxRange up to 1', () => {
    const out = clampDef(defWith({ maxHp: 25, minRange: 0, maxRange: 0 }))
    expect(out.maxHp).toBe(20)
    expect(out.attack.targeting.maxRange).toBe(1)
  })

  it('never yields maxRange < minRange (defensive guard)', () => {
    const out = clampDef(defWith({ minRange: 8, maxRange: 3 }))
    expect(out.attack.targeting.maxRange).toBe(8)
    expect(out.attack.targeting.minRange).toBe(8)
  })

  it('rounds before clamping', () => {
    const out = clampDef(defWith({ maxHp: 3.7 }))
    expect(out.maxHp).toBe(4)
  })
})

describe('range reconciliation', () => {
  it('raising min above max pulls max up to match', () => {
    const out = withMinRange(defWith({ minRange: 1, maxRange: 3 }), 5)
    expect(out.attack.targeting.minRange).toBe(5)
    expect(out.attack.targeting.maxRange).toBe(5)
  })

  it('lowering max below min pulls min down to match', () => {
    const out = withMaxRange(defWith({ minRange: 6, maxRange: 8 }), 2)
    expect(out.attack.targeting.maxRange).toBe(2)
    expect(out.attack.targeting.minRange).toBe(2)
  })

  it('leaves an already-ordered pair untouched when editing min', () => {
    const out = withMinRange(defWith({ minRange: 2, maxRange: 8 }), 4)
    expect(out.attack.targeting.minRange).toBe(4)
    expect(out.attack.targeting.maxRange).toBe(8)
  })

  it('leaves an already-ordered pair untouched when editing max', () => {
    const out = withMaxRange(defWith({ minRange: 2, maxRange: 8 }), 6)
    expect(out.attack.targeting.maxRange).toBe(6)
    expect(out.attack.targeting.minRange).toBe(2)
  })
})
