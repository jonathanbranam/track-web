import { describe, it, expect } from 'vitest'
import { initialState, computeNpcPlans } from './npc'
import type { GameState } from './types'

// A player-phase state with a freshly computed full plan to diff granular
// re-plans against. initialState already seeds npcPlans; we recompute for clarity.
function planned(): GameState {
  const base = initialState()
  return { ...base, phase: 'player', npcPlans: computeNpcPlans(base) }
}

function npcIds(state: GameState): string[] {
  return state.units.filter((u) => u.kind === 'npc').map((u) => u.id)
}

describe('computeNpcPlans granular re-plan', () => {
  it('no-arg call equals re-planning every NPC', () => {
    const s = planned()
    const full = computeNpcPlans(s)
    const all = new Set(npcIds(s))
    expect(computeNpcPlans({ ...s, npcPlans: full }, all)).toEqual(full)
  })

  it('reuses the exact prior action object for NPCs not in the replan set', () => {
    const s = planned()
    const full = s.npcPlans
    const ids = npcIds(s)
    const target = ids[0]
    const partial = computeNpcPlans(s, new Set([target]))

    // Result is the same length/shape as the full plan...
    expect(partial.length).toBe(full.length)
    // ...and every NOT-replanned unit's action is the same object (reused, not recomputed).
    for (const action of partial) {
      if (action.unitId !== target) {
        const prior = full.find((a) => a.unitId === action.unitId)
        expect(action).toBe(prior)
      }
    }
  })

  it('re-planning an unchanged unit reproduces its full-plan action (same board)', () => {
    const s = planned()
    const full = s.npcPlans
    const ids = npcIds(s)
    // A later unit in the order: it must path around earlier units' planned
    // destinations and later units' current positions. With no def change its
    // re-plan must match what the full planner gives it.
    const last = ids[ids.length - 1]
    const partial = computeNpcPlans(s, new Set([last]))
    const got = partial.find((a) => a.unitId === last)
    const want = full.find((a) => a.unitId === last)
    expect(got).toEqual(want)
  })

  it('PC-only replan sets leave all NPC actions reused verbatim', () => {
    const s = planned()
    const partial = computeNpcPlans(s, new Set<string>())
    // Empty replan set → every NPC reuses its prior action.
    expect(partial).toEqual(s.npcPlans)
    for (const action of partial) {
      expect(action).toBe(s.npcPlans.find((a) => a.unitId === action.unitId))
    }
  })
})
