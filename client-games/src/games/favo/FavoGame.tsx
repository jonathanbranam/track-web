import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hexToPixel } from '../hex-block/hex'
import { CELLS, GAUGE_SIZE, MERGE_SLOT, RADIUS, TRAY_SIZE, newGame, place, previewPlacement, rotateSlot, slotPiece, type GameState } from './logic'
import { SYMBOLS, rotatePiece, type Color, type Piece } from './pieces'
import { LIFT_SIZES, snapOrigin } from '../hex-block/dragMath'
import { loadBest, saveBest } from './storage'

const TRAY_SCALE = 0.6
const SPRING_MS = 180
const TAP_SLOP = 8
/** Hex size in SVG units for the board; the SVG is scaled to the screen with its viewBox. */
const UNIT = 30
const BOARD_W = Math.sqrt(3) * UNIT * (2 * RADIUS + 1)
const BOARD_H = UNIT * (3 * RADIUS + 2)

const FILL: Record<Color, string> = { red: '#e5484d', blue: '#3b82f6', green: '#22c55e' }
const GLYPH: Record<'bird' | 'note' | 'leaf', string> = {
  bird: 'M-8 2 Q-4 -6 0 0 Q4 -6 8 2 Q4 -1 0 4 Q-4 -1 -8 2Z',
  note: 'M-3 5 a3 2.4 0 1 0 0.1 0 M0 4.5 V-6 Q4 -4 4 0',
  leaf: 'M-6 6 C-6 -3 0 -6 6 -6 C6 0 2 6 -6 6Z M-6 6 L2 -2',
}

function hexPoints(cx: number, cy: number, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`
  }).join(' ')
}

/** One tile: coloured hex with its colour's outline symbol. */
function Tile({ x, y, size, color, opacity = 1 }: { x: number; y: number; size: number; color: Color; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <polygon points={hexPoints(x, y, size - 1.5)} fill={FILL[color]} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
      <path
        d={GLYPH[SYMBOLS[color]]}
        transform={`translate(${x} ${y}) scale(${size / 30})`}
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/** Merge panels get a white ring so they read as special. */
function PieceSvg({ piece, size }: { piece: Piece; size: number }) {
  const pts = piece.cells.map((c) => hexToPixel(c.q, c.r, size))
  const pad = size
  const minX = Math.min(...pts.map((p) => p.x)) - pad
  const maxX = Math.max(...pts.map((p) => p.x)) + pad
  const minY = Math.min(...pts.map((p) => p.y)) - pad
  const maxY = Math.max(...pts.map((p) => p.y)) + pad
  return (
    <svg width={maxX - minX} height={maxY - minY} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
      {pts.map((p, i) => (
        <g key={i}>
          <Tile x={p.x} y={p.y} size={size} color={piece.colors[i]} />
          {piece.merge && <polygon points={hexPoints(p.x, p.y, size - 1.5)} fill="none" stroke="white" strokeWidth={2.5} />}
        </g>
      ))}
    </svg>
  )
}

interface Drag {
  slot: number
  piece: Piece
  x: number // client coords of the fingertip
  y: number
  startX: number
  startY: number
  /** False until the finger has travelled past TAP_SLOP: a release before that is a tap. */
  moved: boolean
}

interface Spring {
  slot: number
  piece: Piece
  x: number
  y: number
  toX: number
  toY: number
  moving: boolean
}

export default function FavoGame() {
  const [state, setState] = useState<GameState>(() => newGame())
  const [best, setBest] = useState(() => loadBest())
  const [drag, setDrag] = useState<Drag | null>(null)
  const [spring, setSpring] = useState<Spring | null>(null)
  const [sizePx, setSizePx] = useState(24)
  const boardRef = useRef<SVGSVGElement>(null)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  const springTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const measure = () => setSizePx((el.clientWidth / BOARD_W) * UNIT)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
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
    if (!drag || !drag.moved || !boardRef.current) return null
    const rect = boardRef.current.getBoundingClientRect()
    const cx = drag.x - (rect.left + rect.width / 2)
    const cy = drag.y - LIFT_SIZES * sizePx - (rect.top + rect.height / 2)
    const origin = snapOrigin(drag.piece.cells, cx, cy, sizePx)
    const preview = previewPlacement(state.board, drag.piece, origin)
    return preview ? { origin, preview } : null
  }, [drag, sizePx, state.board])

  const onPointerDown = (slot: number) => (e: React.PointerEvent) => {
    const piece = slotPiece(state, slot)
    if (!piece || state.over || spring) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ slot, piece, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    setDrag((d) =>
      d ? { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > TAP_SLOP } : d,
    )
  }

  const onPointerUp = () => {
    if (!drag) return
    if (!drag.moved) {
      setState((s) => rotateSlot(s, drag.slot, rotatePiece))
      setDrag(null)
      return
    }
    if (target) {
      setState((s) => place(s, drag.slot, target.origin))
      setDrag(null)
      return
    }
    // Invalid drop: spring the piece back to its tray slot.
    const slotRect = slotRefs.current[drag.slot]?.getBoundingClientRect()
    const from = { x: drag.x, y: drag.y - LIFT_SIZES * sizePx }
    const to = slotRect ? { x: slotRect.left + slotRect.width / 2, y: slotRect.top + slotRect.height / 2 } : from
    setSpring({ slot: drag.slot, piece: drag.piece, x: from.x, y: from.y, toX: to.x, toY: to.y, moving: false })
    setDrag(null)
    requestAnimationFrame(() => requestAnimationFrame(() => setSpring((s) => (s ? { ...s, moving: true } : s))))
    springTimer.current = setTimeout(() => setSpring(null), SPRING_MS + 40)
  }

  const restart = useCallback(() => {
    setDrag(null)
    setState(newGame())
  }, [])

  const ghost = useMemo(() => {
    const map = new Map<number, Color>()
    if (target && drag) target.preview.covered.forEach((i, k) => map.set(i, drag.piece.colors[k]))
    return map
  }, [drag, target])

  const trayBox = sizePx * TRAY_SCALE * 4

  return (
    <div
      className="flex h-full w-full select-none flex-col items-center justify-between bg-slate-900 px-3 py-3 text-slate-100"
      style={{ touchAction: 'none', paddingBottom: 'calc(var(--sab) + 0.75rem)' }}
    >
      <div className="flex w-full max-w-md items-end justify-between" data-testid="favo-hud">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Score</div>
          <div className="text-3xl font-bold tabular-nums" data-testid="favo-score">{state.score}</div>
        </div>
        <div className="flex gap-3 text-xs tabular-nums" data-testid="favo-gauges">
          {(['red', 'blue', 'green'] as Color[]).map((c) => (
            <div key={c} className="flex flex-col items-center gap-1" title={SYMBOLS[c]}>
              <svg width={22} height={22} viewBox="-12 -12 24 24">
                <circle r={11} fill={FILL[c]} />
                <path d={GLYPH[SYMBOLS[c]]} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="h-1.5 w-12 overflow-hidden rounded bg-slate-700">
                <div className="h-full" style={{ width: `${(state.gauges[c] / GAUGE_SIZE) * 100}%`, background: FILL[c] }} data-testid={`favo-gauge-${SYMBOLS[c]}`} />
              </div>
              <span>Lv {state.levels[c] + 1}</span>
            </div>
          ))}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-400">Best</div>
          <div className="text-xl font-semibold tabular-nums" data-testid="favo-best">{best}</div>
        </div>
      </div>

      <svg
        ref={boardRef}
        viewBox={`${-BOARD_W / 2} ${-BOARD_H / 2} ${BOARD_W} ${BOARD_H}`}
        className="w-full max-w-md"
        style={{ maxHeight: '55vh', maxWidth: `${55 * (BOARD_W / BOARD_H)}vh` }}
        data-testid="favo-board"
      >
        {CELLS.map((c, i) => {
          const { x, y } = hexToPixel(c.q, c.r, UNIT)
          const filled = state.board[i]
          const ghostColor = ghost.get(i)
          const clearing = target?.preview.cells.has(i)
          return (
            <g key={i}>
              <polygon points={hexPoints(x, y, UNIT - 1.5)} fill="#1e293b" stroke="#334155" strokeWidth={1} />
              {filled && <Tile x={x} y={y} size={UNIT} color={filled} />}
              {ghostColor && <Tile x={x} y={y} size={UNIT} color={ghostColor} opacity={0.7} />}
              {clearing && (
                <polygon points={hexPoints(x, y, UNIT - 1.5)} fill="rgba(254,240,138,0.55)" stroke="white" strokeWidth={2} />
              )}
            </g>
          )
        })}
      </svg>

      <div className="flex w-full max-w-md items-center justify-around" style={{ minHeight: trayBox + 8 }}>
        {Array.from({ length: TRAY_SIZE + 1 }, (_, i) => {
          const piece = slotPiece(state, i)
          const hidden = (drag?.moved && drag.slot === i) || spring?.slot === i
          return (
            <div
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el
              }}
              className="flex items-center justify-center"
              style={{ width: trayBox + 8, height: trayBox + 8, touchAction: 'none', opacity: i === MERGE_SLOT ? 0.95 : 1 }}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              data-testid={`favo-slot-${i}`}
            >
              {piece && !hidden && <PieceSvg piece={piece} size={sizePx * TRAY_SCALE} />}
            </div>
          )
        })}
      </div>

      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-30 opacity-90"
          style={{ left: drag.x, top: drag.y - LIFT_SIZES * sizePx, transform: 'translate(-50%, -50%)' }}
        >
          <PieceSvg piece={drag.piece} size={sizePx} />
        </div>
      )}
      {spring && (
        <div
          className="pointer-events-none fixed z-30"
          style={{
            left: spring.moving ? spring.toX : spring.x,
            top: spring.moving ? spring.toY : spring.y,
            transform: `translate(-50%, -50%) scale(${spring.moving ? TRAY_SCALE : 1})`,
            transition: `left ${SPRING_MS}ms ease-out, top ${SPRING_MS}ms ease-out, transform ${SPRING_MS}ms ease-out`,
          }}
        >
          <PieceSvg piece={spring.piece} size={sizePx} />
        </div>
      )}

      {state.over && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 px-4">
          <h2 className="text-3xl font-bold">Game Over</h2>
          <p className="text-lg tabular-nums">Score {state.score}</p>
          <p className="text-sm text-slate-300">Best {best}</p>
          <button onClick={restart} className="rounded-xl bg-sky-500 px-8 py-3 font-bold text-slate-950">
            Play again
          </button>
        </div>
      )}
    </div>
  )
}
