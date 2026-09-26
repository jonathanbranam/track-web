import { useEffect, useRef } from 'react'
import type { Level } from './levels'

interface LevelPickerProps {
  levels: Level[]
  /** The level to highlight (the last one played). Never auto-starts. */
  preselected: string
  onPlay: (level: Level) => void
}

const rowBase = 'flex items-center gap-3 rounded-xl border px-3 py-2.5'
const rowIdle = 'border-gray-700 bg-gray-800/70'
const rowSelected = 'border-indigo-400 bg-indigo-950/60'
const playBtn =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700'

const PIECE_ICONS: Record<string, string> = { wind: '≋ wind', asteroids: '◆ asteroids', radiation: '☢ radiation' }

/** Every level in sequence order; any can be played, nothing is locked. */
export default function LevelPicker({ levels, preselected, onPlay }: LevelPickerProps) {
  const selectedRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-gray-900/85 px-4 backdrop-blur-sm"
      style={{ paddingTop: 'calc(var(--sat) + 4rem)', paddingBottom: 'calc(var(--sab) + 1rem)' }}
      data-testid="level-picker"
    >
      <h2 className="mx-auto mb-1 flex h-9 w-full max-w-sm items-center pr-12 text-2xl font-bold">Space Golf</h2>
      <p className="mx-auto mb-4 w-full max-w-sm text-xs leading-relaxed text-gray-400">
        Shoot from orbit to orbit. Collect the stars, then dive into the wormhole. Stars are worth far more than saving
        strokes.
      </p>
      <ol className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-2 overflow-y-auto pb-2">
        {levels.map((level, i) => {
          const selected = level.id === preselected
          const kinds = [...new Set(level.pieces.map((p) => p.kind))]
          return (
            <li
              key={level.id}
              ref={selected ? selectedRef : undefined}
              className={`${rowBase} ${selected ? rowSelected : rowIdle}`}
              data-testid="level-row"
            >
              <div className="w-6 text-center text-lg font-bold text-gray-500">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{level.name}</div>
                <div className="text-xs leading-snug text-gray-400">{level.blurb}</div>
                <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-gray-500">
                  <span>★ {level.stars.length}</span>
                  <span>{level.sides === 'wrap' ? '⇄ wrap' : '▯ walls'}</span>
                  {kinds.map((k) => (
                    <span key={k}>{PIECE_ICONS[k]}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => onPlay(level)} className={playBtn}>
                Play
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
