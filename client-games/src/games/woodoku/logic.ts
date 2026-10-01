import { randomTray, type Shape } from './pieces'

/** Board is BOARD_SIZE x BOARD_SIZE, split into boxes of BOX_SIZE. BOARD_SIZE must be a multiple of BOX_SIZE. */
export const BOARD_SIZE = 9
export const BOX_SIZE = 3
export const TRAY_SIZE = 3

/** Points for each cleared line (row, column or box) is CLEAR_POINTS * lines cleared in the same move. */
export const CLEAR_POINTS = 10
/** Bonus per consecutive clearing move beyond the first. */
export const STREAK_POINTS = 10

export type Board = readonly (readonly boolean[])[]

export interface GameState {
  board: Board
  /** Pieces in the tray; null once placed. */
  tray: readonly (Shape | null)[]
  score: number
  /** Consecutive placements that cleared at least one line. */
  streak: number
  over: boolean
}

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<boolean>(BOARD_SIZE).fill(false))
}

export function canPlace(board: Board, shape: Shape, row: number, col: number): boolean {
  return shape.every(([dr, dc]) => {
    const r = row + dr
    const c = col + dc
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && !board[r][c]
  })
}

function withCells(board: Board, shape: Shape, row: number, col: number): boolean[][] {
  const next = board.map((r) => [...r])
  for (const [dr, dc] of shape) next[row + dr][col + dc] = true
  return next
}

/** Cells that would clear if `board` (already holding the piece) were resolved, as "r,c" keys. */
export function fullLineCells(board: Board): { cells: Set<string>; lines: number } {
  const cells = new Set<string>()
  let lines = 0
  const add = (coords: [number, number][]) => {
    if (!coords.every(([r, c]) => board[r][c])) return
    lines++
    for (const [r, c] of coords) cells.add(`${r},${c}`)
  }
  for (let i = 0; i < BOARD_SIZE; i++) {
    add(Array.from({ length: BOARD_SIZE }, (_, k) => [i, k] as [number, number]))
    add(Array.from({ length: BOARD_SIZE }, (_, k) => [k, i] as [number, number]))
  }
  for (let br = 0; br < BOARD_SIZE; br += BOX_SIZE) {
    for (let bc = 0; bc < BOARD_SIZE; bc += BOX_SIZE) {
      const box: [number, number][] = []
      for (let r = 0; r < BOX_SIZE; r++) for (let c = 0; c < BOX_SIZE; c++) box.push([br + r, bc + c])
      add(box)
    }
  }
  return { cells, lines }
}

/** What dropping the piece at (row, col) would clear. Null if it does not fit. */
export function previewPlacement(board: Board, shape: Shape, row: number, col: number) {
  if (!canPlace(board, shape, row, col)) return null
  return fullLineCells(withCells(board, shape, row, col))
}

export function movePoints(placedCells: number, lines: number, streakAfter: number): number {
  const clear = lines * CLEAR_POINTS * lines
  const streak = lines > 0 && streakAfter > 1 ? (streakAfter - 1) * STREAK_POINTS : 0
  return placedCells + clear + streak
}

export function canPlaceAnywhere(board: Board, shape: Shape): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (canPlace(board, shape, r, c)) return true
  return false
}

export function isGameOver(board: Board, tray: readonly (Shape | null)[]): boolean {
  return tray.every((s) => s === null || !canPlaceAnywhere(board, s))
}

export function newGame(rng: () => number = Math.random): GameState {
  const board = emptyBoard()
  const tray = randomTray(TRAY_SIZE, rng)
  return { board, tray, score: 0, streak: 0, over: isGameOver(board, tray) }
}

/** Place tray piece `slot` at (row, col). Returns the same state if the move is illegal. */
export function place(
  state: GameState,
  slot: number,
  row: number,
  col: number,
  rng: () => number = Math.random,
): GameState {
  const shape = state.tray[slot]
  if (state.over || !shape || !canPlace(state.board, shape, row, col)) return state
  let board: boolean[][] = withCells(state.board, shape, row, col)
  const { cells, lines } = fullLineCells(board)
  for (const key of cells) {
    const [r, c] = key.split(',').map(Number)
    board[r][c] = false
  }
  const streak = lines > 0 ? state.streak + 1 : 0
  const score = state.score + movePoints(shape.length, lines, streak)
  let tray: (Shape | null)[] = state.tray.map((s, i) => (i === slot ? null : s))
  if (tray.every((s) => s === null)) tray = randomTray(TRAY_SIZE, rng)
  board = board.map((r) => [...r])
  return { board, tray, score, streak, over: isGameOver(board, tray) }
}
