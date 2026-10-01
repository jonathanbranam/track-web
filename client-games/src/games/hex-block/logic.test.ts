import { describe, expect, it } from 'vitest'
import { boardCells, boardLines, hexToPixel, pixelToHex } from './hex'
import { CELLS, LINES, cellIndex, emptyBoard, footprint, isGameOver, movePoints, newGame, place, previewPlacement, type GameState } from './logic'
import { SHAPES, randomPiece, type Color, type Piece } from './pieces'
import { pieceCentre, snapOrigin } from './dragMath'

const dot = (color: Color): Piece => ({ cells: [{ q: 0, r: 0 }], colors: [color] })

function state(board: (Color | null)[], tray: GameState['tray'], extra: Partial<GameState> = {}): GameState {
  return { board, tray, score: 0, counts: { red: 0, blue: 0, green: 0 }, over: false, ...extra }
}

/** A board with every cell of line `lineIdx` filled except `skip`, in `colors` cycling. */
function fillLine(lineIdx: number, skip: number, colors: Color[]) {
  const board = emptyBoard() as (Color | null)[]
  LINES[lineIdx].forEach((i, k) => {
    if (i !== skip) board[i] = colors[k % colors.length]
  })
  return board
}

describe('hex math', () => {
  it('has 61 cells and 27 lines of 5..9 cells', () => {
    expect(boardCells(4)).toHaveLength(61)
    expect(boardLines(4)).toHaveLength(27)
    expect(boardLines(4).map((l) => l.length).sort()).toEqual(
      [...[5, 6, 7, 8, 9, 8, 7, 6, 5], ...[5, 6, 7, 8, 9, 8, 7, 6, 5], ...[5, 6, 7, 8, 9, 8, 7, 6, 5]].sort(),
    )
  })

  it('round-trips pixel and axial', () => {
    for (const c of boardCells(4)) {
      const p = hexToPixel(c.q, c.r, 20)
      expect(pixelToHex(p.x + 3, p.y - 2, 20)).toEqual(c)
    }
  })
})

describe('pieces', () => {
  it('are 1-4 connected hexes, normalised, with no duplicate orientation', () => {
    const seen = new Set<string>()
    for (const s of SHAPES) {
      expect(s.length).toBeGreaterThanOrEqual(1)
      expect(s.length).toBeLessThanOrEqual(4)
      expect(Math.min(...s.map((c) => c.r))).toBe(0)
      const k = s.map((c) => `${c.q},${c.r}`).join(';')
      expect(seen.has(k)).toBe(false)
      seen.add(k)
      // connected
      const set = new Set(s.map((c) => `${c.q},${c.r}`))
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
      const stack = [s[0]]
      const reached = new Set([`${s[0].q},${s[0].r}`])
      while (stack.length) {
        const c = stack.pop()!
        for (const [dq, dr] of dirs) {
          const n = `${c.q + dq},${c.r + dr}`
          if (set.has(n) && !reached.has(n)) {
            reached.add(n)
            stack.push({ q: c.q + dq, r: c.r + dr })
          }
        }
      }
      expect(reached.size).toBe(s.length)
    }
  })

  it('every shape fits an empty board', () => {
    const board = emptyBoard()
    for (const s of SHAPES) {
      const piece = { cells: s, colors: s.map(() => 'red' as Color) }
      expect(CELLS.some((o) => footprint(board, piece, o))).toBe(true)
    }
  })

  it('random pieces give each hex a colour', () => {
    const p = randomPiece()
    expect(p.colors).toHaveLength(p.cells.length)
  })
})

describe('placement and clears', () => {
  it('rejects off-board and occupied placements', () => {
    const board = emptyBoard() as (Color | null)[]
    expect(footprint(board, dot('red'), { q: 5, r: 0 })).toBeNull()
    board[cellIndex(0, 0)] = 'red'
    expect(footprint(board, dot('red'), { q: 0, r: 0 })).toBeNull()
    expect(footprint(board, dot('red'), { q: 1, r: 0 })).not.toBeNull()
  })

  it('clears a completed line and scores it', () => {
    const missing = LINES[0][2]
    const s = place(state(fillLine(0, missing, ['red', 'blue']), [dot('green'), null, null]), 0, CELLS[missing])
    expect(s.board.every((c) => c === null)).toBe(true)
    const len = LINES[0].length
    expect(s.score).toBe(1 + 2 * len) // mixed colours: no one-colour bonus
  })

  it('a one-colour line scores x3', () => {
    const missing = LINES[0][2]
    const s = place(state(fillLine(0, missing, ['red']), [dot('red'), null, null]), 0, CELLS[missing])
    expect(s.score).toBe(1 + 2 * LINES[0].length * 3)
    expect(s.counts.red).toBe(LINES[0].length)
    expect(s.counts.blue).toBe(0)
  })

  it('crossing lines clear together and a shared cell clears once', () => {
    const centre = cellIndex(0, 0)
    const board = emptyBoard() as (Color | null)[]
    // the q=0 line and the r=0 line, all but the centre, in mixed colours
    const qLine = LINES[4]
    const rLine = LINES[9 + 4]
    ;[...qLine, ...rLine].forEach((i, k) => {
      if (i !== centre) board[i] = k % 2 ? 'red' : 'blue'
    })
    const p = previewPlacement(board, dot('green'), { q: 0, r: 0 })!
    expect(p.lines).toBe(2)
    expect(p.cells.size).toBe(qLine.length + rLine.length - 1)
    const s = place(state(board, [dot('green'), null, null]), 0, { q: 0, r: 0 })
    expect(s.board.every((c) => c === null)).toBe(true)
    expect(s.score).toBe(1 + 2 * p.cells.size * 2)
  })

  it('movePoints', () => {
    expect(movePoints(3, 0, 0, 0)).toBe(3)
    expect(movePoints(1, 5, 1, 0)).toBe(11)
    expect(movePoints(1, 5, 1, 5)).toBe(1 + 10 + 20)
    expect(movePoints(1, 12, 2, 0)).toBe(1 + 24 * 2)
  })

  it('refills the tray once all three are placed', () => {
    let s = state(emptyBoard() as (Color | null)[], [dot('red'), dot('red'), dot('red')])
    s = place(s, 0, { q: 0, r: 0 })
    s = place(s, 1, { q: 1, r: 0 })
    expect(s.tray.filter(Boolean)).toHaveLength(1)
    s = place(s, 2, { q: 2, r: 0 })
    expect(s.tray.filter(Boolean)).toHaveLength(3)
  })

  it('ends when no tray piece fits, and ignores moves after', () => {
    const full = CELLS.map((_, i) => (i === 0 ? null : ('red' as Color)))
    const two: Piece = { cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }], colors: ['red', 'red'] }
    expect(isGameOver(full, [two, null, null])).toBe(true)
    expect(isGameOver(full, [two, dot('red'), null])).toBe(false)
    const over = state(full, [dot('red'), null, null], { over: true })
    expect(place(over, 0, CELLS[0])).toBe(over)
  })

  it('newGame starts with 3 pieces and an empty board', () => {
    const g = newGame()
    expect(g.tray.filter(Boolean)).toHaveLength(3)
    expect(g.board.every((c) => c === null)).toBe(true)
  })
})

describe('drag snapping', () => {
  it('lands the origin so the piece centre is under the pointer', () => {
    const size = 20
    for (const s of SHAPES) {
      const c = pieceCentre(s, size)
      const o = snapOrigin(s, c.x, c.y, size)
      expect(o).toEqual({ q: 0, r: 0 })
    }
  })
})
