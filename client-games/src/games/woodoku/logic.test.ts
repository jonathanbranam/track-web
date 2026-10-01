import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE, BOX_SIZE, canPlace, emptyBoard, isGameOver, movePoints, newGame, place, previewPlacement,
  type GameState,
} from './logic'
import { SHAPES, shapeSize } from './pieces'

const dot = SHAPES[0]
const row9 = Array.from({ length: BOARD_SIZE }, (_, c) => [0, c] as const)

function state(board: boolean[][], tray: GameState['tray'], extra: Partial<GameState> = {}): GameState {
  return { board, tray, score: 0, streak: 0, over: false, ...extra }
}

describe('pieces', () => {
  it('are normalised and fit the board', () => {
    for (const s of SHAPES) {
      expect(Math.min(...s.map(([r]) => r))).toBe(0)
      expect(Math.min(...s.map(([, c]) => c))).toBe(0)
      const { rows, cols } = shapeSize(s)
      expect(rows).toBeLessThanOrEqual(BOARD_SIZE)
      expect(cols).toBeLessThanOrEqual(BOARD_SIZE)
    }
  })
  it('board size is a multiple of box size', () => expect(BOARD_SIZE % BOX_SIZE).toBe(0))
})

describe('placement', () => {
  it('rejects out of bounds and overlap', () => {
    const b = emptyBoard().map((r) => [...r])
    b[0][0] = true
    expect(canPlace(b, dot, 0, 0)).toBe(false)
    expect(canPlace(b, dot, 0, 1)).toBe(true)
    expect(canPlace(b, dot, BOARD_SIZE, 0)).toBe(false)
    expect(canPlace(b, SHAPES[1], 0, BOARD_SIZE - 1)).toBe(false)
  })
  it('illegal place returns the same state', () => {
    const s = state(emptyBoard().map((r) => [...r]), [dot, null, null])
    expect(place(s, 0, -1, 0)).toBe(s)
    expect(place(s, 1, 0, 0)).toBe(s)
  })
})

describe('clears', () => {
  it('clears a completed row and scores', () => {
    const b = emptyBoard().map((r) => [...r])
    for (const [r, c] of row9.slice(1)) b[r][c] = true
    const s = place(state(b, [dot, dot, dot]), 0, 0, 0)
    expect(s.board[0].every((x) => !x)).toBe(true)
    // the row also lies across box row 0 but boxes only partially filled: 1 line
    expect(s.score).toBe(movePoints(1, 1, 1))
    expect(s.streak).toBe(1)
  })
  it('clears row, column and box at the same time', () => {
    const b = emptyBoard().map((r) => [...r])
    for (let i = 0; i < BOARD_SIZE; i++) { b[0][i] = true; b[i][0] = true }
    for (let r = 0; r < BOX_SIZE; r++) for (let c = 0; c < BOX_SIZE; c++) b[r][c] = true
    b[0][0] = false
    const p = previewPlacement(b, dot, 0, 0)!
    expect(p.lines).toBe(3)
    const s = place(state(b, [dot, dot, dot]), 0, 0, 0)
    expect(s.board[0].every((x) => !x)).toBe(true)
    expect(s.board.every((r) => !r[0])).toBe(true)
    expect(s.board[1][1]).toBe(false)
  })
  it('does not drop remaining cells', () => {
    const b = emptyBoard().map((r) => [...r])
    for (const [r, c] of row9.slice(1)) b[r][c] = true
    b[1][4] = true
    const s = place(state(b, [dot, dot, dot]), 0, 0, 0)
    expect(s.board[1][4]).toBe(true)
  })
  it('preview is null when it does not fit', () => {
    expect(previewPlacement(emptyBoard(), dot, 9, 9)).toBeNull()
  })
})

describe('streak and score', () => {
  it('streak grows on consecutive clears and resets otherwise', () => {
    expect(movePoints(1, 0, 0)).toBe(1)
    expect(movePoints(1, 1, 2)).toBeGreaterThan(movePoints(1, 1, 1))
    expect(movePoints(1, 2, 1)).toBeGreaterThan(2 * movePoints(1, 1, 1) - 1)
    const b = emptyBoard().map((r) => [...r])
    const s = place(state(b, [dot, dot, dot], { streak: 3 }), 0, 4, 4)
    expect(s.streak).toBe(0)
  })
})

describe('tray and game over', () => {
  it('refills only once all three are placed', () => {
    let s = newGame(() => 0)
    s = place(s, 0, 0, 0, () => 0)
    expect(s.tray.filter(Boolean)).toHaveLength(2)
    s = place(s, 1, 0, 1, () => 0)
    s = place(s, 2, 0, 2, () => 0)
    expect(s.tray.every(Boolean)).toBe(true)
  })
  it('is over when nothing fits, and not while something does', () => {
    const full = Array.from({ length: BOARD_SIZE }, (_, r) =>
      Array.from({ length: BOARD_SIZE }, (_, c) => !(r === 0 && c === 0)),
    )
    expect(isGameOver(full, [dot, SHAPES[2], null])).toBe(false)
    expect(isGameOver(full, [SHAPES[2], SHAPES[4], null])).toBe(true)
    const s = place(state(full.map((r) => [...r]), [dot, SHAPES[2], null]), 0, 0, 0)
    // placing the dot completes row 0, col 0 and the box → clears them, game continues
    expect(s.over).toBe(false)
  })
  it('flags over after a move that leaves no fit', () => {
    const b = Array.from({ length: BOARD_SIZE }, (_, r) =>
      Array.from({ length: BOARD_SIZE }, (_, c) => (r + c) % 2 === 0 && !(r === 0 && c === 0)),
    )
    const s = place(state(b, [dot, SHAPES[2], null]), 0, 0, 0)
    expect(s.over).toBe(true)
  })
})
