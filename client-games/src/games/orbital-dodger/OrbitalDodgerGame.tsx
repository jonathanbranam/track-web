import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { useAuth } from '@repo/auth'
import PhaserGame from '../PhaserGame'
import OrbitalDodgerScene, { GAME_W, GAME_H, INITIAL_TUNING_KEY, type EndReason as SceneEndReason, type LevelSource } from './OrbitalDodgerScene'
import Leaderboard from '../../components/Leaderboard'
import { submitScore, fetchLeaderboard, listOdConfigs, listOdLevels, type LeaderboardEntry } from '../../api'
import { cloneTuning, type Tuning } from './physics'
import { clearSelectedId, loadSelectedId, pickConfig, resolveTuning, type OrbitalConfig } from './configs'
import {
  clearLastLevel,
  draftToLayout,
  generatedLayout,
  layoutToDraft,
  leaderboardLevel,
  loadLastLevel,
  pickLastLevel,
  saveLastLevel,
  type LevelChoice,
  type OrbitalLevel,
  type PlayKind,
} from './levels'
import LevelPicker from './LevelPicker'
import LevelEditor, { type EditorSession } from './LevelEditor'
import { panelInset } from './layout'

const GAME_SLUG = 'orbital-dodger'
const MODE = 'classic'

// Ships in every build; lazy so it stays out of the game's first chunk.
const TuningPanel = lazy(() => import('./TuningPanel'))

/** How long game start waits for the configs before falling back to the built-in settings. */
const CONFIG_TIMEOUT_MS = 8000

/** What the game starts with, decided before Phaser boots. */
interface Startup {
  tuning: Tuning
  /** Null when the configs could not be loaded. */
  configs: OrbitalConfig[] | null
  selectedId: number | null
  /** Null when the levels could not be loaded. */
  levels: OrbitalLevel[] | null
}

/** Configs and levels load in parallel under one time limit; each may fail on its own. */
async function loadStartup(): Promise<Startup> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG_TIMEOUT_MS)
  try {
    const [configsRes, levelsRes] = await Promise.allSettled([listOdConfigs(ctrl.signal), listOdLevels(ctrl.signal)])
    const levels = levelsRes.status === 'fulfilled' ? levelsRes.value : null
    if (configsRes.status === 'rejected') return { tuning: cloneTuning(), configs: null, selectedId: null, levels }
    const configs = configsRes.value
    const { config, stale } = pickConfig(configs, loadSelectedId())
    if (stale) clearSelectedId()
    if (!config) return { tuning: cloneTuning(), configs, selectedId: null, levels }
    return { tuning: resolveTuning(config.tuning), configs, selectedId: config.id, levels }
  } finally {
    clearTimeout(timer)
  }
}

/** The picker entry to pre-select; forgets a remembered level that no longer exists. */
function preselect(levels: OrbitalLevel[] | null): LevelChoice {
  const { choice, stale } = pickLastLevel(levels, loadLastLevel())
  if (stale) clearLastLevel()
  return choice
}

type EndReason = SceneEndReason | 'quit'

const END_HEADINGS: Record<EndReason, string> = {
  crash: 'Crashed',
  'out-of-bounds': 'Lost in Space',
  'out-of-fuel': 'Out of Fuel',
  complete: 'Level Complete',
  quit: 'You Quit',
}

const END_BLURBS: Record<EndReason, string> = {
  crash: 'You flew into a planet.',
  'out-of-bounds': 'You drifted out of the system.',
  'out-of-fuel': 'Your tank ran dry mid-orbit.',
  complete: 'You collected every star.',
  quit: 'You ended the run.',
}

type Screen = 'picker' | 'playing' | 'editing'

const endPrimary =
  'rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700'
const endSecondary =
  'rounded-xl bg-gray-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-600 active:bg-gray-800'

export default function OrbitalDodgerGame() {
  const [startup, setStartup] = useState<Startup | null>(null)

  // The game waits for the configs: nothing boots until the selection is known.
  useEffect(() => {
    let live = true
    void loadStartup().then((s) => {
      if (live) setStartup(s)
    })
    return () => {
      live = false
    }
  }, [])

  if (!startup) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0e1c] text-sm text-gray-300" role="status">
        Loading…
      </div>
    )
  }
  return <OrbitalDodgerPlay startup={startup} />
}

function OrbitalDodgerPlay({ startup }: { startup: Startup }) {
  const { displayName, userId } = useAuth()
  const [score, setScore] = useState(0)
  const [fuel, setFuel] = useState(1)
  const [shields, setShields] = useState(0)
  const [fuelGrace, setFuelGrace] = useState<number | null>(null)
  const [starsLeft, setStarsLeft] = useState<number | null>(null)
  const [maxShields, setMaxShields] = useState(0)
  const [ended, setEnded] = useState(false)
  const [reason, setReason] = useState<EndReason>('crash')
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [tuning, setTuning] = useState<Tuning | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [inset, setInset] = useState(0)
  const outerRef = useRef<HTMLDivElement>(null)

  const [screen, setScreen] = useState<Screen>('picker')
  const [play, setPlay] = useState<PlayKind | null>(null)
  const [levels, setLevels] = useState<OrbitalLevel[] | null>(startup.levels)
  const [preselected, setPreselected] = useState<LevelChoice>(() => preselect(startup.levels))
  const [session, setSession] = useState<EditorSession | null>(null)
  /** Bumped per editor opening, so each one starts from its session. */
  const [editorKey, setEditorKey] = useState(0)
  const [scene, setScene] = useState<OrbitalDodgerScene | null>(null)

  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<OrbitalDodgerScene | null>(null)
  const scoreRef = useRef(0)
  // Scene handlers are registered once at boot; they read the current play here.
  const playRef = useRef<PlayKind | null>(null)
  playRef.current = play
  /** Calls waiting for the scene to finish booting. */
  const pendingRef = useRef<((s: OrbitalDodgerScene) => void)[]>([])

  const playerName = displayName ?? (userId !== null ? String(userId) : null)

  const withScene = useCallback((fn: (s: OrbitalDodgerScene) => void) => {
    if (sceneRef.current) fn(sceneRef.current)
    else pendingRef.current.push(fn)
  }, [])

  const openLeaderboard = useCallback(async () => {
    const level = playRef.current ? leaderboardLevel(playRef.current) : null
    if (level === null) return
    setLeaderboardOpen(true)
    setLoading(true)
    setError(false)
    try {
      setEntries(await fetchLeaderboard(GAME_SLUG, MODE, level))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Submission is awaited before the fetch so the player's own new score is in
  // the ranking they are shown. submitScore already skips score <= 0 and
  // swallows failures, so the overlay renders either way. A test run from the
  // editor submits nothing and shows no leaderboard.
  const finishRun = useCallback(async (finalScore: number, why: EndReason) => {
    setReason(why)
    setEnded(true)
    const level = playRef.current ? leaderboardLevel(playRef.current) : null
    if (level === null) return
    await submitScore(GAME_SLUG, MODE, level, finalScore)
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
      // The selected config reaches the scene before its first create(), so the
      // first layout, fuel and shields already use it.
      callbacks: {
        preBoot: (game) => {
          game.registry.set(INITIAL_TUNING_KEY, startup.tuning)
        },
      },
      scene: OrbitalDodgerScene,
    }),
    [startup],
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
    game.events.on('stars', (n: number | null) => setStarsLeft(n))
    game.events.on('gameover', (finalScore: number, why: SceneEndReason) => {
      scoreRef.current = finalScore
      void finishRun(finalScore, why)
    })
  }, [finishRun])

  // The scene instance only exists after boot; grab it for quit() and dev tuning.
  useEffect(() => {
    const id = setInterval(() => {
      const s = gameRef.current?.scene.getScene('OrbitalDodgerScene') as OrbitalDodgerScene | null
      if (s?.ready) {
        sceneRef.current = s
        setScene(s)
        setTuning(s.tuning)
        // Dev-only handle so browser automation can stage exact situations.
        if (import.meta.env.DEV) (window as unknown as { __orbitalScene?: OrbitalDodgerScene }).__orbitalScene = s
        clearInterval(id)
        const pending = pendingRef.current
        pendingRef.current = []
        for (const fn of pending) fn(s)
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  const applyTuning = useCallback((t: Tuning) => {
    sceneRef.current?.applyTuning(t)
  }, [])

  // While the panel is open, pull the play area's right edge in so the game
  // slides left into the free space beside it — never narrower than the drawn
  // game, so it keeps its size (see layout.ts).
  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => {
      setInset(panelOpen ? panelInset(el.clientWidth, el.clientHeight, GAME_W, GAME_H) : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [panelOpen])

  // Phaser only rechecks its parent's size on a timer or a window resize, and
  // can refit to a size read mid-change (a window resize lands before the new
  // inset does). Watch the play area itself and refit after every change, so the
  // canvas and pointer mapping always follow the final size.
  const playAreaRef = useRef<HTMLDivElement>(null)
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

  const quit = useCallback(() => {
    const finalScore = sceneRef.current?.quit() ?? scoreRef.current
    void finishRun(finalScore, 'quit')
  }, [finishRun])

  const resetHud = useCallback(() => {
    setEnded(false)
    setScore(0)
    setFuel(1)
    setFuelGrace(null)
    setStarsLeft(null)
    setMaxShields(0)
    setLeaderboardOpen(false)
    setEntries([])
  }, [])

  const restart = useCallback((newLayout: boolean) => {
    resetHud()
    gameRef.current?.events.emit(newLayout ? 'new-layout' : 'retry')
  }, [resetHud])

  const startRun = useCallback((kind: PlayKind, source: LevelSource) => {
    resetHud()
    setPlay(kind)
    playRef.current = kind
    setScreen('playing')
    withScene((s) => s.loadLevel(source))
  }, [resetHud, withScene])

  const playRandom = useCallback(() => {
    saveLastLevel('random')
    startRun({ kind: 'random' }, { kind: 'random' })
  }, [startRun])

  const playLevel = useCallback((level: OrbitalLevel) => {
    saveLastLevel(level.id)
    startRun({ kind: 'level', level }, { kind: 'authored', layout: level.layout, test: false })
  }, [startRun])

  /** Back to the picker, refreshing the list so other players' levels show up. */
  const showPicker = useCallback(() => {
    resetHud()
    setSession(null)
    setScreen('picker')
    withScene((s) => s.unload())
    listOdLevels()
      .then((list) => {
        setLevels(list)
        setPreselected(preselect(list))
      })
      .catch(() => {
        // Keep whatever list we had.
      })
  }, [resetHud, withScene])

  const openEditor = useCallback((next: EditorSession) => {
    resetHud()
    setSession(next)
    setEditorKey((k) => k + 1)
    setScreen('editing')
  }, [resetHud])

  const editLevel = useCallback((level: OrbitalLevel) => {
    openEditor({ draft: layoutToDraft(level.layout), baseline: level.layout, editing: level })
  }, [openEditor])

  const createNew = useCallback(() => {
    withScene((s) => {
      const layout = generatedLayout(s.tuning)
      openEditor({ draft: layoutToDraft(layout), baseline: layout, editing: null })
    })
  }, [withScene, openEditor])

  const saveAsLevel = useCallback(() => {
    const s = sceneRef.current
    if (!s) return
    const layout = s.currentLayout()
    openEditor({ draft: layoutToDraft(layout), baseline: layout, editing: null })
  }, [openEditor])

  const testDraft = useCallback((next: EditorSession) => {
    setSession(next)
    startRun(
      { kind: 'test', draft: next.draft, editing: next.editing },
      { kind: 'authored', layout: draftToLayout(next.draft), test: true },
    )
  }, [startRun])

  /** After a test run: the editor again, with the draft exactly as it was. */
  const backToEditor = useCallback(() => {
    if (!session) return
    openEditor(session)
  }, [session, openEditor])

  const onLevelSaved = useCallback((level: OrbitalLevel) => {
    setLevels((list) => {
      const rest = (list ?? []).filter((l) => l.id !== level.id)
      return [...rest, level]
    })
  }, [])

  const onLevelDeleted = useCallback((id: number) => {
    setLevels((list) => list?.filter((l) => l.id !== id) ?? list)
    if (loadLastLevel() === id) clearLastLevel()
  }, [])

  const fuelColor = fuel < 0.25 ? 'bg-red-400' : fuel < 0.5 ? 'bg-orange-300' : 'bg-sky-300'

  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden">
      {/* Play area: HUD, canvas and in-game overlays move together. */}
      <div ref={playAreaRef} className="absolute inset-y-0 left-0" style={{ right: inset }} data-testid="play-area">
      {/* HUD */}
      {screen === 'playing' && (
      <div
        className="pointer-events-none absolute left-0 right-0 top-2 z-10 flex items-start justify-between px-4"
        style={{ paddingTop: 'var(--sat)' }}
      >
        <div className="rounded-lg bg-gray-800/80 px-3 py-1">
          <div className="text-[10px] uppercase tracking-wide text-gray-200">Score</div>
          <div className="text-xl font-bold tabular-nums">{score.toLocaleString()}</div>
          {starsLeft !== null && (
            <div className="text-[11px] font-semibold tabular-nums text-yellow-300" data-testid="stars-left">
              ★ {starsLeft} left
            </div>
          )}
        </div>

        <div className="flex flex-col items-center pt-1">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-200">Fuel</div>
          <div className="h-2 w-[110px] overflow-hidden rounded-full bg-white/35">
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
                  className={`h-2 w-2 rounded-full border border-emerald-300 ${i < shields ? 'bg-emerald-300' : 'bg-transparent opacity-70'}`}
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
          {play?.kind !== 'test' && (
          <button
            onClick={openLeaderboard}
            className="rounded-lg bg-gray-800/80 p-2 text-yellow-400 hover:text-yellow-300 active:text-yellow-500"
            aria-label="View leaderboard"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
          )}
        </div>
      </div>
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

      {/* End-of-run overlay. Controls depend on what was played. */}
      {ended && screen === 'playing' && play && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-gray-900/80 px-4 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{END_HEADINGS[reason]}</h2>
            <p className="mt-1 text-sm text-gray-400">
              {play.kind === 'test' ? `Test run — ${END_BLURBS[reason].toLowerCase()}` : END_BLURBS[reason]}
            </p>
          </div>
          <p className="text-gray-300">
            Score: <span className="font-bold text-white">{score.toLocaleString()}</span>
          </p>
          {play.kind !== 'test' && (
            <Leaderboard entries={entries} loading={loading} error={error} currentPlayerName={playerName} />
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {play.kind === 'test' && (
              <button onClick={backToEditor} className={endPrimary}>Back to editor</button>
            )}
            <button onClick={() => restart(false)} className={play.kind === 'test' ? endSecondary : endPrimary}>
              Retry
            </button>
            {play.kind === 'random' && (
              <>
                <button onClick={() => restart(true)} className={endSecondary}>New Layout</button>
                <button onClick={saveAsLevel} className={endSecondary}>Save as level</button>
              </>
            )}
            {play.kind === 'level' && (
              <button
                onClick={() => editLevel(levels?.find((l) => l.id === play.level.id) ?? play.level)}
                className={endSecondary}
              >
                Edit
              </button>
            )}
            {play.kind !== 'test' && (
              <button onClick={showPicker} className={endSecondary}>Levels</button>
            )}
          </div>
        </div>
      )}

      {screen === 'picker' && (
        <LevelPicker
          levels={levels}
          preselected={preselected}
          onPlayRandom={playRandom}
          onCreateNew={createNew}
          onPlay={playLevel}
          onEdit={editLevel}
        />
      )}

      {screen === 'editing' && session && scene && gameRef.current && tuning && (
        <LevelEditor
          key={editorKey}
          scene={scene}
          game={gameRef.current}
          tuning={tuning}
          session={session}
          panelOpen={panelOpen}
          onPanelOpenChange={setPanelOpen}
          onTest={testDraft}
          onClose={showPicker}
          onLevelSaved={onLevelSaved}
          onLevelDeleted={onLevelDeleted}
        />
      )}
      </div>

      {tuning && (
        <Suspense fallback={null}>
          <TuningPanel
            tuning={tuning}
            open={panelOpen}
            onOpenChange={setPanelOpen}
            initialConfigs={startup.configs}
            initialSelectedId={startup.selectedId}
            onApply={applyTuning}
          />
        </Suspense>
      )}
    </div>
  )
}
