import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  advanceNpc,
  commitNpcTurn,
  unplannedNpcs,
  plannedTelegraph,
  nextAction,
  advance,
  amendTelegraph,
  plannableAttacks,
} from './sequencer'
import { initialState, computeNpcTurns, endRound } from './npc'
import { commitAction, threatTiles } from './actions'
import { getDef, reset as resetDefs } from './defStore'
import { getEngineMode, setEngineMode } from './engine-mode'
import type { GameState, NpcType, PcType, Unit } from './types'

// A player-phase-shaped board holding only the units a test places, seated on
// the seed board's real terrain and structures (power centres at (8,3), (5,4),
// (11,4), (2,6), (14,6), a tower at (8,6)) so the AI's own targeting runs for
// real. Defaults to `npc-move`, since that is where planning happens; tests
// that need another phase pass one. Mirrors `actions.test.ts`'s `board()`.
type Seed = Partial<Unit> & { id: string; kind: Unit['kind']; unitType: PcType | NpcType; col: number; row: number }

function board(units: Seed[], phase: GameState['phase'] = 'npc-move'): GameState {
  const s = initialState()
  return {
    ...s,
    phase,
    units: units.map((u) => ({ hp: getDef(u.unitType).maxHp, ...u })) as Unit[],
    npcPlans: [],
    npcPlannedThisRound: [],
    npcPlansResolved: [],
  }
}

beforeEach(() => {
  resetDefs()
})

// ─── 4.1 — the three planning sources agree ────────────────────────────────────

describe('planning — the three sources', () => {
  it('produce the same result for the same decision: movement applied, telegraph from the post-move position, enemy recorded as planned', () => {
    // Three tiles above the (5,4) power-center, out of its attack range (max 2):
    // the AI closes to (5,3) and telegraphs the structure attack from there —
    // the same fixture `npc.test.ts` uses for this archetype.
    const base = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 1 }])

    const viaAi = advanceNpc(base, 'npc-0')
    const viaHost = commitNpcTurn(base, 'npc-0', { kind: 'move', toCol: 5, toRow: 3 }, { col: 5, row: 4 })
    const viaAdvance = advance(base)

    expect(viaAi.ok).toBe(true)
    expect(viaHost.ok).toBe(true)
    expect(viaAdvance.ok).toBe(true)
    if (!viaAi.ok || !viaHost.ok || !viaAdvance.ok) return

    for (const result of [viaAi.state, viaHost.state, viaAdvance.state]) {
      expect(result.units.find((u) => u.id === 'npc-0')).toMatchObject({ col: 5, row: 3 })
      expect(result.npcPlans).toEqual([{ kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 }])
      expect(result.npcPlannedThisRound).toEqual(['npc-0'])
    }
  })

  it('accepts a host decision the AI would never make', () => {
    // The AI would close on the power-center; a host instead holds the enemy
    // in place with no attack. Nothing about the AI's own preference makes
    // this illegal.
    const base = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 1 }])
    const result = commitNpcTurn(base, 'npc-0', { kind: 'stay' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.units.find((u) => u.id === 'npc-0')).toMatchObject({ col: 5, row: 1 })
    expect(result.state.npcPlans).toEqual([])
    expect(result.state.npcPlannedThisRound).toEqual(['npc-0'])
  })
})

// ─── 4.2 — planning refusals ────────────────────────────────────────────────────

describe('planning refusals', () => {
  it('refuses to plan an enemy already planned this round, and changes nothing', () => {
    const base = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    const first = advanceNpc(base, 'npc-0')
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = advanceNpc(first.state, 'npc-0')
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.reason).toMatch(/already been planned/)
    expect(second.reason).toMatch(/short-range/)

    const thirdViaHost = commitNpcTurn(first.state, 'npc-0', { kind: 'stay' })
    expect(thirdViaHost.ok).toBe(false)
    if (thirdViaHost.ok) return
    expect(thirdViaHost.reason).toMatch(/already been planned/)
  })

  it('refuses an illegal move beyond the enemy\'s range, and changes nothing', () => {
    const base = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    // short-range has move range 3; (4,0) is 5 tiles up a clear column.
    const result = commitNpcTurn(base, 'npc-0', { kind: 'move', toCol: 4, toRow: 0 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not a legal move/)
    expect(base.npcPlannedThisRound).toEqual([])
    expect(base.units.find((u) => u.id === 'npc-0')).toMatchObject({ col: 4, row: 5 })
  })

  it('refuses an attack not reachable from the post-move position, and changes nothing', () => {
    const base = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    // Staying at (4,5): short-range's band tops out at 2 tiles; (4,0) is 5 away.
    const result = commitNpcTurn(base, 'npc-0', { kind: 'stay' }, { col: 4, row: 0 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not a legal attack target/)
    expect(base.npcPlannedThisRound).toEqual([])
    expect(base.npcPlans).toEqual([])
  })
})

// ─── 4.3 — an all-stay round ────────────────────────────────────────────────────

describe('an all-stay round', () => {
  it('is accepted — the bench must be able to make every enemy hold', () => {
    const base = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'npc-1', kind: 'npc', unitType: 'long-range', col: 4, row: 6 },
    ])
    const afterA = commitNpcTurn(base, 'npc-0', { kind: 'stay' })
    expect(afterA.ok).toBe(true)
    if (!afterA.ok) return
    const afterB = commitNpcTurn(afterA.state, 'npc-1', { kind: 'stay' })
    expect(afterB.ok).toBe(true)
    if (!afterB.ok) return

    expect(afterB.state.npcPlannedThisRound.slice().sort()).toEqual(['npc-0', 'npc-1'])
    expect(afterB.state.npcPlans).toEqual([])
    expect(afterB.state.units.find((u) => u.id === 'npc-0')).toMatchObject({ col: 4, row: 5 })
    expect(afterB.state.units.find((u) => u.id === 'npc-1')).toMatchObject({ col: 4, row: 6 })
    expect(unplannedNpcs(afterB.state)).toEqual([])
  })
})

// ─── 4.4 — planning order is resolution order ──────────────────────────────────

describe('turn order is the order enemies are planned in', () => {
  it('resolves telegraphs in planning order, not default unit order', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 4 }, // adjacent to (5,4)
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 1, row: 6 }, // adjacent to (2,6)
    ])
    // Plan npc-1 first, npc-0 second — the reverse of default unit order.
    const first = advanceNpc(s, 'npc-1')
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = advanceNpc(first.state, 'npc-0')
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.state.npcPlans.map((p) => p.unitId)).toEqual(['npc-1', 'npc-0'])

    const attackState: GameState = { ...second.state, phase: 'npc-attack' }
    const stepA = advance(attackState)
    expect(stepA.ok).toBe(true)
    if (!stepA.ok) return
    expect(stepA.step).toMatchObject({ kind: 'resolve-telegraph', unitId: 'npc-1' })

    const stepB = advance(stepA.state)
    expect(stepB.ok).toBe(true)
    if (!stepB.ok) return
    expect(stepB.step).toMatchObject({ kind: 'resolve-telegraph', unitId: 'npc-0' })
  })

  it('an enemy planned after another accounts for where it now stands', () => {
    // Planned alone, npc-1 would path all the way to (4,4) — the nearest free
    // tile adjacent to the (5,4) power-center — and telegraph an attack on it.
    const alone = board([{ id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 1 }])
    const aloneResult = advanceNpc(alone, 'npc-1')
    expect(aloneResult.ok).toBe(true)
    if (!aloneResult.ok) return
    expect(aloneResult.state.units.find((u) => u.id === 'npc-1')).toMatchObject({ col: 4, row: 4 })

    // With npc-0 planned first into that same tile, npc-1's own plan — computed
    // against the board as it now stands — stops one tile short instead of
    // landing on top of it, and has nothing to telegraph.
    const together = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 2 },
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 1 },
    ])
    const first = advanceNpc(together, 'npc-0')
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.state.units.find((u) => u.id === 'npc-0')).toMatchObject({ col: 4, row: 4 })

    const second = advanceNpc(first.state, 'npc-1')
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.state.units.find((u) => u.id === 'npc-1')).toMatchObject({ col: 4, row: 3 })
    expect(plannedTelegraph(second.state, 'npc-1')).toBeNull()
  })
})

// ─── 4.5 — execution ─────────────────────────────────────────────────────────

describe('advance — execution', () => {
  it('does not leave npc-move while a living enemy remains unplanned', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 6 },
    ])
    const first = commitNpcTurn(s, 'npc-0', { kind: 'stay' })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const result = advance(first.state)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.step).toMatchObject({ kind: 'plan-enemy', unitId: 'npc-1' })
    expect(result.state.phase).toBe('npc-move')
  })

  it('skips a telegraph whose owner died before resolution, and resolves the rest normally', () => {
    // Constructed directly at the resolution point: A and C are alive and
    // telegraphed against real structures; B was planned but has since died
    // (removed from `units`, exactly as a PC's attack during the player phase
    // would leave it) — its telegraph is still recorded in `npcPlans`.
    const s: GameState = {
      ...board([
        { id: 'npc-a', kind: 'npc', unitType: 'short-range', col: 0, row: 0 },
        { id: 'npc-c', kind: 'npc', unitType: 'short-range', col: 0, row: 1 },
      ], 'npc-attack'),
      npcPlans: [
        { kind: 'attack', unitId: 'npc-a', targetCol: 5, targetRow: 4 }, // power-center
        { kind: 'attack', unitId: 'npc-b', targetCol: 2, targetRow: 6 }, // power-center; npc-b is dead
        { kind: 'attack', unitId: 'npc-c', targetCol: 11, targetRow: 4 }, // power-center
      ],
      npcPlannedThisRound: ['npc-a', 'npc-b', 'npc-c'],
    }

    const r1 = advance(s)
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    expect(r1.step).toMatchObject({ kind: 'resolve-telegraph', unitId: 'npc-a' })
    expect(r1.state.cells[4][5].structureHp).toBe(2) // damaged
    expect(r1.state.npcPlansResolved).toEqual(['npc-a'])

    const r2 = advance(r1.state)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.step).toMatchObject({ kind: 'skip-telegraph', unitId: 'npc-b' })
    expect(r2.state.cells[6][2].structureHp).toBe(3) // unchanged — no attacker landed
    expect(r2.state.npcPlansResolved).toEqual(['npc-a', 'npc-b'])

    const r3 = advance(r2.state)
    expect(r3.ok).toBe(true)
    if (!r3.ok) return
    expect(r3.step).toMatchObject({ kind: 'resolve-telegraph', unitId: 'npc-c' })
    expect(r3.state.cells[4][11].structureHp).toBe(2) // damaged
    expect(r3.state.npcPlansResolved).toEqual(['npc-a', 'npc-b', 'npc-c'])
  })

  it('advances through a full round: plan, transition to player, resolve, chain into the next round', () => {
    let state: GameState = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 4 }, // adjacent to (5,4)
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 1, row: 6 }, // adjacent to (2,6)
    ])

    let r = advance(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.step).toMatchObject({ kind: 'plan-enemy', unitId: 'npc-0' })
    state = r.state

    r = advance(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.step).toMatchObject({ kind: 'plan-enemy', unitId: 'npc-1' })
    state = r.state

    r = advance(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.step).toEqual({ kind: 'phase-transition', from: 'npc-move', to: 'player' })
    expect(r.state.phase).toBe('player')
    state = r.state

    // Nothing for the engine to advance during the player phase.
    const duringPlayer = advance(state)
    expect(duringPlayer.ok).toBe(false)

    // The player phase ends by a host's own hand — unchanged by this work.
    state = { ...state, phase: 'npc-attack' }

    r = advance(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.step).toMatchObject({ kind: 'resolve-telegraph', unitId: 'npc-0' })
    state = r.state

    r = advance(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.step).toMatchObject({ kind: 'resolve-telegraph', unitId: 'npc-1' })
    state = r.state

    r = advance(state)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.step).toEqual({ kind: 'phase-transition', from: 'npc-attack', to: 'npc-move' })
    expect(r.state.phase).toBe('npc-move')
    expect(r.state.npcPlans).toEqual([])
    expect(r.state.npcPlannedThisRound).toEqual([])
    expect(r.state.npcPlansResolved).toEqual([])
  })
})

// ─── 4.6 — queries ───────────────────────────────────────────────────────────

describe('queries', () => {
  it('nextAction matches what advance then does, and querying repeatedly changes nothing', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 5, row: 1 }])
    const first = nextAction(s)
    const second = nextAction(s)
    expect(first).toEqual(second)
    // Querying is read-only.
    expect(s.units.find((u) => u.id === 'npc-0')).toMatchObject({ col: 5, row: 1 })
    expect(s.npcPlannedThisRound).toEqual([])

    const result = advance(s)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.step).toEqual(first)
  })

  it('unplannedNpcs reports exactly the enemies not yet planned', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 6 },
    ])
    expect(unplannedNpcs(s).slice().sort()).toEqual(['npc-0', 'npc-1'])
    const after = commitNpcTurn(s, 'npc-0', { kind: 'stay' })
    expect(after.ok).toBe(true)
    if (!after.ok) return
    expect(unplannedNpcs(after.state)).toEqual(['npc-1'])
  })

  it('plannedTelegraph reports the locked telegraph, or null when there is none', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 4 }])
    expect(plannedTelegraph(s, 'npc-0')).toBeNull()
    const after = advanceNpc(s, 'npc-0')
    expect(after.ok).toBe(true)
    if (!after.ok) return
    expect(plannedTelegraph(after.state, 'npc-0')).toEqual({
      kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4,
    })
  })
})

// ─── 4.7 / 4.8 — engine mode and amendment ─────────────────────────────────────

describe('amendTelegraph — bench-only', () => {
  afterEach(() => setEngineMode('game'))

  function plannedState(): GameState {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 4 }])
    const planned = advanceNpc(s, 'npc-0')
    if (!planned.ok) throw new Error('setup: advanceNpc failed')
    return planned.state
  }

  it('refuses by default, since the engine mode defaults to game', () => {
    expect(getEngineMode()).toBe('game')
    const state = plannedState()
    const result = amendTelegraph(state, 'npc-0', { col: 4, row: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/bench-only/)
    expect(plannedTelegraph(state, 'npc-0')).toEqual({ kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 })
  })

  it('is evaluated on its own merits once the mode is bench', () => {
    setEngineMode('bench')
    const state = plannedState()
    const original = plannedTelegraph(state, 'npc-0')!
    const legalOther = threatTiles(state, 'npc-0')
      .find((t) => !(t.col === original.targetCol && t.row === original.targetRow))!
    expect(legalOther).toBeDefined()

    const result = amendTelegraph(state, 'npc-0', legalOther)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(plannedTelegraph(result.state, 'npc-0')).toEqual({
      kind: 'attack', unitId: 'npc-0', targetCol: legalOther.col, targetRow: legalOther.row,
    })
  })

  it('refuses an illegal retarget and leaves the original telegraph intact', () => {
    setEngineMode('bench')
    const state = plannedState()
    const original = plannedTelegraph(state, 'npc-0')!
    const result = amendTelegraph(state, 'npc-0', { col: 0, row: 0 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not a legal attack target/)
    expect(plannedTelegraph(state, 'npc-0')).toEqual(original)
  })

  it('does not move the enemy', () => {
    setEngineMode('bench')
    const state = plannedState()
    const before = state.units.find((u) => u.id === 'npc-0')!
    const legalOther = threatTiles(state, 'npc-0').find((t) => !(t.col === 5 && t.row === 4))!
    const result = amendTelegraph(state, 'npc-0', legalOther)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.units.find((u) => u.id === 'npc-0')).toEqual(before)
  })

  it('refuses to amend an enemy no longer on the board', () => {
    setEngineMode('bench')
    const state = plannedState()
    const withoutUnit: GameState = { ...state, units: state.units.filter((u) => u.id !== 'npc-0') }
    const result = amendTelegraph(withoutUnit, 'npc-0', { col: 4, row: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/no unit/i)
  })

  it('refuses an unplanned unit — nothing to amend', () => {
    setEngineMode('bench')
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 4 }])
    const result = amendTelegraph(s, 'npc-0', { col: 4, row: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/has not been planned/)
  })
})

// ─── 4.9 — the double-act regression ───────────────────────────────────────────

describe('the double-act regression', () => {
  it('reproduces: computeNpcTurns replans a unit already driven through the action surface', () => {
    // Today's defect (design.md, §7 of turn-sequencer-plan.md): computeNpcTurns
    // reads neither `movedThisTurn` nor `attackedThisTurn`, so a unit hand-driven
    // through the action surface still gets a fresh AI plan.
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }], 'player')
    const driven = commitAction(s, 'npc-0', 'move', { col: 4, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return
    expect(driven.state.movedThisTurn['npc-0']).toBe(1)

    // Reproduced: computeNpcTurns plans this same unit a second, independent
    // time — and because it is now adjacent to a power-center, that second
    // plan is a fresh attack telegraph the unit never earned through the
    // surface. Applying `moves`/`attackPlans` as the game host does would
    // make this unit act twice in the same round: once by hand, once by AI.
    const { moves, attackPlans } = computeNpcTurns(driven.state)
    expect(moves.find((m) => m.unitId === 'npc-0')).toEqual({ kind: 'stay', unitId: 'npc-0' })
    expect(attackPlans.find((p) => p.unitId === 'npc-0')).toEqual({
      kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4,
    })
  })

  it('is unrepresentable through the sequencer: planning is the one gate every author shares', () => {
    // The sequencer's analogue of "hand-drive, then let the AI plan the same
    // unit": a host plans the enemy through `commitNpcTurn`, and the AI's own
    // path to plan the same unit (`advanceNpc`) is asked for afterwards.
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }])
    const driven = commitNpcTurn(s, 'npc-0', { kind: 'move', toCol: 4, toRow: 4 }, { col: 5, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return
    expect(driven.state.npcPlannedThisRound).toEqual(['npc-0'])

    const replanned = advanceNpc(driven.state, 'npc-0')
    expect(replanned.ok).toBe(false)
    if (replanned.ok) return
    expect(replanned.reason).toMatch(/already been planned/)
    // Nothing changed: still exactly the one telegraph from the first plan.
    expect(driven.state.npcPlans).toEqual([{ kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 }])
  })
})

// ─── 2 — the two per-round ledgers cross-check (sequencer side) ───────────────

describe('the two per-round ledgers cross-check', () => {
  it('an enemy planned through the sequencer cannot then be driven by hand', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }], 'player')
    const planned = advanceNpc(s, 'npc-0')
    expect(planned.ok).toBe(true)
    if (!planned.ok) return

    const before = planned.state.units.find((u) => u.id === 'npc-0')
    const driven = commitAction(planned.state, 'npc-0', 'move', { col: 4, row: 4 })
    expect(driven.ok).toBe(false)
    if (driven.ok) return
    expect(driven.reason).toMatch(/already spent/)
    expect(planned.state.units.find((u) => u.id === 'npc-0')).toEqual(before)
  })

  it('an enemy driven by hand (moved) cannot then be planned, by the host or the AI', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }], 'player')
    const driven = commitAction(s, 'npc-0', 'move', { col: 4, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return
    expect(driven.state.movedThisTurn['npc-0']).toBe(1)

    const viaHost = commitNpcTurn(driven.state, 'npc-0', { kind: 'stay' })
    expect(viaHost.ok).toBe(false)
    if (viaHost.ok) return
    expect(viaHost.reason).toMatch(/already spent/)

    const viaAi = advanceNpc(driven.state, 'npc-0')
    expect(viaAi.ok).toBe(false)
    if (viaAi.ok) return
    expect(viaAi.reason).toMatch(/already spent/)

    // Nothing changed: still unplanned, no telegraph.
    expect(driven.state.npcPlannedThisRound).toEqual([])
    expect(driven.state.npcPlans).toEqual([])
  })

  it('an enemy driven by hand (attacked only, no move) is equally refused', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'pc-0', kind: 'pc', unitType: 'melee', col: 4, row: 4 },
    ], 'player')
    const driven = commitAction(s, 'npc-0', 'attack', { col: 4, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return
    expect(driven.state.attackedThisTurn).toContain('npc-0')
    expect(driven.state.movedThisTurn['npc-0'] ?? 0).toBe(0)

    const replanned = advanceNpc(driven.state, 'npc-0')
    expect(replanned.ok).toBe(false)
    if (replanned.ok) return
    expect(replanned.reason).toMatch(/already spent/)
  })
})

// ─── 2.3 — unplannedNpcs excludes a spent enemy, and the phase still ends ─────

describe('unplannedNpcs and phase completion with a spent enemy', () => {
  it('unplannedNpcs excludes an enemy already spent through the action surface', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 6 },
    ], 'player')
    const driven = commitAction(s, 'npc-0', 'move', { col: 4, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return
    expect(unplannedNpcs(driven.state)).toEqual(['npc-1'])
  })

  it('the enemy phase still reaches player with a hand-driven enemy on the board — it does not hang', () => {
    const s = board([
      { id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 },
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 4, row: 6 },
    ], 'player')
    const driven = commitAction(s, 'npc-0', 'move', { col: 4, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return

    let state: GameState = { ...driven.state, phase: 'npc-move' }
    const first = advance(state)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    // npc-0 is never offered — it's already spent — so npc-1 is the only step.
    expect(first.step).toMatchObject({ kind: 'plan-enemy', unitId: 'npc-1' })
    state = first.state

    const second = advance(state)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.step).toEqual({ kind: 'phase-transition', from: 'npc-move', to: 'player' })
    expect(second.state.phase).toBe('player')
    expect(second.state.units.some((u) => u.id === 'npc-0')).toBe(true)
  })
})

// ─── 2.4 — a new round clears both records ────────────────────────────────────

describe('a new round clears both records', () => {
  it('endRound clears movedThisTurn/attackedThisTurn, so a hand-driven enemy is plannable again', () => {
    const s = board([{ id: 'npc-0', kind: 'npc', unitType: 'short-range', col: 4, row: 5 }], 'player')
    const driven = commitAction(s, 'npc-0', 'move', { col: 4, row: 4 })
    expect(driven.ok).toBe(true)
    if (!driven.ok) return

    const ended = endRound(driven.state)
    expect(ended.movedThisTurn).toEqual({})
    expect(ended.attackedThisTurn).toEqual([])
    expect(unplannedNpcs(ended)).toContain('npc-0')

    const replanned = advanceNpc(ended, 'npc-0')
    expect(replanned.ok).toBe(true)
  })
})

// ─── plannableAttacks — the query that keeps an authoring host from guessing ────

describe('plannableAttacks', () => {
  const key = (t: { col: number; row: number }) => `${t.col},${t.row}`

  it('reports targets from the post-move position, not the current one', () => {
    // The PC sits far from the enemy's start and adjacent to its destination,
    // so "attackable now" and "attackable after moving" cannot coincide.
    const s = board([
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 0, row: 0 },
      { id: 'pc-1', kind: 'pc', unitType: 'melee', col: 3, row: 0 },
    ])
    const here = threatTiles(s, 'npc-1').map(key)
    const after = plannableAttacks(s, 'npc-1', { kind: 'move', toCol: 2, toRow: 0 }).map(key)

    expect(after).toContain('3,0')
    expect(here).not.toContain('3,0')
  })

  it('reports targets from the current position when staying put', () => {
    const s = board([
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 2, row: 0 },
      { id: 'pc-1', kind: 'pc', unitType: 'melee', col: 3, row: 0 },
    ])
    expect(plannableAttacks(s, 'npc-1', { kind: 'stay' }).map(key))
      .toEqual(threatTiles(s, 'npc-1').map(key))
  })

  // The point of the query: what it offers is exactly what the commit accepts.
  // If these ever diverge, a host is showing a designer targets that will be
  // refused — the failure `preview` exists to prevent, one level up.
  it('offers exactly what commitNpcTurn accepts', () => {
    const s = board([
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 0, row: 0 },
      { id: 'pc-1', kind: 'pc', unitType: 'melee', col: 3, row: 0 },
    ])
    const move = { kind: 'move', toCol: 2, toRow: 0 } as const
    const offered = plannableAttacks(s, 'npc-1', move)
    expect(offered.length).toBeGreaterThan(0)

    for (const tile of offered) {
      expect(commitNpcTurn(s, 'npc-1', move, tile)).toMatchObject({ ok: true })
    }
  })

  it('a tile it does not offer is refused by commitNpcTurn', () => {
    const s = board([
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 0, row: 0 },
      { id: 'pc-1', kind: 'pc', unitType: 'melee', col: 3, row: 0 },
    ])
    const move = { kind: 'move', toCol: 2, toRow: 0 } as const
    const offered = new Set(plannableAttacks(s, 'npc-1', move).map(key))
    const notOffered = { col: 7, row: 7 }
    expect(offered.has(key(notOffered))).toBe(false)
    expect(commitNpcTurn(s, 'npc-1', move, notOffered)).toMatchObject({ ok: false })
  })

  it('reports nothing for a move the enemy could not make', () => {
    const s = board([
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 0, row: 0 },
      { id: 'pc-1', kind: 'pc', unitType: 'melee', col: 3, row: 0 },
    ])
    expect(plannableAttacks(s, 'npc-1', { kind: 'move', toCol: 11, toRow: 7 })).toEqual([])
  })

  it('changes nothing', () => {
    const s = board([
      { id: 'npc-1', kind: 'npc', unitType: 'short-range', col: 0, row: 0 },
      { id: 'pc-1', kind: 'pc', unitType: 'melee', col: 3, row: 0 },
    ])
    const before = JSON.stringify(s)
    plannableAttacks(s, 'npc-1', { kind: 'move', toCol: 2, toRow: 0 })
    plannableAttacks(s, 'npc-1', { kind: 'stay' })
    expect(JSON.stringify(s)).toBe(before)
  })
})
