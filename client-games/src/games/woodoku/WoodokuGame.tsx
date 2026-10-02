import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BOARD_SIZE, BOX_SIZE, TRAY_SIZE, legalMoves, newGame, place, previewPlacement, type GameState } from './logic'
import { shapeSize, type Shape } from './pieces'
import { LIFT_CELLS, snapCell } from './dragMath'
import { useGameHook } from '../../lib/testHook'
import { loadBest, saveBest } from './storage'

const TRAY_SCALE = 0.55
const SPRING_MS = 180

interface Drag {
  slot: number
  shape: Shape
  x: number // client coords of the fingertip
  y: number
}

interface Spring {
  slot: number
  shape: Shape
  x: number // client coords of the piece centre
  y: number
  toX: number
  toY: number
  moving: boolean
}

function Piece({ shape, cell, color = 'bg-amber-300' }: { shape: Shape; cell: number; color?: string }) {
  const { rows, cols } = shapeSize(shape)
  return (
    <div className="relative" style={{ width: cols * cell, height: rows * cell }}>
      {shape.map(([r, c]) => (
        <div
          key={`${r},${c}`}
          className={`absolute rounded-[3px] border border-amber-900/60 ${color}`}
          style={{ left: c * cell + 1, top: r * cell + 1, width: cell - 2, height: cell - 2 }}
        />
      ))}
    </div>
  )
}

export default function WoodokuGame() {
  const [state, setState] = useState<GameState>(() => newGame())
  useGameHook({ name: 'woodoku', state, setState, legalMoves, apply: (s, m) => place(s, m.slot, m.row, m.col), newGame })
  const [best, setBest] = useState(() => loadBest())
  const [drag, setDrag] = useState<Drag | null>(null)
  const [spring, setSpring] = useState<Spring | null>(null)
  const [cell, setCell] = useState(36)
  const boardRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  const springTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setCell(el.clientWidth / BOARD_SIZE))
    ro.observe(el)
    setCell(el.clientWidth / BOARD_SIZE)
    return () => ro.disconnect()
  }, [])

  useEffect(() => () => {
    if (springTimer.current) clearTimeout(springTimer.current)
  }, [])

  useEffect(() => {
    if (state.score > best) {
      setBest(state.score)
      saveBest(state.score)
    }
  }, [state.score, best])

  const target = useMemo(() => {
    if (!drag || !boardRef.current) return null
    const rect = boardRef.current.getBoundingClientRect()
    const cx = drag.x - rect.left
    const cy = drag.y - LIFT_CELLS * cell - rect.top
    const { row, col } = snapCell(drag.shape, cx, cy, cell)
    const preview = previewPlacement(state.board, drag.shape, row, col)
    return preview ? { row, col, preview } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, cell, state.board])

  const onPointerDown = (slot: number) => (e: React.PointerEvent) => {
    const shape = state.tray[slot]
    if (!shape || state.over || spring) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ slot, shape, x: e.clientX, y: e.clientY })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
  }

  const onPointerUp = () => {
    if (!drag) return
    if (target) {
      setState((s) => place(s, drag.slot, target.row, target.col))
      setDrag(null)
      return
    }
    // Invalid drop: spring the piece back to its tray slot.
    const slotRect = slotRefs.current[drag.slot]?.getBoundingClientRect()
    const from = { x: drag.x, y: drag.y - LIFT_CELLS * cell }
    const to = slotRect
      ? { x: slotRect.left + slotRect.width / 2, y: slotRect.top + slotRect.height / 2 }
      : from
    setSpring({ slot: drag.slot, shape: drag.shape, x: from.x, y: from.y, toX: to.x, toY: to.y, moving: false })
    setDrag(null)
    requestAnimationFrame(() => requestAnimationFrame(() => setSpring((s) => (s ? { ...s, moving: true } : s))))
    springTimer.current = setTimeout(() => setSpring(null), SPRING_MS + 40)
  }

  const restart = useCallback(() => {
    setDrag(null)
    setState(newGame())
  }, [])

  const previewCells = useMemo(() => {
    const set = new Set<string>()
    if (drag && target) for (const [dr, dc] of drag.shape) set.add(`${target.row + dr},${target.col + dc}`)
    return set
  }, [drag, target])

  const boxClass = (r: number, c: number) =>
    `${r % BOX_SIZE === 0 && r > 0 ? 'border-t-2' : ''} ${c % BOX_SIZE === 0 && c > 0 ? 'border-l-2' : ''}`

  return (
    <div
      className="flex h-full w-full select-none flex-col items-center justify-between bg-[#3b2616] px-3 py-3 text-amber-50"
      style={{ touchAction: 'none', paddingBottom: 'calc(var(--sab) + 0.75rem)' }}
    >
      <div className="flex w-full max-w-md items-end justify-between" data-testid="woodoku-hud">
        <div>
          <div className="text-xs uppercase tracking-wide text-amber-200/70">Score</div>
          <div className="text-3xl font-bold tabular-nums" data-testid="woodoku-score">{state.score}</div>
        </div>
        <div className="text-center text-xs text-amber-200/80">
          {state.streak > 1 ? `Streak ×${state.streak}` : ''}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-amber-200/70">Best</div>
          <div className="text-xl font-semibold tabular-nums" data-testid="woodoku-best">{best}</div>
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative grid w-full max-w-md rounded-lg border-4 border-amber-950 bg-amber-900/60 shadow-xl"
        style={{
          aspectRatio: '1',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          maxHeight: '55vh',
          maxWidth: '55vh',
        }}
        data-testid="woodoku-board"
      >
        {state.board.map((row, r) =>
          row.map((filled, c) => {
            const key = `${r},${c}`
            const ghost = previewCells.has(key)
            const clearing = target?.preview.cells.has(key)
            return (
              <div key={key} className={`border border-amber-950/50 p-[1px] ${boxClass(r, c)} border-amber-950`}>
                <div
                  className={`h-full w-full rounded-[3px] ${
                    clearing && (filled || ghost)
                      ? 'bg-yellow-200 ring-2 ring-white'
                      : ghost
                        ? 'bg-amber-300/70'
                        : filled
                          ? 'bg-amber-400 border border-amber-900/60'
                          : clearing
                            ? 'bg-yellow-200/80'
                            : 'bg-amber-950/30'
                  }`}
                />
              </div>
            )
          }),
        )}
      </div>

      <div className="flex w-full max-w-md items-center justify-around" style={{ minHeight: 5 * cell * TRAY_SCALE + 16 }}>
        {Array.from({ length: TRAY_SIZE }, (_, i) => {
          const shape = state.tray[i]
          const hidden = drag?.slot === i || spring?.slot === i
          return (
            <div
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el
              }}
              className="flex items-center justify-center"
              style={{ width: 5 * cell * TRAY_SCALE + 8, height: 5 * cell * TRAY_SCALE + 8, touchAction: 'none' }}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              data-testid={`woodoku-slot-${i}`}
            >
              {shape && !hidden && <Piece shape={shape} cell={cell * TRAY_SCALE} />}
            </div>
          )
        })}
      </div>

      {drag && (
        <div
          className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-1/2 opacity-90"
          style={{ left: drag.x, top: drag.y - LIFT_CELLS * cell }}
        >
          <Piece shape={drag.shape} cell={cell} />
        </div>
      )}
      {spring && (
        <div
          className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: spring.moving ? spring.toX : spring.x,
            top: spring.moving ? spring.toY : spring.y,
            transform: `translate(-50%, -50%) scale(${spring.moving ? TRAY_SCALE : 1})`,
            transition: `left ${SPRING_MS}ms ease-out, top ${SPRING_MS}ms ease-out, transform ${SPRING_MS}ms ease-out`,
          }}
        >
          <Piece shape={spring.shape} cell={cell} />
        </div>
      )}

      {state.over && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 px-4">
          <h2 className="text-3xl font-bold">Game Over</h2>
          <p className="text-lg tabular-nums">Score {state.score}</p>
          <p className="text-sm text-amber-200/80">Best {best}</p>
          <button onClick={restart} className="rounded-xl bg-amber-500 px-8 py-3 font-bold text-amber-950">
            Play again
          </button>
        </div>
      )}
    </div>
  )
}
