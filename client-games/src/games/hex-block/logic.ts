import { RADIUS, boardCells, boardLines, key, type Axial } from './hex'
import { randomTray, COLORS, type Color, type Piece } from './pieces'

export const TRAY_SIZE = 3
/** Points per cleared cell before the combo and one-colour bonuses. */
export const CLEAR_POINTS = 2
/** A cleared line whose tiles are all one colour is worth this many times a plain line. */
export const MONO_MULTIPLIER = 3

export const CELLS = boardCells(RADIUS)
const INDEX = new Map(CELLS.map((c, i) => [key(c.q, c.r), i]))
/** The 27 lines, as cell indices. */
export const LINES: readonly (readonly number[])[] = boardLines(RADIUS).map((l) => l.map((c) => INDEX.get(key(c.q, c.r))!))

export const cellIndex = (q: number, r: number): number => INDEX.get(key(q, r)) ?? -1

/** One entry per CELLS index: the colour of the hex there, or null. */
export type Board = readonly (Color | null)[]
export type Counts = Record<Color, number>

export interface GameState {
  board: Board
  /** Pieces in the tray; null once placed. */
  tray: readonly (Piece | null)[]
  score: number
  /** Hexes cleared so far, per colour (birds = red, notes = blue, leaves = green). */
  counts: Counts
  over: boolean
}

export const emptyBoard = (): Board => CELLS.map(() => null)
export const emptyCounts = (): Counts => ({ red: 0, blue: 0, green: 0 })

/** Board indices the piece would cover with its origin at (q, r), or null if it does not fit. */
export function footprint(board: Board, piece: Piece, origin: Axial): number[] | null {
  const idx: number[] = []
  for (const c of piece.cells) {
    const i = cellIndex(origin.q + c.q, origin.r + c.r)
    if (i < 0 || board[i]) return null
    idx.push(i)
  }
  return idx
}

function withPiece(board: Board, piece: Piece, idx: number[]): Color[] {
  const next = [...board] as (Color | null)[]
  idx.forEach((i, k) => (next[i] = piece.colors[k]))
  return next as Color[]
}

export interface Clear {
  cells: Set<number>
  lines: number
  /** Sum of the lengths of cleared lines whose tiles are all one colour. */
  monoLength: number
}

/** What would clear on `board` (already holding the piece). */
export function fullLines(board: Board): Clear {
  const cells = new Set<number>()
  let lines = 0
  let monoLength = 0
  for (const line of LINES) {
    if (!line.every((i) => board[i])) continue
    lines++
    for (const i of line) cells.add(i)
    if (line.every((i) => board[i] === board[line[0]])) monoLength += line.length
  }
  return { cells, lines, monoLength }
}

/** What dropping the piece at `origin` would clear, with the covered indices. Null if it does not fit. */
export function previewPlacement(board: Board, piece: Piece, origin: Axial) {
  const idx = footprint(board, piece, origin)
  if (!idx) return null
  return { covered: idx, ...fullLines(withPiece(board, piece, idx)) }
}

/**
 * 1 per hex placed, plus (2 per distinct cleared cell, plus 2 × MONO_MULTIPLIER-1 extra per cell of
 * each one-colour line) doubled for every line beyond the first cleared in the same move.
 */
export function movePoints(placed: number, clearedCells: number, lines: number, monoLength: number): number {
  if (lines === 0) return placed
  const base = CLEAR_POINTS * clearedCells + CLEAR_POINTS * (MONO_MULTIPLIER - 1) * monoLength
  return placed + base * 2 ** (lines - 1)
}

export function canPlaceAnywhere(board: Board, piece: Piece): boolean {
  return CELLS.some((origin) => footprint(board, piece, origin))
}

export function isGameOver(board: Board, tray: readonly (Piece | null)[]): boolean {
  return tray.every((p) => p === null || !canPlaceAnywhere(board, p))
}

export function newGame(rng: () => number = Math.random): GameState {
  const board = emptyBoard()
  const tray = randomTray(TRAY_SIZE, rng)
  return { board, tray, score: 0, counts: emptyCounts(), over: isGameOver(board, tray) }
}

/** Place tray piece `slot` with its origin at `origin`. Returns the same state if the move is illegal. */
export function place(state: GameState, slot: number, origin: Axial, rng: () => number = Math.random): GameState {
  const piece = state.tray[slot]
  if (state.over || !piece) return state
  const idx = footprint(state.board, piece, origin)
  if (!idx) return state
  const filled = withPiece(state.board, piece, idx)
  const clear = fullLines(filled)
  const counts = { ...state.counts }
  const board = [...filled] as (Color | null)[]
  for (const i of clear.cells) {
    counts[board[i] as Color]++
    board[i] = null
  }
  const score = state.score + movePoints(piece.cells.length, clear.cells.size, clear.lines, clear.monoLength)
  let tray: (Piece | null)[] = state.tray.map((p, i) => (i === slot ? null : p))
  if (tray.every((p) => p === null)) tray = randomTray(TRAY_SIZE, rng)
  return { board, tray, score, counts, over: isGameOver(board, tray) }
}

export { COLORS }
