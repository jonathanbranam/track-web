import { describe, it, expect } from 'vitest'
import {
  applyMove,
  undoLastMove,
  resolvePcAction,
  clearUndo,
  remainingMove,
  hasAttacked,
  validMoveDests,
  moveRange,
} from './pc'
import { initialState, endRound } from './npc'
import type { PcAction } from './types'

const pc0 = (s: ReturnType<typeof initialState>) => s.units.find((u) => u.id === 'pc-0')!

// pc-0 starts at col 2, row 7 (see initialState). A one-step move north is a
// valid, unobstructed destination.
const movePc0 = (s: ReturnType<typeof initialState>) =>
  applyMove(s, 'pc-0', 2, 6, [{ col: 2, row: 6 }])

describe('applyMove', () => {
  it('moves the unit and pushes an undo record', () => {
    const s = initialState()
    const next = movePc0(s)
    const pc0 = next.units.find((u) => u.id === 'pc-0')!
    expect(pc0.col).toBe(2)
    expect(pc0.row).toBe(6)
    expect(next.undoStack).toEqual([
      { unitId: 'pc-0', fromCol: 2, fromRow: 7, toCol: 2, toRow: 6, path: [{ col: 2, row: 6 }] },
    ])
  })

  it('preserves move order with the most recent on top', () => {
    const s = initialState()
    const next = applyMove(movePc0(s), 'pc-1', 6, 6, [{ col: 6, row: 6 }])
    expect(next.undoStack.map((r) => r.unitId)).toEqual(['pc-0', 'pc-1'])
  })
})

describe('undoLastMove', () => {
  it('round-trips: undoLastMove(applyMove(s, move)) restores s', () => {
    const s = initialState()
    expect(undoLastMove(movePc0(s))).toEqual(s)
  })

  it('pops only the most recent move', () => {
    const s = initialState()
    const two = applyMove(movePc0(s), 'pc-1', 6, 6, [{ col: 6, row: 6 }])
    const back = undoLastMove(two)
    expect(back.undoStack.map((r) => r.unitId)).toEqual(['pc-0'])
    expect(back.units.find((u) => u.id === 'pc-1')!.row).toBe(7)
    expect(back.units.find((u) => u.id === 'pc-0')!.row).toBe(6)
  })

  it('is a no-op on an empty stack', () => {
    const s = initialState()
    expect(s.undoStack).toEqual([])
    expect(undoLastMove(s)).toBe(s)
  })
})

describe('stack clearing', () => {
  it('resolving a PC attack clears the stack', () => {
    const moved = movePc0(initialState())
    expect(moved.undoStack.length).toBe(1)
    const attack: PcAction = { kind: 'attack', unitId: 'pc-0', col: 2, row: 6, attackDir: 'up' }
    expect(resolvePcAction(moved, attack).undoStack).toEqual([])
  })

  it('ending the round clears the stack', () => {
    const moved = movePc0(initialState())
    expect(endRound(moved).undoStack).toEqual([])
  })

  it('clearUndo empties a non-empty stack', () => {
    const moved = movePc0(initialState())
    expect(clearUndo(moved).undoStack).toEqual([])
  })

  it('a move after a clear is independently undoable', () => {
    const cleared = clearUndo(movePc0(initialState()))
    const removed = applyMove(cleared, 'pc-1', 6, 6, [{ col: 6, row: 6 }])
    expect(removed.undoStack.map((r) => r.unitId)).toEqual(['pc-1'])
    expect(undoLastMove(removed).units.find((u) => u.id === 'pc-1')!.row).toBe(7)
  })
})

describe('movement budget', () => {
  it('charges moved tiles against the per-turn range', () => {
    const s = initialState()
    expect(remainingMove(s, pc0(s))).toBe(moveRange(pc0(s)))
    const next = movePc0(s) // one tile north
    expect(remainingMove(next, pc0(next))).toBe(moveRange(pc0(s)) - 1)
  })

  it('multiple moves consume cumulative range and stop at zero', () => {
    // pc-0 (melee) has range 4. Spend all 4 tiles across one move.
    const s = initialState()
    const path = [
      { col: 2, row: 6 }, { col: 2, row: 5 }, { col: 2, row: 4 }, { col: 2, row: 3 },
    ]
    const moved = applyMove(s, 'pc-0', 2, 3, path)
    expect(remainingMove(moved, pc0(moved))).toBe(0)
    expect(validMoveDests(moved, 'pc-0')).toEqual([])
  })

  it('undo refunds the spent movement', () => {
    const s = initialState()
    const moved = movePc0(s)
    expect(remainingMove(moved, pc0(moved))).toBe(moveRange(pc0(s)) - 1)
    const back = undoLastMove(moved)
    expect(remainingMove(back, pc0(back))).toBe(moveRange(pc0(s)))
    expect(back.movedThisTurn).toEqual({})
  })
})

describe('attack lock', () => {
  const attack: PcAction = { kind: 'attack', unitId: 'pc-0', col: 2, row: 7, attackDir: 'up' }

  it('marks the attacker as having attacked', () => {
    const after = resolvePcAction(initialState(), attack)
    expect(hasAttacked(after, 'pc-0')).toBe(true)
  })

  it('an attacked PC has no remaining movement and no valid destinations', () => {
    const after = resolvePcAction(initialState(), attack)
    expect(remainingMove(after, pc0(after))).toBe(0)
    expect(validMoveDests(after, 'pc-0')).toEqual([])
  })

  it('round end clears the attack lock', () => {
    const after = endRound(resolvePcAction(initialState(), attack))
    expect(hasAttacked(after, 'pc-0')).toBe(false)
    expect(after.attackedThisTurn).toEqual([])
  })
})
