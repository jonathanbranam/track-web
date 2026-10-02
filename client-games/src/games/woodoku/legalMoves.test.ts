import { describe, expect, it } from 'vitest'
import { legalMoves, newGame, place } from './logic'

describe('legalMoves', () => {
  it('every listed move is accepted by place, and the game is not over', () => {
    const s = newGame()
    const moves = legalMoves(s)
    expect(moves.length).toBeGreaterThan(0)
    for (const m of moves) expect(place(s, m.slot, m.row, m.col)).not.toBe(s)
  })

  it('is empty once the game is over', () => {
    expect(legalMoves({ ...newGame(), over: true })).toEqual([])
  })
})
