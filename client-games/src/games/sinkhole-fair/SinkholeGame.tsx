import { useCallback, useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import PhaserGame from '../PhaserGame'
import SinkholeScene, { MODE_KEY, type EndState, type HudState, type StickState } from './SinkholeScene'
import { loadBest, saveBest } from './storage'
import type { Mode } from './rules'

const MODES: { mode: Mode; name: string; blurb: string }[] = [
  { mode: 'classic', name: 'Classic', blurb: '2 minutes against 4 bots. Biggest hole wins.' },
  { mode: 'solo', name: 'Solo', blurb: '2 minutes, no bots. Eat as much of the fair as you can.' },
]

const fmtClock = (ms: number): string => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const unit = (mode: Mode): string => (mode === 'classic' ? 'mass' : 'points')

interface Run {
  mode: Mode
  key: number
}

export default function SinkholeGame() {
  const [run, setRun] = useState<Run | null>(null)
  const [hud, setHud] = useState<HudState | null>(null)
  const [stick, setStick] = useState<StickState | null>(null)
  const [end, setEnd] = useState<EndState | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [bests, setBests] = useState({ classic: loadBest('classic'), solo: loadBest('solo') })
  const modeRef = useRef<Mode>('classic')

  const start = (mode: Mode) => {
    modeRef.current = mode
    setHud(null)
    setStick(null)
    setEnd(null)
    setNewBest(false)
    setRun((r) => ({ mode, key: (r?.key ?? 0) + 1 }))
  }

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#3b5b2a',
      scale: { mode: Phaser.Scale.RESIZE },
      // Keep Phaser from adding window-level touch/mouse listeners that suppress the
      // synthesized clicks the overlay buttons need (kb/phaser-mobile-input.md, Fix 2).
      input: { windowEvents: false },
      callbacks: { preBoot: (game) => game.registry.set(MODE_KEY, modeRef.current) },
      scene: [SinkholeScene],
    }),
    [],
  )

  const onGameReady = useCallback((game: Phaser.Game) => {
    game.events.on('hud', (h: HudState) => setHud(h))
    game.events.on('stick', (s: StickState) => setStick(s))
    game.events.on('end', (e: EndState) => {
      setEnd(e)
      setStick(null)
      if (e.score > loadBest(e.mode)) {
        saveBest(e.mode, e.score)
        setBests((b) => ({ ...b, [e.mode]: e.score }))
        setNewBest(true)
      }
    })
  }, [])

  // The shell owns the keyboard shortcut for starting over; the scene owns steering.
  useEffect(() => {
    if (!end) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') start(end.mode)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [end])

  if (!run) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-green-900 px-6 text-center text-white">
        <div>
          <h1 className="text-3xl font-extrabold">Sinkhole Fair</h1>
          <p className="mt-2 max-w-xs text-sm text-green-100">
            Drive a hole around the county fair. Swallow what is smaller than you, grow, then swallow the big stuff.
            Drag anywhere to steer; WASD or arrows on a keyboard.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          {MODES.map((m) => (
            <button key={m.mode} onClick={() => start(m.mode)} className="rounded-xl bg-gray-900/70 px-4 py-3 text-left hover:bg-gray-900 active:bg-black">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold">{m.name}</span>
                <span className="text-xs text-green-200">Best {bests[m.mode] || '-'}</span>
              </div>
              <div className="text-xs text-green-100">{m.blurb}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <PhaserGame key={run.key} buildConfig={buildConfig} onGameReady={onGameReady} />

      {hud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2 text-white">
          <div className="rounded-lg bg-gray-900/70 px-3 py-1.5">
            <div className="text-2xl font-bold tabular-nums">{fmtClock(hud.remainingMs)}</div>
            <div className="text-xs text-gray-300">Level {hud.level}{hud.respawning ? ' - respawning' : ''}</div>
          </div>
          {run.mode === 'classic' && (
            <div className="min-w-[8.5rem] rounded-lg bg-gray-900/70 px-3 py-1.5 text-xs">
              {hud.rows.slice(0, 5).map((r, i) => (
                <div key={r.name} className={`flex justify-between gap-3 ${r.you ? 'font-bold text-yellow-300' : ''}`}>
                  <span>{i + 1}. {r.name}</span>
                  <span className="tabular-nums">{r.mass}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hud && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 text-white">
          <div className="mb-1 flex justify-between text-xs">
            <span>{run.mode === 'classic' ? `Rank ${hud.rank} of ${hud.rows.length}` : 'Solo'}</span>
            <span>{hud.percent.toFixed(0)}% eaten</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-gray-900/70">
            <div className="h-full bg-yellow-400" style={{ width: `${Math.min(100, hud.percent)}%` }} />
          </div>
        </div>
      )}

      {stick?.active && (
        <div className="pointer-events-none absolute" style={{ left: stick.ox, top: stick.oy }}>
          <div className="absolute h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
          <div
            className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50"
            style={{ left: clamp(stick.x - stick.ox), top: clamp(stick.y - stick.oy) }}
          />
        </div>
      )}

      {end && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-gray-800 p-5 text-center text-white">
            <h2 className="text-xl font-bold">{end.mode === 'classic' ? (end.rows[0]?.you ? 'You win!' : 'Time!') : end.cleared ? 'Fair cleared!' : 'Time!'}</h2>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{end.score}</div>
            <div className="text-xs text-gray-400">
              {unit(end.mode)}{end.mode === 'solo' ? ` (${end.percent.toFixed(0)}% eaten)` : ''}
              {newBest ? ' - new best!' : ` - best ${bests[end.mode]}`}
            </div>
            {end.mode === 'classic' && (
              <div className="mt-3 space-y-0.5 text-left text-sm">
                {end.rows.map((r, i) => (
                  <div key={r.name} className={`flex justify-between ${r.you ? 'font-bold text-yellow-300' : ''}`}>
                    <span>{i + 1}. {r.name}{r.bot ? ' [bot]' : ''}</span>
                    <span className="tabular-nums">{r.mass}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => start(end.mode)} className="flex-1 rounded-lg bg-yellow-500 py-2 font-semibold text-gray-900 hover:bg-yellow-400">Play again</button>
              <button onClick={() => setRun(null)} className="flex-1 rounded-lg bg-gray-700 py-2 font-semibold hover:bg-gray-600">Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Keeps the joystick knob inside the ring. */
function clamp(v: number): number {
  return Math.max(-60, Math.min(60, v))
}
