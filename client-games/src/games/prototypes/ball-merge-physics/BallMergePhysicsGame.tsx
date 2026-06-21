import { useCallback, useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import PhaserGame from '../../PhaserGame'
import BallMergePhysicsScene, {
  GAME_W,
  GAME_H,
  DEFAULT_PHYSICS,
  type PhysicsConfig,
} from './BallMergePhysicsScene'
import { LEVELS, type LevelDef } from '../../ball-merge/levels'

// --- LocalStorage ---

interface PhysicsPreset {
  name: string
  physics: PhysicsConfig
  levelId: string
  savedAt: number
}

interface LastSession {
  physics: PhysicsConfig
  levelId: string
}

const PRESETS_KEY = 'ball-merge-physics-presets'
const LAST_KEY = 'ball-merge-physics-last'

function loadPresets(): PhysicsPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    return raw ? (JSON.parse(raw) as PhysicsPreset[]) : []
  } catch {
    return []
  }
}

function savePresetsToStorage(presets: PhysicsPreset[]): void {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

function loadLastSession(): LastSession | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    return raw ? (JSON.parse(raw) as LastSession) : null
  } catch {
    return null
  }
}

function saveLastSession(physics: PhysicsConfig, levelId: string): void {
  localStorage.setItem(LAST_KEY, JSON.stringify({ physics, levelId }))
}

// --- Slider config ---

const SLIDERS: {
  key: keyof PhysicsConfig
  label: string
  min: number
  max: number
  step: number
  defaultVal: number
}[] = [
  { key: 'gravityY',    label: 'Gravity',    min: 0.1,   max: 3.0, step: 0.05,  defaultVal: DEFAULT_PHYSICS.gravityY    },
  { key: 'restitution', label: 'Bounciness', min: 0.0,   max: 0.9, step: 0.05,  defaultVal: DEFAULT_PHYSICS.restitution },
  { key: 'friction',    label: 'Friction',   min: 0.0,   max: 1.0, step: 0.05,  defaultVal: DEFAULT_PHYSICS.friction    },
  { key: 'frictionAir', label: 'Air Drag',   min: 0.001, max: 0.2, step: 0.001, defaultVal: DEFAULT_PHYSICS.frictionAir },
]

// --- Sub-components ---

function DifficultyBadge({ difficulty }: { difficulty: LevelDef['difficulty'] }) {
  if (!difficulty) return null
  const label = difficulty === 'danger' ? 'Danger' : 'Hard'
  const cls =
    difficulty === 'danger'
      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  )
}

function PhysicsSlider({
  sliderDef,
  value,
  onChange,
}: {
  sliderDef: (typeof SLIDERS)[number]
  value: number
  onChange: (key: keyof PhysicsConfig, value: number) => void
}) {
  const { key, label, min, max, step, defaultVal } = sliderDef
  const defaultPct = ((defaultVal - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-36 shrink-0">
        {label}: <span className="text-white font-mono">{value.toPrecision(3)}</span>
      </span>
      <div className="relative flex-1 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(key, parseFloat(e.target.value))}
          className="relative w-full accent-indigo-500 z-10"
        />
        {/* Default value reference tick */}
        <div
          className="absolute inset-y-0 flex items-center pointer-events-none z-20"
          style={{ left: `calc(${defaultPct / 100} * (100% - 16px) + 7px)` }}
        >
          <div className="w-0.5 h-5 bg-yellow-400/80 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// --- Main component ---

function getInitialState() {
  const last = loadLastSession()
  const level = last ? (LEVELS.find((l) => l.id === last.levelId) ?? null) : null
  const physics = last?.physics ?? { ...DEFAULT_PHYSICS }
  return { level, physics }
}

export default function BallMergePhysicsGame() {
  const initial = useRef(getInitialState()).current

  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(initial.level)
  const [levelSession, setLevelSession] = useState(initial.level ? 1 : 0)
  const [showPicker, setShowPicker] = useState(!initial.level)
  const [pickerSelection, setPickerSelection] = useState(
    initial.level?.id ?? LEVELS[0].id,
  )
  const [physics, setPhysics] = useState<PhysicsConfig>(initial.physics)

  // Drawer and dialog states
  const [showDrawer, setShowDrawer] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showJsonView, setShowJsonView] = useState(false)
  const [presets, setPresets] = useState<PhysicsPreset[]>(loadPresets)
  const [jsonCopied, setJsonCopied] = useState(false)

  const gameRef = useRef<Phaser.Game | null>(null)
  const selectedLevelRef = useRef<LevelDef | null>(initial.level)
  const physicsRef = useRef<PhysicsConfig>({ ...initial.physics })

  // Persist last session whenever physics or level changes
  useEffect(() => {
    if (selectedLevel) {
      saveLastSession(physics, selectedLevel.id)
    }
  }, [physics, selectedLevel])

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: '#111827',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: {
        default: 'matter',
        matter: { gravity: { x: 0, y: DEFAULT_PHYSICS.gravityY }, debug: false },
      },
      input: { windowEvents: false },
      scene: BallMergePhysicsScene,
    }),
    [],
  )

  const onGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    game.registry.set('level', selectedLevelRef.current)
    game.registry.set('physics', physicsRef.current)
  }, [])

  const handleLevelConfirm = useCallback((levelId: string) => {
    const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]
    selectedLevelRef.current = level
    setSelectedLevel(level)
    setLevelSession((n) => n + 1)
    setShowPicker(false)
  }, [])

  const handlePhysicsChange = useCallback((key: keyof PhysicsConfig, value: number) => {
    const update: Partial<PhysicsConfig> = { [key]: value }
    setPhysics((prev) => ({ ...prev, [key]: value }))
    physicsRef.current = { ...physicsRef.current, [key]: value }
    gameRef.current?.events.emit('physics-update', update)
  }, [])

  const handleClear = useCallback(() => {
    gameRef.current?.events.emit('sandbox-clear-balls')
  }, [])

  const handleResetToDefaults = useCallback(() => {
    const defaults = { ...DEFAULT_PHYSICS }
    setPhysics(defaults)
    physicsRef.current = defaults
    gameRef.current?.events.emit('physics-update', defaults)
    setShowDrawer(false)
  }, [])

  const handleChangeLevel = useCallback(() => {
    setPickerSelection(selectedLevel?.id ?? LEVELS[0].id)
    setShowPicker(true)
    setShowDrawer(false)
  }, [selectedLevel])

  const handleOpenSave = useCallback(() => {
    setSaveName('')
    setShowDrawer(false)
    setShowSaveDialog(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return
    const preset: PhysicsPreset = {
      name: saveName.trim(),
      physics: { ...physicsRef.current },
      levelId: selectedLevelRef.current?.id ?? LEVELS[0].id,
      savedAt: Date.now(),
    }
    const updated = [preset, ...presets]
    setPresets(updated)
    savePresetsToStorage(updated)
    setShowSaveDialog(false)
  }, [saveName, presets])

  const handleOpenRestore = useCallback(() => {
    setShowDrawer(false)
    setShowRestoreDialog(true)
  }, [])

  const handleRestore = useCallback((preset: PhysicsPreset) => {
    const level = LEVELS.find((l) => l.id === preset.levelId) ?? LEVELS[0]
    const p = { ...preset.physics }
    physicsRef.current = p
    selectedLevelRef.current = level
    setPhysics(p)
    setSelectedLevel(level)
    setLevelSession((n) => n + 1)
    setShowRestoreDialog(false)
  }, [])

  const handleDeletePreset = useCallback(
    (index: number) => {
      const updated = presets.filter((_, i) => i !== index)
      setPresets(updated)
      savePresetsToStorage(updated)
    },
    [presets],
  )

  const handleOpenJson = useCallback(() => {
    setShowDrawer(false)
    setJsonCopied(false)
    setShowJsonView(true)
  }, [])

  const handleCopyJson = useCallback(
    (text: string) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          setJsonCopied(true)
          setTimeout(() => setJsonCopied(false), 2000)
        }).catch(() => {})
      }
    },
    [],
  )

  const jsonContent = JSON.stringify(
    {
      current: {
        physics,
        levelId: selectedLevel?.id ?? null,
      },
      presets,
    },
    null,
    2,
  )

  return (
    <div className="relative flex flex-col w-full h-full">
      {/* Canvas */}
      <div className="flex-1 min-h-0">
        {selectedLevel && (
          <PhaserGame
            key={`${selectedLevel.id}-${levelSession}`}
            buildConfig={buildConfig}
            onGameReady={onGameReady}
          />
        )}
      </div>

      {/* Controls panel */}
      {selectedLevel && (
        <div className="shrink-0 bg-gray-900 border-t border-gray-700 px-4 pt-3 pb-2 flex flex-col gap-2">
          {SLIDERS.map((slider) => (
            <PhysicsSlider
              key={slider.key}
              sliderDef={slider}
              value={physics[slider.key]}
              onChange={handlePhysicsChange}
            />
          ))}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleClear}
              className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-xs text-white font-medium rounded-lg px-2 py-2 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleChangeLevel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-xs text-white font-medium rounded-lg px-2 py-2 transition-colors"
            >
              Level
            </button>
            <button
              onClick={() => setShowDrawer(true)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-xs text-white font-medium rounded-lg px-2 py-2 transition-colors"
              aria-label="Settings"
            >
              ⚙ More
            </button>
          </div>
        </div>
      )}

      {/* Level picker */}
      {showPicker && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm px-4 py-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-1">Choose Level</h2>
          <p className="text-gray-400 text-sm mb-5">Select a container shape</p>
          <div className="w-full max-w-xs flex flex-col gap-2 mb-6">
            {LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setPickerSelection(level.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${
                  pickerSelection === level.id
                    ? 'bg-indigo-600/30 border-indigo-500 text-white'
                    : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
              >
                <span className="font-medium">{level.name}</span>
                <DifficultyBadge difficulty={level.difficulty} />
              </button>
            ))}
          </div>
          <button
            onClick={() => handleLevelConfirm(pickerSelection)}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl px-10 py-3 transition-colors"
          >
            {selectedLevel ? 'Apply' : 'Start'}
          </button>
        </div>
      )}

      {/* Settings drawer backdrop */}
      {showDrawer && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => setShowDrawer(false)}
        />
      )}

      {/* Settings bottom drawer */}
      {showDrawer && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gray-800 rounded-t-2xl shadow-2xl">
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-3 mb-4" />
          <div className="flex flex-col gap-1 px-4 pb-6">
            <DrawerButton onClick={handleResetToDefaults} label="Reset to Defaults" />
            <DrawerButton onClick={handleOpenSave} label="Save Preset…" />
            <DrawerButton onClick={handleOpenRestore} label="Load Preset…" />
            <DrawerButton onClick={handleOpenJson} label="View as JSON…" />
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4">
            <h3 className="text-lg font-bold">Save Preset</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Preset name…"
              autoFocus
              className="bg-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm font-medium rounded-lg py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold rounded-lg py-2 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore dialog */}
      {showRestoreDialog && (
        <div className="absolute inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-lg font-bold">Load Preset</h3>
            <button
              onClick={() => setShowRestoreDialog(false)}
              className="text-gray-400 hover:text-white text-xl leading-none"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {presets.length === 0 ? (
              <p className="text-gray-400 text-sm text-center mt-8">No saved presets yet.</p>
            ) : (
              presets.map((preset, i) => (
                <div
                  key={i}
                  className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{preset.name}</div>
                    <div className="text-xs text-gray-400">
                      {preset.levelId} · {new Date(preset.savedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(preset)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 font-medium rounded-lg px-3 py-1.5 transition-colors shrink-0"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeletePreset(i)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* JSON view */}
      {showJsonView && (
        <div className="absolute inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-lg font-bold">Settings JSON</h3>
            <button
              onClick={() => setShowJsonView(false)}
              className="text-gray-400 hover:text-white text-xl leading-none"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
              {jsonContent}
            </pre>
          </div>
          <div className="px-4 pb-6 pt-2 border-t border-gray-700">
            <button
              onClick={() => handleCopyJson(jsonContent)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              {jsonCopied ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DrawerButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl text-white text-sm font-medium bg-gray-700/50 hover:bg-gray-700 active:bg-gray-600 transition-colors"
    >
      {label}
    </button>
  )
}
