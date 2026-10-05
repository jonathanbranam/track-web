import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameHook } from '../../lib/testHook'
import { STAGES, COVER_TARGET, LETTERS, apply, avg, legalMoves, newGame, setDifficulty, type Difficulty, type Move, type State } from './nato'
import { load, save, type Saved } from './storage'

const secs = (ms: number) => (ms / 1000).toFixed(2) + 's'

function fresh(saved: Saved): State {
  return newGame(Math.random, Date.now(), saved.misses, saved.difficulty)
}

export default function NatoGame() {
  const [saved, setSaved] = useState<Saved>(() => load())
  const [state, setState] = useState<State>(() => fresh(load()))
  const savedRef = useRef(saved)
  savedRef.current = saved
  const stateRef = useRef(state)
  stateRef.current = state

  const update = useCallback((next: State) => {
    const prev = stateRef.current
    if (next === prev) return
    stateRef.current = next
    setState(next)
    const cur = savedRef.current
    let s: Saved = { ...cur, misses: next.misses }
    if (next.idMs.length > prev.idMs.length && next.mistakesStage === prev.mistakesStage) {
      const t = next.idMs[next.idMs.length - 1]
      if (!cur.bestIdMs || t < cur.bestIdMs) s = { ...s, bestIdMs: t }
    }
    if (next.over && !prev.over && (!cur.bestRunMs || next.runMs < cur.bestRunMs)) s = { ...s, bestRunMs: next.runMs }
    setSaved(s)
    savedRef.current = s
    save(s)
  }, [])

  const chooseDifficulty = (d: Difficulty) => {
    const s = { ...savedRef.current, difficulty: d }
    setSaved(s)
    savedRef.current = s
    save(s)
    update(setDifficulty(stateRef.current, d))
  }

  const play = (m: Move) => update(apply(stateRef.current, m, Date.now(), Math.random))

  useGameHook<State, Move>({
    name: 'nato-alphabet',
    state,
    setState: update,
    legalMoves,
    apply: (s, m) => apply(s, m, Date.now(), Math.random),
    newGame: () => fresh(savedRef.current),
  })

  const stage = STAGES[state.stageIdx]
  useEffect(() => {
    if (state.phase !== 'flash' || stage.flashMs === null) return
    const t = setTimeout(() => play({ type: 'endFlash' }), stage.flashMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.id, state.stageIdx])

  const showId = state.phase === 'flash' || (state.phase === 'answer' && stage.flashMs === null)
  const lastId = state.idMs[state.idMs.length - 1]

  return (
    <div
      className="flex h-full w-full select-none flex-col items-center gap-4 bg-slate-900 px-3 py-4 text-slate-100"
      style={{ paddingBottom: 'calc(var(--sab) + 1rem)' }}
    >
      <div className="flex w-full max-w-md items-end justify-between" data-testid="nato-hud">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Stage {Math.min(state.stageIdx + 1, STAGES.length)} of {STAGES.length}
          </div>
          <div className="text-xl font-bold">{stage.name}</div>
          <div className="text-xs text-slate-400">
            {stage.flashMs === null ? 'ID stays on screen' : `ID shows ${secs(stage.flashMs)}`}
            {' - '}ID {state.idInStage + 1}
            {stage.flashMs === null
              ? ` - letters ${LETTERS.slice(0, stage.pool).filter((l) => (state.covered[l] ?? 0) >= COVER_TARGET).length}/${stage.pool}`
              : '/5'}
          </div>
          <div className="mt-1 flex gap-1 text-xs" data-testid="nato-difficulty">
            {(['medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => chooseDifficulty(d)}
                className={`rounded-full px-2 py-0.5 ${state.difficulty === d ? 'bg-amber-500 text-slate-900' : 'bg-slate-700'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>Best ID {saved.bestIdMs ? secs(saved.bestIdMs) : '-'}</div>
          <div>Best run {saved.bestRunMs ? secs(saved.bestRunMs) : '-'}</div>
        </div>
      </div>

      {(state.phase === 'flash' || state.phase === 'answer') && (
        <>
          <div className="flex gap-2 font-mono text-5xl font-bold" data-testid="nato-id">
            {state.id.split('').map((c, i) => (
              <span
                key={i}
                className={i === state.pos && state.phase === 'answer' ? 'text-amber-300' : i < state.pos ? 'text-emerald-400' : ''}
              >
                {showId || i < state.pos ? c : '?'}
              </span>
            ))}
          </div>
          {state.phase === 'flash' ? (
            <div className="mt-8 text-slate-400">Memorise it...</div>
          ) : (
            <div className="grid w-full max-w-md flex-1 grid-cols-2 gap-3" data-testid="nato-options">
              {state.options.map((w) => {
                const bad = state.wrong.includes(w)
                return (
                  <button
                    key={w}
                    disabled={bad}
                    onClick={() => play({ type: 'answer', word: w })}
                    className={`rounded-2xl text-2xl font-semibold active:scale-95 ${bad ? 'bg-rose-900 text-rose-300 line-through' : 'bg-slate-700'}`}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
          )}
          {lastId !== undefined && <div className="text-sm text-slate-400">Last ID: {secs(lastId)}</div>}
        </>
      )}

      {state.phase === 'stageDone' && (
        <div className="flex w-full max-w-md flex-col items-center gap-3" data-testid="nato-stage-done">
          <div className="text-2xl font-bold">{state.stageCleared ? 'Stage cleared' : 'Not quite - go again'}</div>
          <div className="text-slate-300">Average tap {secs(avg(state.tapMs))}</div>
          <div className="text-slate-300">Average ID {secs(avg(state.idMs))}</div>
          <div className="text-slate-300">Wrong taps {state.mistakesStage} (up to 2 allowed)</div>
          <button onClick={() => play({ type: 'next' })} className="mt-4 w-full rounded-2xl bg-amber-500 py-4 text-xl font-bold text-slate-900">
            {state.stageCleared ? 'Next stage' : 'Retry stage'}
          </button>
        </div>
      )}

      {state.phase === 'over' && (
        <div className="flex w-full max-w-md flex-col items-center gap-3" data-testid="nato-over">
          <div className="text-2xl font-bold">All stages cleared</div>
          <div className="text-slate-300">Run time {secs(state.runMs)}</div>
          <div className="text-slate-300">Best run {secs(saved.bestRunMs)}</div>
          <button
            onClick={() => update(fresh(savedRef.current))}
            className="mt-4 w-full rounded-2xl bg-amber-500 py-4 text-xl font-bold text-slate-900"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  )
}
