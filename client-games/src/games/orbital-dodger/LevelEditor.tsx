import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as Phaser from 'phaser'
import type OrbitalDodgerScene from './OrbitalDodgerScene'
import type { EditMove, EditTarget } from './OrbitalDodgerScene'
import { ConfigApiError, createOdLevel, deleteOdLevel, updateOdLevel } from '../../api'
import { PALETTES, ringHeightFor, type Tuning } from './physics'
import {
  LEVEL_LIMITS,
  clampToField,
  deletePlanet,
  draftToLayout,
  layoutsEqual,
  levelWarnings,
  startState,
  toRuntimePlanets,
  validateLayout,
  type LevelDraft,
  type LevelLayout,
  type OrbitalLevel,
} from './levels'

/** Everything the editor needs to resume, kept by the host across a test run. */
export interface EditorSession {
  draft: LevelDraft
  /** What "no unsaved changes" means: the saved level, or the seed of a new one. */
  baseline: LevelLayout
  /** The saved level being edited, or null for a new one. */
  editing: OrbitalLevel | null
}

interface LevelEditorProps {
  scene: OrbitalDodgerScene
  game: Phaser.Game
  /** The scene's live tuning object (the tuning panel mutates it in place). */
  tuning: Tuning
  session: EditorSession
  panelOpen: boolean
  onPanelOpenChange: (open: boolean) => void
  onTest: (session: EditorSession) => void
  /** Leave the editor (already confirmed if there were unsaved changes). */
  onClose: () => void
  onLevelSaved: (level: OrbitalLevel) => void
  onLevelDeleted: (id: number) => void
}

type Selection = { kind: 'planet'; id: number } | { kind: 'star'; id: number } | { kind: 'start' } | null
type Tool = 'select' | 'planet' | 'star'

type Modal =
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => Promise<void> | void }
  | { kind: 'name'; title: string; initial: string; submitLabel: string; onSubmit: (name: string) => Promise<void> }

const NAME_MAX = 40
const NEW_PLANET_R = 30
/** How often to look for tuning-panel edits that change ring warnings. */
const TUNING_POLL_MS = 300

function errorMessage(err: unknown): string {
  if (err instanceof ConfigApiError) return err.message
  return "Couldn't reach the server. Try again."
}

function toTarget(sel: Selection, draft: LevelDraft): EditTarget | null {
  if (!sel) return null
  if (sel.kind === 'start') return sel
  const list = sel.kind === 'planet' ? draft.planets : draft.stars
  const index = list.findIndex((o) => o.id === sel.id)
  return index < 0 ? null : { kind: sel.kind, index }
}

/** The tuning values that change rings or the start, for spotting panel edits. */
function ringSignature(t: Tuning): string {
  return [t.orbitCapture, t.influenceZones, t.influenceInner, t.orbitHeight, t.maxSpeed, t.G, t.massScale,
    t.gravityReach, t.minDist, t.shipRadius, t.edgeMode].join('|')
}

const btn = 'rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40'
const btnGhost = `${btn} border border-gray-600 text-gray-200 hover:bg-gray-700 active:bg-gray-800`
const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700`
const btnDanger = `${btn} border border-red-500/60 text-red-300 hover:bg-red-950 active:bg-red-900`
const seg = (on: boolean) =>
  `${btn} flex-1 ${on ? 'bg-indigo-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-700'}`

export default function LevelEditor({
  scene,
  game,
  tuning,
  session,
  panelOpen,
  onPanelOpenChange,
  onTest,
  onClose,
  onLevelSaved,
  onLevelDeleted,
}: LevelEditorProps) {
  const [draft, setDraft] = useState<LevelDraft>(session.draft)
  const [baseline, setBaseline] = useState<LevelLayout>(session.baseline)
  const [editing, setEditing] = useState<OrbitalLevel | null>(session.editing)
  const [selection, setSelection] = useState<Selection>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [notice, setNotice] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)
  const [tuningTick, setTuningTick] = useState(0)

  const layout = useMemo(() => draftToLayout(draft), [draft])
  const dirty = !layoutsEqual(layout, baseline)

  // Scene event handlers are subscribed once and read the latest state here.
  const draftRef = useRef(draft)
  draftRef.current = draft
  const toolRef = useRef(tool)
  toolRef.current = tool

  // Push every draft or selection change to the scene, which rebuilds and redraws.
  const started = useRef(false)
  useEffect(() => {
    const target = toTarget(selection, draft)
    if (!started.current) {
      started.current = true
      scene.startEditing(layout, target)
    } else {
      scene.setDraft(layout, target)
    }
  }, [scene, layout, draft, selection])

  // Canvas input arrives as scene events (kb/phaser-mobile-input.md, Fix 1).
  useEffect(() => {
    const onSelect = (t: EditTarget) => {
      const d = draftRef.current
      if (t.kind === 'start') setSelection({ kind: 'start' })
      else if (t.kind === 'planet' && d.planets[t.index]) setSelection({ kind: 'planet', id: d.planets[t.index].id })
      else if (t.kind === 'star' && d.stars[t.index]) setSelection({ kind: 'star', id: d.stars[t.index].id })
    }
    const onMove = (m: EditMove) => {
      setDraft((d) => {
        const t = m.target
        if (t.kind === 'start') {
          const angleDeg = 'angleDeg' in m ? m.angleDeg : undefined
          if (d.start.kind === 'orbit' && angleDeg !== undefined) return { ...d, start: { ...d.start, angleDeg } }
          return { ...d, start: { kind: 'point', x: m.x, y: m.y } }
        }
        if (t.kind === 'planet') {
          return { ...d, planets: d.planets.map((p, i) => (i === t.index ? { ...p, x: m.x, y: m.y } : p)) }
        }
        return { ...d, stars: d.stars.map((s, i) => (i === t.index ? { ...s, x: m.x, y: m.y } : s)) }
      })
    }
    const onTap = (rawX: number, rawY: number) => {
      const { x, y } = clampToField(Math.round(rawX), Math.round(rawY))
      const d = draftRef.current
      const t = toolRef.current
      if (t === 'select') {
        setSelection(null)
        return
      }
      if (t === 'planet') {
        if (d.planets.length >= LEVEL_LIMITS.maxPlanets) {
          setNotice(`A level can have at most ${LEVEL_LIMITS.maxPlanets} planets`)
          return
        }
        const id = d.nextId
        setDraft({ ...d, nextId: id + 1, planets: [...d.planets, { id, x, y, r: NEW_PLANET_R, color: d.planets.length % PALETTES.length }] })
        setSelection({ kind: 'planet', id })
      } else {
        if (d.stars.length >= LEVEL_LIMITS.maxStars) {
          setNotice(`A level can have at most ${LEVEL_LIMITS.maxStars} stars`)
          return
        }
        const id = d.nextId
        setDraft({ ...d, nextId: id + 1, stars: [...d.stars, { id, x, y }] })
        setSelection({ kind: 'star', id })
      }
      setNotice(null)
    }
    game.events.on('edit-select', onSelect)
    game.events.on('edit-move', onMove)
    game.events.on('edit-tap', onTap)
    return () => {
      game.events.off('edit-select', onSelect)
      game.events.off('edit-move', onMove)
      game.events.off('edit-tap', onTap)
    }
  }, [game])

  // The inspector and the tuning panel both cover the field on a phone: opening
  // one closes the other.
  const hasSelection = selection !== null
  useEffect(() => {
    if (hasSelection) onPanelOpenChange(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection])
  useEffect(() => {
    if (panelOpen) setSelection(null)
  }, [panelOpen])

  // The tuning panel edits the live tuning in place without telling us; poll the
  // ring-relevant values so dropped-ring warnings follow it.
  useEffect(() => {
    let sig = ringSignature(tuning)
    const id = setInterval(() => {
      const next = ringSignature(tuning)
      if (next !== sig) {
        sig = next
        setTuningTick((n) => n + 1)
      }
    }, TUNING_POLL_MS)
    return () => clearInterval(id)
  }, [tuning])

  const warnings = useMemo(
    () => levelWarnings(layout, tuning),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, tuning, tuningTick],
  )

  // ─── Edits from the inspector ───────────────────────────────────────────────

  const updatePlanet = (id: number, changes: Partial<LevelDraft['planets'][number]>) =>
    setDraft((d) => ({ ...d, planets: d.planets.map((p) => (p.id === id ? { ...p, ...changes } : p)) }))

  const removeSelected = () => {
    if (!selection || selection.kind === 'start') return
    if (selection.kind === 'planet') setDraft((d) => deletePlanet(d, selection.id, tuning))
    else setDraft((d) => ({ ...d, stars: d.stars.filter((s) => s.id !== selection.id) }))
    setSelection(null)
  }

  /** Where the start is shown right now (on its ring for an orbit start). */
  const shownStart = () => startState(layout, toRuntimePlanets(layout), tuning).ship

  const setStartKind = (kind: 'point' | 'orbit') => {
    if (kind === draft.start.kind) return
    const at = shownStart()
    if (kind === 'point') {
      setDraft((d) => ({ ...d, start: { kind: 'point', ...clampToField(at.x, at.y) } }))
      return
    }
    // Attach to the nearest planet, at the angle the start already sits at.
    let best = draft.planets[0]
    for (const p of draft.planets) {
      if (Math.hypot(p.x - at.x, p.y - at.y) < Math.hypot(best.x - at.x, best.y - at.y)) best = p
    }
    const angleDeg = Math.round((Math.atan2(at.y - best.y, at.x - best.x) * 1800) / Math.PI) / 10
    setDraft((d) => ({ ...d, start: { kind: 'orbit', planetId: best.id, angleDeg, dir: 1 } }))
  }

  // ─── Leaving, testing, saving ───────────────────────────────────────────────

  const close = () => {
    if (!dirty) {
      onClose()
      return
    }
    setModal({
      kind: 'confirm',
      title: 'Discard changes?',
      message: 'This level has unsaved changes. Leaving the editor discards them.',
      confirmLabel: 'Discard',
      danger: true,
      onConfirm: onClose,
    })
  }

  const test = () => {
    if (layout.stars.length === 0) {
      setNotice('Add at least one star to test the level')
      return
    }
    onTest({ draft, baseline, editing })
  }

  /** A refusal the server would give, caught before sending. */
  const refusal = (): string | null => validateLayout(layout)

  const saveAsNew = () => {
    setMenuOpen(false)
    const blocked = refusal()
    if (blocked) {
      setNotice(blocked)
      return
    }
    setModal({
      kind: 'name',
      title: 'Save as new level',
      initial: editing ? `${editing.name} copy`.slice(0, NAME_MAX) : '',
      submitLabel: 'Save',
      onSubmit: async (name) => {
        const level = await createOdLevel(name, layout)
        setEditing(level)
        setBaseline(level.layout)
        onLevelSaved(level)
        setNotice(`Saved “${level.name}”.`)
      },
    })
  }

  const saveOver = async () => {
    if (!editing) return
    const blocked = refusal()
    if (blocked) {
      setMenuOpen(false)
      setNotice(blocked)
      return
    }
    try {
      const level = await updateOdLevel(editing.id, { layout })
      setEditing(level)
      setBaseline(level.layout)
      onLevelSaved(level)
      setMenuOpen(false)
      setNotice(`Saved “${level.name}”.`)
    } catch (err) {
      setMenuOpen(false)
      setNotice(errorMessage(err))
    }
  }

  const rename = () => {
    if (!editing) return
    setMenuOpen(false)
    setModal({
      kind: 'name',
      title: 'Rename level',
      initial: editing.name,
      submitLabel: 'Rename',
      onSubmit: async (name) => {
        const level = await updateOdLevel(editing.id, { name })
        setEditing(level)
        onLevelSaved(level)
        setNotice(`Renamed to “${level.name}”.`)
      },
    })
  }

  const remove = () => {
    if (!editing) return
    setMenuOpen(false)
    setModal({
      kind: 'confirm',
      title: 'Delete level?',
      message: `“${editing.name}” will be removed for every player. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await deleteOdLevel(editing.id)
        onLevelDeleted(editing.id)
        onClose()
      },
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const selPlanet = selection?.kind === 'planet' ? draft.planets.find((p) => p.id === selection.id) : undefined
  const selPlanetNo = selPlanet ? draft.planets.indexOf(selPlanet) + 1 : 0

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col" data-testid="level-editor">
      {/* Top bar. The tuning panel's toggle floats below it on the right. */}
      <div
        className="pointer-events-auto flex items-center gap-2 bg-gray-900/80 px-3 pb-2"
        style={{ paddingTop: 'calc(var(--sat) + 0.5rem)' }}
      >
        <button onClick={close} className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:text-white" aria-label="Close editor">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{editing ? editing.name : 'New level'}</div>
          <div className="text-[11px] text-gray-400">
            {draft.planets.length} planets · {draft.stars.length} stars
            {dirty && <span className="ml-2 font-semibold text-yellow-300" data-testid="editor-unsaved">Unsaved</span>}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 px-3" style={{ paddingBottom: 'calc(var(--sab) + 0.75rem)' }}>
        {(warnings.length > 0 || notice) && (
          // Informational only: taps pass through to the canvas beneath it.
          <div className="pointer-events-none rounded-lg bg-gray-900/70 px-3 py-2 text-[12px] leading-snug" data-testid="editor-warnings">
            {notice && <div className="text-sky-200">{notice}</div>}
            {warnings.map((w) => (
              <div key={w} className="text-amber-300">⚠ {w}</div>
            ))}
          </div>
        )}

        {selection && (
          <div className="pointer-events-auto rounded-xl border border-gray-700 bg-gray-900/95 p-3 text-sm" data-testid="inspector">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">
                {selection.kind === 'planet' ? `Planet ${selPlanetNo}` : selection.kind === 'star' ? 'Star' : 'Start'}
              </h3>
              <button onClick={() => setSelection(null)} className="px-2 text-gray-400 hover:text-white" aria-label="Close inspector">✕</button>
            </div>

            {selPlanet && (
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-3">
                  <span className="w-20 text-gray-300">Radius</span>
                  <input
                    type="range"
                    min={LEVEL_LIMITS.minRadius}
                    max={LEVEL_LIMITS.maxRadius}
                    value={selPlanet.r}
                    onChange={(e) => updatePlanet(selPlanet.id, { r: Number(e.target.value) })}
                    className="flex-1"
                    aria-label="Radius"
                  />
                  <span className="w-8 text-right tabular-nums">{Math.round(selPlanet.r)}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-gray-300">Color</span>
                  <div className="flex gap-2">
                    {PALETTES.map(([lit, shadow], i) => (
                      <button
                        key={i}
                        onClick={() => updatePlanet(selPlanet.id, { color: i })}
                        className={`h-7 w-7 rounded-full border-2 ${selPlanet.color === i ? 'border-white' : 'border-transparent'}`}
                        style={{ background: `radial-gradient(circle at 35% 35%, ${lit}, ${shadow})` }}
                        aria-label={`Color ${i + 1}`}
                        aria-pressed={selPlanet.color === i}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-gray-300">Ring</span>
                  <button
                    onClick={() => {
                      if (selPlanet.ringHeight === undefined) {
                        // Start the set height where Auto had it.
                        const auto = ringHeightFor(toRuntimePlanets(layout)[selPlanetNo - 1], tuning)
                        const v = Math.min(LEVEL_LIMITS.maxRingHeight, Math.max(LEVEL_LIMITS.minRingHeight, Math.round(auto)))
                        updatePlanet(selPlanet.id, { ringHeight: v })
                      } else {
                        updatePlanet(selPlanet.id, { ringHeight: undefined })
                      }
                    }}
                    className={`${btn} ${selPlanet.ringHeight === undefined ? 'bg-indigo-600 text-white' : 'border border-gray-600 text-gray-300'}`}
                    aria-pressed={selPlanet.ringHeight === undefined}
                  >
                    Auto
                  </button>
                  {selPlanet.ringHeight !== undefined && (
                    <>
                      <input
                        type="range"
                        min={LEVEL_LIMITS.minRingHeight}
                        max={LEVEL_LIMITS.maxRingHeight}
                        value={selPlanet.ringHeight}
                        onChange={(e) => updatePlanet(selPlanet.id, { ringHeight: Number(e.target.value) })}
                        className="min-w-0 flex-1"
                        aria-label="Ring height"
                      />
                      <span className="w-8 text-right tabular-nums">{selPlanet.ringHeight}</span>
                    </>
                  )}
                </div>
                <div className="flex justify-end">
                  <button onClick={removeSelected} className={btnDanger}>Delete planet</button>
                </div>
              </div>
            )}

            {selection.kind === 'star' && (
              <div className="flex justify-end">
                <button onClick={removeSelected} className={btnDanger}>Delete star</button>
              </div>
            )}

            {selection.kind === 'start' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <button onClick={() => setStartKind('point')} className={seg(draft.start.kind === 'point')}>Point</button>
                  <button
                    onClick={() => setStartKind('orbit')}
                    disabled={draft.planets.length === 0}
                    className={seg(draft.start.kind === 'orbit')}
                  >
                    In orbit
                  </button>
                </div>
                {draft.start.kind === 'orbit' && (() => {
                  const s = draft.start
                  return (
                    <>
                      <label className="flex items-center gap-3">
                        <span className="w-20 text-gray-300">Planet</span>
                        <select
                          value={s.planetId}
                          onChange={(e) => setDraft((d) => ({ ...d, start: { ...s, planetId: Number(e.target.value) } }))}
                          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5"
                        >
                          {draft.planets.map((p, i) => (
                            <option key={p.id} value={p.id}>Planet {i + 1}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => setDraft((d) => ({ ...d, start: { ...s, dir: 1 } }))} className={seg(s.dir === 1)}>
                          ↻ Clockwise
                        </button>
                        <button onClick={() => setDraft((d) => ({ ...d, start: { ...s, dir: -1 } }))} className={seg(s.dir === -1)}>
                          ↺ Counter
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">Drag the start around the ring to set its angle.</p>
                    </>
                  )
                })()}
                {draft.start.kind === 'point' && <p className="text-[11px] text-gray-400">Drag the start to move it.</p>}
              </div>
            )}
          </div>
        )}

        {menuOpen && (
          <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900/95 p-3" data-testid="save-menu">
            {editing && (
              <button onClick={() => void saveOver()} className={btnPrimary}>
                Save over “{editing.name}”
              </button>
            )}
            <button onClick={saveAsNew} className={editing ? btnGhost : btnPrimary}>Save as new…</button>
            {editing && (
              <div className="flex gap-2">
                <button onClick={rename} className={`${btnGhost} flex-1`}>Rename…</button>
                <button onClick={remove} className={`${btnDanger} flex-1`}>Delete…</button>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-gray-900/90 p-1.5">
          {(['select', 'planet', 'star'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`${btn} ${tool === t ? 'bg-gray-200 text-gray-900' : 'text-gray-300 hover:bg-gray-700'}`}
              aria-pressed={tool === t}
            >
              {t === 'select' ? 'Select' : t === 'planet' ? '+ Planet' : '+ Star'}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={test} className={btnGhost}>Test</button>
          <button onClick={() => setMenuOpen((o) => !o)} className={btnPrimary} aria-expanded={menuOpen}>
            Save
          </button>
        </div>
      </div>

      {modal && <EditorModal modal={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

function EditorModal({ modal, onClose }: { modal: NonNullable<Modal>; onClose: () => void }) {
  const [name, setName] = useState(modal.kind === 'name' ? modal.initial : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (fn: () => Promise<void> | void) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }, [onClose])

  const submitName = () => {
    if (modal.kind !== 'name') return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    void run(() => modal.onSubmit(trimmed))
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xs rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm" role="dialog" aria-label={modal.title}>
        <h3 className="mb-2 text-base font-semibold">{modal.title}</h3>
        {modal.kind === 'confirm' ? (
          <p className="mb-3 text-gray-300">{modal.message}</p>
        ) : (
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitName()
            }}
            className="mb-3 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-base"
            placeholder="Level name"
            aria-label="Level name"
          />
        )}
        {error && <p className="mb-3 text-red-300" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className={btnGhost}>Cancel</button>
          {modal.kind === 'confirm' ? (
            <button onClick={() => void run(modal.onConfirm)} disabled={busy} className={modal.danger ? btnDanger : btnPrimary}>
              {modal.confirmLabel}
            </button>
          ) : (
            <button onClick={submitName} disabled={busy} className={btnPrimary}>{modal.submitLabel}</button>
          )}
        </div>
      </div>
    </div>
  )
}
