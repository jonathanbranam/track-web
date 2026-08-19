import { describe, it, expect } from 'vitest'
import { initialState, computeNpcTurns } from './npc'
import type { GameState, NpcAction, NpcAttackPlan, NpcType } from './types'

function npcIds(state: GameState): string[] {
  return state.units.filter((u) => u.kind === 'npc').map((u) => u.id)
}

// A player-phase state holding a single NPC over the seed board (with its
// structures/power-centers intact), so each archetype's move/attack split can be
// asserted without interference from the other enemies.
function singleNpc(unitType: NpcType, col: number, row: number): GameState {
  const s = initialState()
  return {
    ...s,
    phase: 'player',
    units: [{ id: 'npc-0', kind: 'npc', col, row, unitType, hp: 3 }],
    npcPlans: [],
  }
}

// Where each NPC ends the move phase: a move's destination, its current cell when
// it stays, or dropped when it exits.
function postMovePositions(state: GameState, moves: NpcAction[]): Map<string, { col: number; row: number }> {
  const pos = new Map<string, { col: number; row: number }>()
  for (const u of state.units) if (u.kind === 'npc') pos.set(u.id, { col: u.col, row: u.row })
  for (const m of moves) {
    if (m.kind === 'move') pos.set(m.unitId, { col: m.toCol, row: m.toRow })
    else if (m.kind === 'exit') pos.delete(m.unitId)
  }
  return pos
}

describe('computeNpcTurns — move/attack split', () => {
  it('returns movement actions and attack telegraphs as separate lists', () => {
    const s = initialState()
    const { moves, attackPlans } = computeNpcTurns(s)
    const ids = new Set(npcIds(s))
    // Movement actions are only move/exit/stay — the bundled `move-attack` variant
    // is gone, and attacks never appear here.
    for (const m of moves) {
      expect(ids.has(m.unitId)).toBe(true)
      expect(['move', 'exit', 'stay']).toContain(m.kind)
    }
    // Every telegraph is an attack belonging to an NPC.
    for (const p of attackPlans) {
      expect(p.kind).toBe('attack')
      expect(ids.has(p.unitId)).toBe(true)
    }
  })

  it('emits exactly one movement action per living NPC', () => {
    const s = initialState()
    const { moves } = computeNpcTurns(s)
    // No seed NPC starts on the exit row, so each produces one move/stay entry.
    expect(moves.map((m) => m.unitId).sort()).toEqual(npcIds(s).sort())
  })

  it('telegraphs every attack from the NPC post-move position, cardinally aligned', () => {
    const s = initialState()
    const { moves, attackPlans } = computeNpcTurns(s)
    const pos = postMovePositions(s, moves)
    for (const p of attackPlans) {
      const from = pos.get(p.unitId)!
      const sameCol = from.col === p.targetCol
      const sameRow = from.row === p.targetRow
      expect(sameCol || sameRow).toBe(true)
      expect(Math.abs(from.col - p.targetCol) + Math.abs(from.row - p.targetRow)).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('computeNpcTurns — short-range archetype', () => {
  it('stays and telegraphs when already adjacent to a power-center', () => {
    // npc-0 directly above the (5,4) power-center: a distance-1 stationary attack.
    const s = singleNpc('short-range', 5, 3)
    const { moves, attackPlans } = computeNpcTurns(s)
    expect(moves).toEqual([{ kind: 'stay', unitId: 'npc-0' }])
    expect(attackPlans).toEqual([{ kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 }])
  })

  it('moves into contact and telegraphs the attack from its destination', () => {
    // npc-0 three tiles above (5,4), out of attack range (max 2): it closes to the
    // adjacent cell (5,3) and telegraphs the structure attack from there.
    const s = singleNpc('short-range', 5, 1)
    const { moves, attackPlans } = computeNpcTurns(s)
    expect(moves.length).toBe(1)
    const move = moves[0]
    expect(move.kind).toBe('move')
    if (move.kind === 'move') {
      expect({ col: move.toCol, row: move.toRow }).toEqual({ col: 5, row: 3 })
    }
    expect(attackPlans).toEqual([{ kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 }])
  })
})

describe('computeNpcTurns — long-range archetype', () => {
  it('stays and telegraphs a ranged attack on a target at distance 2', () => {
    // npc-0 two tiles above the (5,4) power-center, within long-range (min 2).
    const s = singleNpc('long-range', 5, 2)
    const { moves, attackPlans } = computeNpcTurns(s)
    expect(moves).toEqual([{ kind: 'stay', unitId: 'npc-0' }])
    expect(attackPlans).toEqual([{ kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 }])
  })
})

describe('computeNpcTurns — attack-only re-plan (live def edit)', () => {
  // Two short-range NPCs each adjacent to a power-center; both have a telegraph.
  function twoAdjacent(npcPlans: NpcAttackPlan[]): GameState {
    const s = initialState()
    return {
      ...s,
      phase: 'player',
      units: [
        { id: 'npc-0', kind: 'npc', col: 5, row: 3, unitType: 'short-range', hp: 3 },
        { id: 'npc-1', kind: 'npc', col: 11, row: 3, unitType: 'short-range', hp: 3 },
      ],
      npcPlans,
    }
  }

  it('returns no movement and reuses every prior telegraph for an empty set', () => {
    const planA: NpcAttackPlan = { kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 }
    const planB: NpcAttackPlan = { kind: 'attack', unitId: 'npc-1', targetCol: 11, targetRow: 4 }
    const s = twoAdjacent([planA, planB])
    const { moves, attackPlans } = computeNpcTurns(s, new Set<string>())
    expect(moves).toEqual([])
    expect(attackPlans).toEqual([planA, planB])
    // Reused verbatim (same object identity), not recomputed.
    expect(attackPlans[0]).toBe(planA)
    expect(attackPlans[1]).toBe(planB)
  })

  it('recomputes only the replanned NPC and reuses the rest, with no movement', () => {
    // npc-0's prior telegraph is stale (wrong target); npc-1's is correct.
    const stale: NpcAttackPlan = { kind: 'attack', unitId: 'npc-0', targetCol: 0, targetRow: 0 }
    const planB: NpcAttackPlan = { kind: 'attack', unitId: 'npc-1', targetCol: 11, targetRow: 4 }
    const s = twoAdjacent([stale, planB])
    const { moves, attackPlans } = computeNpcTurns(s, new Set(['npc-0']))
    expect(moves).toEqual([])
    // npc-0 recomputed from its current (immutable) position; npc-1 reused.
    expect(attackPlans).toEqual([
      { kind: 'attack', unitId: 'npc-0', targetCol: 5, targetRow: 4 },
      planB,
    ])
    expect(attackPlans[1]).toBe(planB)
  })
})
