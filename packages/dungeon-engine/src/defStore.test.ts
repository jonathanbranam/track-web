import { describe, it, expect, afterEach } from 'vitest'
import {
  clampDef,
  withMinRange,
  withMaxRange,
  applyLoaded,
  diffDefs,
  getAllDefs,
  getDef,
  getMaxHp,
  getMoveRange,
  setDef,
  reset,
} from './defStore'
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

// The apply/read half of the store — the seam a host drives after it has fetched
// (or built) a def map. Fetching, falling back, and remembering the active
// scenario are the host's job and are covered by the game client's
// `defStoreLoader.test.ts`.
describe('applyLoaded', () => {
  afterEach(() => reset())

  it('overlays the supplied defs onto the bundled table', () => {
    applyLoaded({ melee: { ...unitDefs.melee, maxHp: 17 } })
    expect(getMaxHp('melee')).toBe(17)
  })

  it('leaves archetypes the map omits at their bundled defaults', () => {
    applyLoaded({ melee: { ...unitDefs.melee, maxHp: 17 } })
    expect(getMaxHp('ranger')).toBe(unitDefs.ranger.maxHp)
    expect(getMoveRange('ranger')).toBe(unitDefs.ranger.movement.range)
  })

  it('discards a previous apply rather than merging with it', () => {
    applyLoaded({ melee: { ...unitDefs.melee, maxHp: 17 } })
    applyLoaded({ ranger: { ...unitDefs.ranger, maxHp: 9 } })
    expect(getMaxHp('melee')).toBe(unitDefs.melee.maxHp)
    expect(getMaxHp('ranger')).toBe(9)
  })

  it('reset restores every archetype to its bundled default', () => {
    applyLoaded({ melee: { ...unitDefs.melee, maxHp: 17 } })
    reset()
    expect(getAllDefs()).toEqual(unitDefs)
  })
})

describe('diffDefs', () => {
  afterEach(() => reset())

  it('reports only the archetypes whose def differs from the store', () => {
    const incoming = getAllDefs()
    incoming.melee = { ...incoming.melee, maxHp: 19 }
    expect(diffDefs(incoming)).toEqual(new Set(['melee']))
  })

  it('reports nothing when the incoming map matches the store', () => {
    expect(diffDefs(getAllDefs()).size).toBe(0)
  })

  it('sees a write-through edit made with setDef', () => {
    const snapshot = getAllDefs()
    setDef('rogue', { ...getDef('rogue'), maxHp: 12 })
    expect(getMaxHp('rogue')).toBe(12)
    expect(diffDefs(snapshot)).toEqual(new Set(['rogue']))
  })
})
