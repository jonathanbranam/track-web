import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { useAuth } from '@repo/auth'
import PhaserGame from '../PhaserGame'
import OrbitalDodgerScene, { GAME_W, GAME_H } from './OrbitalDodgerScene'
import Leaderboard from '../../components/Leaderboard'
import { submitScore, fetchLeaderboard, type LeaderboardEntry } from '../../api'
import type { LossReason, Tuning } from './physics'

const GAME_SLUG = 'orbital-dodger'
const MODE = 'classic'
const LEVEL = 'classic'

// Dev-only: the dynamic import lets Vite drop the panel from a production build.
const TuningPanel = import.meta.env.DEV ? lazy(() => import('./TuningPanel')) : null

type EndReason = LossReason | 'quit'

const END_HEADINGS: Record<EndReason, string> = {
  crash: 'Crashed',
  'out-of-bounds': 'Lost in Space',
  'out-of-fuel': 'Out of Fuel',
  quit: 'You Quit',
}

const END_BLURBS: Record<EndReason, string> = {
  crash: 'You flew into a planet.',
  'out-of-bounds': 'You drifted out of the system.',
  'out-of-fuel': 'Your tank ran dry mid-orbit.',
  quit: 'You ended the run.',
}

export default function OrbitalDodgerGame() {
  const { displayName, userId } = useAuth()
  const [score, setScore] = useState(0)
  const [fuel, setFuel] = useState(1)
  const [shields, setShields] = useState(0)
  const [fuelGrace, setFuelGrace] = useState<number | null>(null)
  const [maxShields, setMaxShields] = useState(0)
  const [ended, setEnded] = useState(false)
  const [reason, setReason] = useState<EndReason>('crash')
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [tuning, setTuning] = useState<Tuning | null>(null)

  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<OrbitalDodgerScene | null>(null)
  const scoreRef = useRef(0)

  const playerName = displayName ?? (userId !== null ? String(userId) : null)

  const openLeaderboard = useCallback(async () => {
    setLeaderboardOpen(true)
    setLoading(true)
    setError(false)
    try {
      setEntries(await fetchLeaderboard(GAME_SLUG, MODE, LEVEL))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Submission is awaited before the fetch so the player's own new score is in
  // the ranking they are shown. submitScore already skips score <= 0 and
  // swallows failures, so the overlay renders either way.
  const finishRun = useCallback(async (finalScore: number, why: EndReason) => {
    setReason(why)
    setEnded(true)
    await submitScore(GAME_SLUG, MODE, LEVEL, finalScore)
    await openLeaderboard()
  }, [openLeaderboard])

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: '#0a0e1c',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // No physics engine: gravity here is per-planet inverse-square and a planet
      // contact ends the run, so there is no collision response to solve.
      //
      // Prevent Phaser from adding window-level touchend/mousemove listeners that
      // call preventDefault() and suppress the synthesized click events React
      // overlay buttons depend on (kb/phaser-mobile-input.md, Fix 2).
      input: { windowEvents: false },
      scene: OrbitalDodgerScene,
    }),
    [],
  )

  const onGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    game.events.on('score', (v: number) => {
      setScore(v)
      scoreRef.current = v
    })
    game.events.on('fuel', (pct: number) => setFuel(pct))
    game.events.on('fuel-grace', (s: number | null) => setFuelGrace(s))
    game.events.on('shields', (n: number) => {
      setShields(n)
      // The scene emits the full count at run start, so the high-water mark is
      // the run's starting charges — enough to draw spent pips as empty.
      setMaxShields((m) => Math.max(m, n))
    })
    game.events.on('gameover', (finalScore: number, why: LossReason) => {
      scoreRef.current = finalScore
      void finishRun(finalScore, why)
    })
  }, [finishRun])

  // The scene instance only exists after boot; grab it for quit() and dev tuning.
  useEffect(() => {
    const id = setInterval(() => {
      const scene = gameRef.current?.scene.getScene('OrbitalDodgerScene') as OrbitalDodgerScene | null
      if (scene) {
        sceneRef.current = scene
        setTuning(scene.tuning)
        // Dev-only handle so browser automation can stage exact situations.
        if (import.meta.env.DEV) (window as unknown as { __orbitalScene?: OrbitalDodgerScene }).__orbitalScene = scene
        clearInterval(id)
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  const quit = useCallback(() => {
    const finalScore = sceneRef.current?.quit() ?? scoreRef.current
    void finishRun(finalScore, 'quit')
  }, [finishRun])

  const restart = useCallback((newLayout: boolean) => {
    setEnded(false)
    setScore(0)
    setFuel(1)
    setFuelGrace(null)
    setMaxShields(0)
    setLeaderboardOpen(false)
    setEntries([])
    gameRef.current?.events.emit(newLayout ? 'new-layout' : 'retry')
  }, [])

  const fuelColor = fuel < 0.25 ? 'bg-red-400' : fuel < 0.5 ? 'bg-orange-300' : 'bg-sky-300'

  return (
    <div className="relative h-full w-full">
      {/* HUD */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-2 z-10 flex items-start justify-between px-4"
        style={{ paddingTop: 'var(--sat)' }}
      >
        <div className="rounded-lg bg-gray-800/80 px-3 py-1">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Score</div>
          <div className="text-xl font-bold tabular-nums">{score.toLocaleString()}</div>
        </div>

        <div className="flex flex-col items-center pt-1">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Fuel</div>
          <div className="h-2 w-[110px] overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-full transition-[width,background-color] duration-100 ${fuelColor}`}
              style={{ width: `${Math.max(0, Math.min(1, fuel)) * 100}%` }}
            />
          </div>
          {fuelGrace !== null && !ended && (
            <div className="mt-1 text-[11px] font-semibold tabular-nums text-red-400">
              Empty — {fuelGrace.toFixed(1)}s
            </div>
          )}
          {maxShields > 0 && (
            <div className="mt-1.5 flex gap-1" aria-label={`Shields: ${shields} of ${maxShields}`}>
              {Array.from({ length: maxShields }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full border border-emerald-300 ${i < shields ? 'bg-emerald-300' : 'bg-transparent opacity-40'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex gap-2">
          {!ended && (
            <button
              onClick={quit}
              className="rounded-lg bg-gray-800/80 p-2 text-gray-400 hover:text-red-400 active:text-red-500"
              aria-label="Quit game"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </button>
          )}
          <button
            onClick={openLeaderboard}
            className="rounded-lg bg-gray-800/80 p-2 text-yellow-400 hover:text-yellow-300 active:text-yellow-500"
            aria-label="View leaderboard"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>
      </div>

      {TuningPanel && tuning && (
        <Suspense fallback={null}>
          <TuningPanel tuning={tuning} />
        </Suspense>
      )}

      <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />

      {/* Mid-run leaderboard — does not pause the run. */}
      {leaderboardOpen && !ended && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <Leaderboard
            entries={entries}
            loading={loading}
            error={error}
            currentPlayerName={playerName}
            onClose={() => setLeaderboardOpen(false)}
          />
        </div>
      )}

      {/* End-of-run overlay */}
      {ended && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-gray-900/80 px-4 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{END_HEADINGS[reason]}</h2>
            <p className="mt-1 text-sm text-gray-400">{END_BLURBS[reason]}</p>
          </div>
          <p className="text-gray-300">
            Score: <span className="font-bold text-white">{score.toLocaleString()}</span>
          </p>
          <Leaderboard entries={entries} loading={loading} error={error} currentPlayerName={playerName} />
          <div className="flex gap-3">
            <button
              onClick={() => restart(false)}
              className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700"
            >
              Retry
            </button>
            <button
              onClick={() => restart(true)}
              className="rounded-xl bg-gray-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-600 active:bg-gray-800"
            >
              New Layout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
