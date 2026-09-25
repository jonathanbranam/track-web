import { useEffect, useRef } from 'react'
import type { LevelChoice, OrbitalLevel } from './levels'

interface LevelPickerProps {
  /** Saved levels, or null when they could not be loaded. */
  levels: OrbitalLevel[] | null
  /** The entry to pre-select (the last level played). Never auto-starts. */
  preselected: LevelChoice
  onPlayRandom: () => void
  onCreateNew: () => void
  onPlay: (level: OrbitalLevel) => void
  onEdit: (level: OrbitalLevel) => void
}

const rowBase = 'flex items-center gap-2 rounded-xl border px-3 py-2.5'
const rowIdle = 'border-gray-700 bg-gray-800/70'
const rowSelected = 'border-indigo-400 bg-indigo-950/60'
const playBtn =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700'
const editBtn =
  'rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700 active:bg-gray-800'

/**
 * Chosen before every game: Random level, Create new, then each saved level
 * with Play and Edit. The last level played is highlighted and scrolled to.
 */
export default function LevelPicker({ levels, preselected, onPlayRandom, onCreateNew, onPlay, onEdit }: LevelPickerProps) {
  const selectedRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-gray-900/85 px-4 backdrop-blur-sm"
      // The heading shares a row with the tuning toggle (top: --sat + 4rem, right).
      style={{ paddingTop: 'calc(var(--sat) + 4rem)', paddingBottom: 'calc(var(--sab) + 1rem)' }}
      data-testid="level-picker"
    >
      <h2 className="mx-auto mb-4 flex h-9 w-full max-w-sm items-center pr-12 text-2xl font-bold">Choose a Level</h2>
      <ul className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-2 overflow-y-auto pb-2">
        <li ref={preselected === 'random' ? selectedRef : undefined} className={`${rowBase} ${preselected === 'random' ? rowSelected : rowIdle}`}>
          <div className="flex-1">
            <div className="font-semibold">Random level</div>
            <div className="text-xs text-gray-400">A new layout every time</div>
          </div>
          <button onClick={onPlayRandom} className={playBtn}>Play</button>
        </li>
        <li className={`${rowBase} ${rowIdle}`}>
          <div className="flex-1">
            <div className="font-semibold">Create new</div>
            <div className="text-xs text-gray-400">Start from a random layout</div>
          </div>
          <button onClick={onCreateNew} className={editBtn}>Create</button>
        </li>

        {levels === null ? (
          <li className="px-1 pt-2 text-sm text-gray-400" role="status">
            Saved levels are unavailable right now.
          </li>
        ) : levels.length === 0 ? (
          <li className="px-1 pt-2 text-sm text-gray-500">No saved levels yet.</li>
        ) : (
          [...levels].sort((a, b) => a.name.localeCompare(b.name)).map((level) => {
            const selected = preselected === level.id
            return (
              <li
                key={level.id}
                ref={selected ? selectedRef : undefined}
                className={`${rowBase} ${selected ? rowSelected : rowIdle}`}
                data-testid="level-row"
              >
                <div className="min-w-0 flex-1 truncate font-semibold">{level.name}</div>
                <button onClick={() => onEdit(level)} className={editBtn}>Edit</button>
                <button onClick={() => onPlay(level)} className={playBtn}>Play</button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
