import { describe, expect, it } from 'vitest'
import { CELLS, GAUGE_SIZE, MERGE_SLOT, NEIGHBOURS, cellIndex, emptyBoard, isGameOver, movePoints, newGame, place, previewPlacement, rotateSlot, slotPiece, type GameState } from './logic'
import { SHAPES, mergePiece, randomPiece, rotatePiece, type Color, type Piece } from './pieces'

const idx = (q: number, r: number) => cellIndex(q, r)
const single = (color: Color): Piece => ({ cells: [{ q: 0, r: 0 }], colors: [color] })

function boardWith(cells: [number, number, Color][]) {
  const b = emptyBoard() as (Color | null)[]
  for (const [q, r, c] of cells) b[idx(q, r)] = c
  return b
}

function state(over: Partial<GameState>): GameState {
  return { ...newGame(), ...over }
}

describe('board', () => {
  it('has 37 cells at radius 3 and sane neighbours', () => {
    expect(CELLS).toHaveLength(37)
    expect(NEIGHBOURS[idx(0, 0)]).toHaveLength(6)
    expect(NEIGHBOURS[idx(3, 0)]).toHaveLength(3)
  })
})

describe('pieces', () => {
  it('rotating six times returns the panel; colours stay in order', () => {
    const p: Piece = { cells: SHAPES[3], colors: ['red', 'blue', 'green'] }
    let r = p
    for (let i = 0; i < 6; i++) r = rotatePiece(r)
    expect(r).toEqual(p)
    expect(rotatePiece(p).colors).toEqual(p.colors)
    expect(rotatePiece(p).cells).not.toEqual(p.cells)
  })
  it('random panels have 1-3 connected hexes', () => {
    for (let i = 0; i < 200; i++) {
      const p = randomPiece()
      expect(p.cells.length).toBeGreaterThanOrEqual(1)
      expect(p.cells.length).toBeLessThanOrEqual(3)
      expect(p.colors).toHaveLength(p.cells.length)
    }
  })
})

describe('placement and clears', () => {
  it('three linked same-element hexes clear and fill the gauge', () => {
    const board = boardWith([[0, 0, 'red'], [1, 0, 'red']])
    const s = state({ board, tray: [single('red'), single('blue'), single('blue')] })
    const next = place(s, 0, { q: 0, r: 1 })
    expect(next.board.every((c) => c === null)).toBe(true)
    expect(next.gauges.red).toBe(3)
    expect(next.score).toBe(movePoints(1, 3, 1))
    expect(next.tray[0]).toBeNull()
  })
  it('two linked do not clear', () => {
    const s = state({ board: boardWith([[0, 0, 'red']]), tray: [single('red'), single('blue'), single('blue')] })
    const next = place(s, 0, { q: 1, r: 0 })
    expect(next.board[idx(1, 0)]).toBe('red')
    expect(next.gauges.red).toBe(0)
  })
  it('clearing two colours in one move doubles, three quadruples', () => {
    expect(movePoints(1, 6, 1)).toBe(1 + 60)
    expect(movePoints(1, 6, 2)).toBe(1 + 120)
    expect(movePoints(1, 9, 3)).toBe(1 + 360)
    const board = boardWith([[0, 0, 'red'], [-1, 0, 'red'], [2, 0, 'blue'], [3, 0, 'blue']])
    const s = state({ board, tray: [{ cells: [{ q: 0, r: 0 }, { q: 1, r: 0 }], colors: ['red', 'blue'] }, single('red'), single('red')] })
    const next = place(s, 0, { q: 0, r: 0 })
    // origin (0,0) is occupied: illegal, unchanged
    expect(next).toBe(s)
    const s2 = state({ board: boardWith([[-1, 0, 'red'], [-2, 0, 'red'], [2, 0, 'blue'], [3, 0, 'blue']]), tray: s.tray })
    const n2 = place(s2, 0, { q: 0, r: 0 })
    expect(n2.board.every((c) => c === null)).toBe(true)
    expect(n2.score).toBe(movePoints(2, 6, 2))
  })
  it('rejects overlaps and off-board drops', () => {
    const s = state({ board: boardWith([[0, 0, 'red']]), tray: [single('blue'), single('blue'), single('blue')] })
    expect(place(s, 0, { q: 0, r: 0 })).toBe(s)
    expect(place(s, 0, { q: 9, r: 9 })).toBe(s)
  })
  it('refills the tray when empty', () => {
    const s = state({ tray: [single('red'), null, null] })
    expect(place(s, 0, { q: 0, r: 0 }).tray.every((p) => p !== null)).toBe(true)
  })
  it('preview reports what would clear', () => {
    const board = boardWith([[0, 0, 'green'], [1, 0, 'green']])
    const pre = previewPlacement(board, single('green'), { q: 2, r: 0 })!
    expect(pre.cells.size).toBe(3)
    expect(previewPlacement(board, single('blue'), { q: 2, r: 0 })!.cells.size).toBe(0)
  })
})

describe('gauges and merge panels', () => {
  it('a full gauge levels up and earns a merge panel', () => {
    const board = boardWith([[0, 0, 'blue'], [1, 0, 'blue']])
    const s = state({ board, gauges: { red: 0, blue: GAUGE_SIZE - 3, green: 0 }, tray: [single('blue'), single('red'), single('red')] })
    const next = place(s, 0, { q: 2, r: 0 })
    expect(next.gauges.blue).toBe(0)
    expect(next.levels.blue).toBe(1)
    expect(next.merges).toEqual(['blue'])
    expect(slotPiece(next, MERGE_SLOT)?.merge).toBe(true)
  })
  it('a merge panel clears the whole group it joins, whatever the size', () => {
    const board = boardWith([[0, 0, 'red'], [1, 0, 'red']].map(([q, r, c]) => [q, r, c] as [number, number, Color]))
    const s = state({ board, merges: ['red'], tray: [single('blue'), null, null] })
    const next = place(s, MERGE_SLOT, { q: 2, r: 0 })
    expect(next.board.every((c) => c === null)).toBe(true)
    expect(next.merges).toEqual([])
    expect(next.gauges.red).toBe(3)
  })
  it('a merge panel with no neighbour just sits there', () => {
    const s = state({ board: boardWith([[0, 0, 'red']]), merges: ['green'], tray: [single('blue'), null, null] })
    const next = place(s, MERGE_SLOT, { q: 1, r: 2 })
    expect(next.board[idx(1, 2)]).toBe('green')
    expect(next.merges).toEqual([])
  })
  it('mergePiece is a single hex', () => {
    expect(mergePiece('red').cells).toHaveLength(1)
  })
})

describe('rotate and game over', () => {
  it('tap rotates a tray panel only', () => {
    const p: Piece = { cells: SHAPES[1], colors: ['red', 'blue'] }
    const s = state({ tray: [p, null, null] })
    expect(rotateSlot(s, 0, rotatePiece).tray[0]).toEqual(rotatePiece(p))
    expect(rotateSlot(s, 1, rotatePiece)).toBe(s)
    expect(rotateSlot(s, MERGE_SLOT, rotatePiece)).toBe(s)
  })
  it('is over when nothing fits, not while a merge panel has room', () => {
    const full = CELLS.map((_, i) => (['red', 'blue', 'green'] as Color[])[i % 3])
    expect(isGameOver(full, [single('red'), null, null], [])).toBe(true)
    const almost = [...full] as (Color | null)[]
    almost[0] = null
    expect(isGameOver(almost, [single('red'), null, null], [])).toBe(false)
    expect(isGameOver(full, [null, null, null], ['red'])).toBe(true)
    expect(isGameOver(almost, [{ cells: SHAPES[1], colors: ['red', 'red'] }, null, null], [])).toBe(true)
    expect(isGameOver(almost, [{ cells: SHAPES[1], colors: ['red', 'red'] }, null, null], ['red'])).toBe(false)
  })
})
