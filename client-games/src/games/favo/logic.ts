import { boardCells, key, type Axial } from '../hex-block/hex'
import { COLORS, mergePiece, randomTray, type Color, type Piece } from './pieces'

export const RADIUS = 3
export const TRAY_SIZE = 3
/** Slot index of the bonus merge panel, after the tray slots. */
export const MERGE_SLOT = TRAY_SIZE
/** A connected same-element group of at least this many hexes clears. */
export const MIN_GROUP = 3
/** Points per hex placed. */
export const PLACE_POINTS = 1
/** Points per hex cleared, before the colour multiplier. */
export const CLEAR_POINTS = 10
/** Hexes of one element to clear to fill its gauge. */
export const GAUGE_SIZE = 12
/** Score multiplier by number of distinct elements cleared in one move. */
export const COLOR_MULTIPLIER = [0, 1, 2, 4] as const

export const CELLS = boardCells(RADIUS)
const INDEX = new Map(CELLS.map((c, i) => [key(c.q, c.r), i]))
export const cellIndex = (q: number, r: number): number => INDEX.get(key(q, r)) ?? -1

const DIRS: readonly Axial[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
]
/** Neighbour indices of every cell. */
export const NEIGHBOURS: readonly (readonly number[])[] = CELLS.map((c) =>
  DIRS.map((d) => cellIndex(c.q + d.q, c.r + d.r)).filter((i) => i >= 0),
)

export type Board = readonly (Color | null)[]
export type ColorCounts = Record<Color, number>

export interface GameState {
  board: Board
  /** Pieces in the tray; null once placed. */
  tray: readonly (Piece | null)[]
  /** Merge panels earned and not yet placed, by element; the first is the one on offer. */
  merges: readonly Color[]
  score: number
  /** Hexes in each element's gauge, below GAUGE_SIZE. */
  gauges: ColorCounts
  /** Times each gauge has filled. */
  levels: ColorCounts
  over: boolean
}

export const emptyBoard = (): Board => CELLS.map(() => null)
const zero = (): ColorCounts => ({ red: 0, blue: 0, green: 0 })

/** The panel in a slot (tray slots, or MERGE_SLOT for the first pending merge panel). */
export function slotPiece(state: Pick<GameState, 'tray' | 'merges'>, slot: number): Piece | null {
  if (slot === MERGE_SLOT) return state.merges.length ? mergePiece(state.merges[0]) : null
  return state.tray[slot] ?? null
}

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

function withPiece(board: Board, piece: Piece, idx: number[]): (Color | null)[] {
  const next = [...board]
  idx.forEach((i, k) => (next[i] = piece.colors[k]))
  return next
}

/**
 * Indices that clear on `board` (already holding the placed piece at `placed`): every connected
 * same-element group of MIN_GROUP or more; for a merge panel, the group it joins whatever its size
 * (as long as it touches one same-element hex).
 */
export function clearedCells(board: Board, placed: readonly number[], merge: boolean): Set<number> {
  const out = new Set<number>()
  const seen = new Set<number>()
  for (let start = 0; start < board.length; start++) {
    const color = board[start]
    if (!color || seen.has(start)) continue
    const group = [start]
    seen.add(start)
    for (let k = 0; k < group.length; k++) {
      for (const n of NEIGHBOURS[group[k]]) {
        if (board[n] === color && !seen.has(n)) {
          seen.add(n)
          group.push(n)
        }
      }
    }
    const mergeHit = merge && group.length >= 2 && group.some((i) => placed.includes(i))
    if (group.length >= MIN_GROUP || mergeHit) group.forEach((i) => out.add(i))
  }
  return out
}

/** Points for a move: hexes placed, plus cleared hexes times the colour multiplier. */
export function movePoints(placed: number, cleared: number, colors: number): number {
  return placed * PLACE_POINTS + cleared * CLEAR_POINTS * COLOR_MULTIPLIER[colors]
}

/** What dropping the piece at `origin` would do. Null if it does not fit. */
export function previewPlacement(board: Board, piece: Piece, origin: Axial) {
  const covered = footprint(board, piece, origin)
  if (!covered) return null
  const filled = withPiece(board, piece, covered)
  return { covered, cells: clearedCells(filled, covered, !!piece.merge), filled }
}

export function canPlaceAnywhere(board: Board, piece: Piece): boolean {
  return CELLS.some((origin) => footprint(board, piece, origin))
}

export function isGameOver(board: Board, tray: readonly (Piece | null)[], merges: readonly Color[]): boolean {
  if (merges.length && board.some((c) => !c)) return false
  return tray.every((p) => p === null || !canPlaceAnywhere(board, p))
}

export function newGame(rng: () => number = Math.random): GameState {
  const board = emptyBoard()
  const tray = randomTray(TRAY_SIZE, rng)
  return { board, tray, merges: [], score: 0, gauges: zero(), levels: zero(), over: isGameOver(board, tray, []) }
}

/** Tap a tray panel: turn it 60 degrees. Same state if the slot is empty or is the merge panel. */
export function rotateSlot(state: GameState, slot: number, rotate: (p: Piece) => Piece): GameState {
  const piece = state.tray[slot]
  if (state.over || slot >= TRAY_SIZE || !piece) return state
  return { ...state, tray: state.tray.map((p, i) => (i === slot ? rotate(piece) : p)) }
}

/** Place a panel with its origin at `origin`. Returns the same state if the move is illegal. */
export function place(state: GameState, slot: number, origin: Axial, rng: () => number = Math.random): GameState {
  const piece = slotPiece(state, slot)
  if (state.over || !piece) return state
  const pre = previewPlacement(state.board, piece, origin)
  if (!pre) return state
  const board = [...pre.filled]
  const gauges = { ...state.gauges }
  const levels = { ...state.levels }
  const merges = slot === MERGE_SLOT ? state.merges.slice(1) : [...state.merges]
  const perColor = zero()
  for (const i of pre.cells) {
    perColor[board[i] as Color]++
    board[i] = null
  }
  let colors = 0
  for (const c of COLORS) {
    if (perColor[c] > 0) colors++
    gauges[c] += perColor[c]
    while (gauges[c] >= GAUGE_SIZE) {
      gauges[c] -= GAUGE_SIZE
      levels[c]++
      merges.push(c)
    }
  }
  const score = state.score + movePoints(piece.cells.length, pre.cells.size, colors)
  let tray: (Piece | null)[] = state.tray.map((p, i) => (i === slot ? null : p))
  if (tray.every((p) => p === null)) tray = randomTray(TRAY_SIZE, rng)
  return { board, tray, merges, score, gauges, levels, over: isGameOver(board, tray, merges) }
}

export interface Move { slot: number; q: number; r: number }

/** Every legal placement: each tray slot (and the merge slot) at each board origin that fits. */
export function legalMoves(state: GameState): Move[] {
  if (state.over) return []
  const out: Move[] = []
  for (let slot = 0; slot <= MERGE_SLOT; slot++) {
    const piece = slotPiece(state, slot)
    if (!piece) continue
    for (const { q, r } of CELLS) if (footprint(state.board, piece, { q, r })) out.push({ slot, q, r })
  }
  return out
}
