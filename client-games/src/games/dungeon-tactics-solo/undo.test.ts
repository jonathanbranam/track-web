import { describe, it, expect } from 'vitest'
import { applyMove, undoLastMove, resolvePcAction, clearUndo } from './pc'
import { initialState, endRound } from './npc'
import type { PcAction } from './types'

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
