import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { useAuth } from '@repo/auth'
import PhaserGame from '../PhaserGame'
import SpaceGolfScene, {
  GAME_H,
  GAME_W,
  INITIAL_SETTINGS_KEY,
  INITIAL_TUNING_KEY,
  type HudState,
} from './SpaceGolfScene'
import { fetchLeaderboard, submitScore, type LeaderboardEntry } from '../../api'
import type { AimSettings } from './aim'
import { LEVELS } from './levelData'
import type { Level } from './levels'
import type { Tuning } from './physics'
import type { ScoreBreakdown } from './scoring'
import { loadLastLevel, loadSettings, loadTuning, saveLastLevel, saveSettings } from './storage'
import LevelPicker from './LevelPicker'
import LevelSummary from './LevelSummary'
import SettingsPanel from './SettingsPanel'
import { panelInset } from './layout'

const GAME_SLUG = 'space-golf'
const MODE = 'classic'
const TOAST_MS = 2200

// Ships in every build; lazy so it stays out of the game's first chunk.
const TuningPanel = lazy(() => import('./TuningPanel'))

type Screen = 'picker' | 'playing'

const hudBtn =
  'pointer-events-auto rounded-lg bg-gray-800/80 px-2.5 py-2 text-sm font-semibold text-gray-100 hover:bg-gray-700 active:bg-gray-900'

export default function SpaceGolfGame() {
  const { displayName, userId } = useAuth()
  const playerName = displayName ?? (userId !== null ? String(userId) : null)

  // Read once: the scene gets them before its first create().
  const [initialTuning] = useState<Tuning>(() => loadTuning())
  const [settings, setSettings] = useState<AimSettings>(() => loadSettings())

  const [screen, setScreen] = useState<Screen>('picker')
  const [level, setLevel] = useState<Level | null>(null)
  const [preselected, setPreselected] = useState<string>(() => loadLastLevel(LEVELS.map((l) => l.id)).id)
  const [hud, setHud] = useState<HudState | null>(null)
  const [look, setLook] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScoreBreakdown | null>(null)
  const [destroyed, setDestroyed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [lbLoading, setLbLoading] = useState(false)
  const [lbError, setLbError] = useState(false)
  const [tuning, setTuning] = useState<Tuning | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [inset, setInset] = useState(0)

  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<SpaceGolfScene | null>(null)
  const pendingRef = useRef<((s: SpaceGolfScene) => void)[]>([])
  const levelRef = useRef<Level | null>(null)
  levelRef.current = level
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const playAreaRef = useRef<HTMLDivElement>(null)

  const withScene = useCallback((fn: (s: SpaceGolfScene) => void) => {
    if (sceneRef.current) fn(sceneRef.current)
    else pendingRef.current.push(fn)
  }, [])

  const showToast = useCallback((text: string) => {
    setToast(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  // Submission is awaited before the fetch so the player's own score is in the
  // ranking. submitScore skips scores <= 0 and swallows failures.
  const onComplete = useCallback(async (b: ScoreBreakdown) => {
    setSummary(b)
    const lvl = levelRef.current
    if (!lvl) return
    setLbLoading(true)
    setLbError(false)
    await submitScore(GAME_SLUG, MODE, lvl.id, b.total)
    try {
      setEntries(await fetchLeaderboard(GAME_SLUG, MODE, lvl.id))
    } catch {
      setLbError(true)
    } finally {
      setLbLoading(false)
    }
  }, [])

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: '#070a16',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      // Stop Phaser adding window-level listeners that preventDefault() the
      // synthesized clicks our overlay buttons need on iOS
      // (kb/phaser-mobile-input.md, Fix 2).
      input: { windowEvents: false },
      callbacks: {
        preBoot: (game) => {
          game.registry.set(INITIAL_TUNING_KEY, initialTuning)
          game.registry.set(INITIAL_SETTINGS_KEY, settings)
        },
      },
      scene: SpaceGolfScene,
    }),
    // Boots once; later settings reach the scene through setSettings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const onGameReady = useCallback(
    (game: Phaser.Game) => {
      gameRef.current = game
      game.events.on('hud', (h: HudState, lookOn: boolean) => {
        setHud(h)
        setLook(lookOn)
      })
      game.events.on('toast', (text: string) => showToast(text))
      game.events.on('level-complete', (b: ScoreBreakdown) => void onComplete(b))
      game.events.on('destroyed', () => setDestroyed(true))
    },
    [onComplete, showToast],
  )

  // The scene instance exists only after boot.
  useEffect(() => {
    const id = setInterval(() => {
      const s = gameRef.current?.scene.getScene('SpaceGolfScene') as SpaceGolfScene | null
      if (!s?.ready) return
      sceneRef.current = s
      setTuning(s.tuning)
      if (import.meta.env.DEV) (window as unknown as { __spaceGolf?: SpaceGolfScene }).__spaceGolf = s
      clearInterval(id)
      const pending = pendingRef.current
      pendingRef.current = []
      for (const fn of pending) fn(s)
    }, 50)
    return () => clearInterval(id)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // Tuning panel open on a wide screen: slide the game left, never shrink it.
  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => setInset(panelOpen ? panelInset(el.clientWidth, el.clientHeight, GAME_W, GAME_H) : 0)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [panelOpen])

  // Refit the canvas whenever the play area changes size.
  useEffect(() => {
    const el = playAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const scale = gameRef.current?.scale
      if (!scale) return
      scale.getParentBounds()
      scale.refresh()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clearOverlays = useCallback(() => {
    setSummary(null)
    setDestroyed(false)
    setEntries([])
    setToast(null)
  }, [])

  const playLevel = useCallback(
    (lvl: Level) => {
      saveLastLevel(lvl.id)
      setPreselected(lvl.id)
      clearOverlays()
      setLevel(lvl)
      setScreen('playing')
      withScene((s) => s.loadLevel(lvl))
    },
    [clearOverlays, withScene],
  )

  const restart = useCallback(() => {
    clearOverlays()
    withScene((s) => s.restart())
  }, [clearOverlays, withScene])

  const showPicker = useCallback(() => {
    clearOverlays()
    setScreen('picker')
    setLevel(null)
    setHud(null)
    withScene((s) => s.unload())
  }, [clearOverlays, withScene])

  const nextLevel = level ? LEVELS[LEVELS.findIndex((l) => l.id === level.id) + 1] ?? null : null

  const changeSettings = useCallback(
    (s: AimSettings) => {
      setSettings(s)
      saveSettings(s)
      withScene((scene) => scene.setSettings(s))
    },
    [withScene],
  )

  const inFlight = hud?.phase === 'flight' || hud?.phase === 'windup'
  const hullPct = Math.max(0, Math.min(100, hud?.hull ?? 100))
  const hullColor = hullPct < 25 ? 'bg-red-400' : hullPct < 50 ? 'bg-orange-300' : 'bg-emerald-300'

  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden bg-[#070a16]">
      <div ref={playAreaRef} className="absolute inset-y-0 left-0" style={{ right: inset }} data-testid="play-area">
        {screen === 'playing' && level && hud && (
          <div
            className="pointer-events-none absolute left-0 right-0 top-2 z-10 flex items-start justify-between gap-2 px-3"
            style={{ paddingTop: 'var(--sat)' }}
          >
            <div className="rounded-lg bg-gray-800/80 px-3 py-1.5" data-testid="hud">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">{level.name}</div>
              <div className="flex items-baseline gap-3 tabular-nums">
                <span className="text-sm" data-testid="hud-strokes">
                  <span className="text-gray-400">Strokes </span>
                  <span className="font-bold">{hud.strokes}</span>
                </span>
                <span className="text-sm font-bold text-yellow-300" data-testid="hud-stars">
                  ★ {hud.stars}/{hud.totalStars}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2" aria-label={`Hull ${hullPct}`}>
                <div className="h-2 w-[100px] overflow-hidden rounded-full bg-white/25">
                  <div className={`h-full transition-[width] duration-150 ${hullColor}`} style={{ width: `${hullPct}%` }} />
                </div>
                <span className="text-xs tabular-nums text-gray-200" data-testid="hud-hull">
                  {hullPct}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <button onClick={restart} className={hudBtn} aria-label="Restart level">
                ↺
              </button>
              <button
                onClick={() => withScene((s) => s.setLook(!look))}
                disabled={inFlight}
                className={`${hudBtn} ${look ? 'ring-2 ring-sky-300' : ''} disabled:opacity-40`}
                aria-label="Look around"
                aria-pressed={look}
              >
                👁
              </button>
              <button onClick={() => setSettingsOpen(true)} className={hudBtn} aria-label="Aim settings">
                ◎
              </button>
              <button onClick={showPicker} className={hudBtn} aria-label="Levels">
                ☰
              </button>
            </div>
          </div>
        )}

        <PhaserGame buildConfig={buildConfig} onGameReady={onGameReady} />

        {screen === 'playing' && look && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 text-center text-xs font-semibold text-sky-200">
            Look mode — drag to scroll the course
          </div>
        )}

        {screen === 'playing' && hud && settings.release === 'planned' && !summary && !destroyed && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex justify-center"
            style={{ paddingBottom: 'calc(var(--sab) + 1rem)' }}
          >
            <button
              onClick={() => withScene((s) => s.fire())}
              disabled={!hud.canFire}
              className="rounded-xl bg-amber-400 px-10 py-3 font-bold text-gray-900 shadow-lg disabled:opacity-40"
              data-testid="fire"
            >
              Fire{hud.power > 0 ? ` · ${Math.round(hud.power * 100)}%` : ''}
            </button>
          </div>
        )}

        {screen === 'playing' && hud && settings.release === 'timed' && hud.power > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 text-center text-sm font-bold tabular-nums text-amber-300">
            Power {Math.round(hud.power * 100)}%
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
            <div className="rounded-lg bg-gray-900/90 px-4 py-2 text-sm font-semibold text-red-200" role="status">
              {toast}
            </div>
          </div>
        )}

        {summary && level && (
          <LevelSummary
            level={level}
            breakdown={summary}
            isLast={!nextLevel}
            entries={entries}
            loading={lbLoading}
            error={lbError}
            playerName={playerName}
            onNext={() => nextLevel && playLevel(nextLevel)}
            onReplay={restart}
            onLevels={showPicker}
          />
        )}

        {destroyed && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-gray-900/80 px-4 backdrop-blur-sm">
            <h2 className="text-3xl font-bold">Hull Destroyed</h2>
            <p className="text-sm text-gray-400">That was a wild one. Try the hole again.</p>
            <div className="flex gap-3">
              <button onClick={restart} className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white">
                Restart
              </button>
              <button onClick={showPicker} className="rounded-xl bg-gray-700 px-6 py-3 font-semibold text-white">
                Levels
              </button>
            </div>
          </div>
        )}

        {screen === 'picker' && <LevelPicker levels={LEVELS} preselected={preselected} onPlay={playLevel} />}

        {settingsOpen && (
          <SettingsPanel settings={settings} onChange={changeSettings} onClose={() => setSettingsOpen(false)} />
        )}
      </div>

      {tuning && (
        <Suspense fallback={null}>
          <TuningPanel tuning={tuning} open={panelOpen} onOpenChange={setPanelOpen} />
        </Suspense>
      )}
    </div>
  )
}
