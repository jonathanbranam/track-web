import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_TUNING, cloneTuning, type NumericTuningKey, type Tuning } from './physics'
import {
  clearSelectedId,
  loadSelectedId,
  pickConfig,
  resolveTuning,
  saveSelectedId,
  tuningEquals,
  type OrbitalConfig,
} from './configs'
import { PANEL_W } from './layout'
import { ConfigApiError, createOdConfig, deleteOdConfig, listOdConfigs, updateOdConfig } from '../../api'

/**
 * Live tuning plus saved configs, in every build. Lazy-loaded by the host so it
 * stays its own chunk.
 *
 * Edits mutate the scene's live tuning object in place, so they apply mid-run.
 * Planet count is the exception: the scene reads it only at layout generation,
 * so it takes effect on the next layout.
 *
 * Configs are shared by every player and stored on the server; which one this
 * browser plays is remembered in localStorage. The panel compares the values in
 * play with the selected config's saved values to show unsaved changes.
 */

interface Slider {
  key: NumericTuningKey
  label: string
  min: number
  max: number
  step: number
  fmt?: (v: number) => string
}

/** Tuning keys whose value is a boolean — the ones a checkbox can drive. */
type BooleanTuningKey = {
  [K in keyof Tuning]: Tuning[K] extends boolean ? K : never
}[keyof Tuning]

interface Group {
  title: string
  note: string
  /** A master switch for the group: shown first, and its sliders are disabled while it is off. */
  toggle?: { key: BooleanTuningKey; label: string }
  sliders: Slider[]
}

const GROUPS: Group[] = [
  {
    title: 'Physics',
    note: 'Gravity is inverse-square: F = G · (r² × mass scale) / d². Bigger planets already pull harder via r² — mass scale multiplies that further. Reach: pull fades to nothing this far from a surface (0 = unlimited).',
    sliders: [
      { key: 'G', label: 'Gravity strength (G)', min: 0, max: 6000, step: 50 },
      { key: 'massScale', label: 'Planet mass scale', min: 0.2, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) },
      { key: 'thrust', label: 'Thrust', min: 0, max: 400, step: 5 },
      { key: 'maxSpeed', label: 'Max speed', min: 50, max: 600, step: 10 },
      { key: 'minDist', label: 'Gravity softening (min dist)', min: 5, max: 60, step: 1 },
      { key: 'shipRadius', label: 'Ship radius', min: 3, max: 16, step: 1 },
      { key: 'gravityReach', label: 'Gravity reach (0 = unlimited)', min: 0, max: 400, step: 10, fmt: (v) => (v > 0 ? `${v.toFixed(0)}` : '∞') },
      { key: 'planetCount', label: 'Planet count (next layout)', min: 2, max: 7, step: 1 },
    ],
  },
  {
    title: 'Influence zones',
    note: "Each planet owns the space where its pull beats its nearest neighbour's. Inside the inner part of that space, other planets stop pulling, so an orbit holds after you let go; their pull fades back in toward the zone's edge. Off: every planet pulls everywhere, as in real physics.",
    toggle: { key: 'influenceZones', label: 'Influence zones' },
    sliders: [
      { key: 'influenceInner', label: 'Inner zone (neighbours ignored)', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
    ],
  },
  {
    title: 'Fuel',
    note: 'Holding to thrust drains fuel. Once the tank is empty the ship coasts for the grace period, then the run ends.',
    sliders: [
      { key: 'maxFuel', label: 'Max fuel (seconds of thrust)', min: 2, max: 20, step: 1, fmt: (v) => `${v.toFixed(0)}s` },
      { key: 'fuelGraceSec', label: 'Empty-tank grace', min: 0, max: 15, step: 0.5, fmt: (v) => `${v.toFixed(1)}s` },
    ],
  },
  {
    title: 'Scoring',
    note: 'Points accrue slowly in open space and ramp quadratically the closer you fly to a surface, rewarding close orbits over parking far away.',
    sliders: [
      { key: 'scoreBase', label: 'Base rate (far away)', min: 0, max: 20, step: 1 },
      { key: 'scoreBonus', label: 'Proximity bonus (max, touching)', min: 0, max: 100, step: 5 },
      { key: 'scoreRange', label: 'Proximity range', min: 50, max: 500, step: 10 },
      { key: 'starBonus', label: 'Star bonus', min: 0, max: 200, step: 10 },
    ],
  },
  {
    title: 'Forward path guide',
    note: "Faint line projects where gravity alone (ignoring thrust) would carry the ship, so you can read an upcoming orbit or collision.",
    sliders: [{ key: 'forecastRange', label: 'Forecast distance', min: 0, max: 600, step: 10 }],
  },
  {
    title: 'Shields',
    note: 'A contact is glancing when the speed *into* the surface is below the lethal speed: it costs a charge and knocks the ship along the surface. Faster, or with no charges left, is a crash. Set charges to 0 for the old instant death.',
    sliders: [
      { key: 'shieldCharges', label: 'Shield charges (next run)', min: 0, max: 6, step: 1 },
      { key: 'lethalImpactSpeed', label: 'Lethal impact speed', min: 0, max: 300, step: 5 },
      { key: 'bounceOut', label: 'Bounce-out speed', min: 0, max: 200, step: 5 },
      { key: 'kickTangential', label: 'Along-surface kick', min: 0, max: 300, step: 5 },
      { key: 'shieldGraceSec', label: 'Grace period', min: 0, max: 2, step: 0.1, fmt: (v) => `${v.toFixed(1)}s` },
    ],
  },
  {
    title: 'Orbit capture',
    toggle: { key: 'orbitCapture', label: 'Orbit capture' },
    note: 'Rings sit lower on smaller planets and turn at the true circular orbit speed, so letting go keeps orbiting. Coast onto a ring roughly along it at roughly the right speed and the ship locks into a perfect orbit — no fuel, no gravity. Press to break out. Scoring fades to nothing over the scoring arc while locked. Off: no rings and no locking — orbits are flown by hand.',
    sliders: [
      { key: 'orbitHeight', label: 'Ring height (largest planet)', min: 10, max: 120, step: 2 },
      { key: 'captureBand', label: 'Capture band (± px)', min: 0, max: 40, step: 1 },
      { key: 'captureAngleDeg', label: 'Capture angle (°)', min: 0, max: 80, step: 1 },
      { key: 'captureSpeedTol', label: 'Speed tolerance', min: 0, max: 1, step: 0.05, fmt: (v) => `±${Math.round(v * 100)}%` },
      { key: 'orbitScoreArcDeg', label: 'Locked scoring arc', min: 0, max: 720, step: 15, fmt: (v) => `${v.toFixed(0)}°` },
    ],
  },
  {
    title: 'Controls',
    note: 'Relative: press anywhere and drag — thrust follows the drag, ramping up to full at the full-thrust drag distance. Direct: full thrust toward the finger. The deadzone is the drag needed before thrust (relative) or the radius around the ship where direction is held (direct).',
    sliders: [
      { key: 'controlDeadzone', label: 'Deadzone', min: 0, max: 60, step: 1 },
      { key: 'controlFullDrag', label: 'Full-thrust drag (relative)', min: 20, max: 250, step: 5 },
    ],
  },
]

interface Choice<K extends keyof Tuning> {
  key: K
  label: string
  options: { value: Tuning[K]; label: string }[]
}

const CHOICES: [Choice<'controlMode'>, Choice<'edgeMode'>] = [
  {
    key: 'controlMode',
    label: 'Control mode',
    options: [
      { value: 'relative', label: 'Relative drag' },
      { value: 'direct', label: 'Direct (toward finger)' },
    ],
  },
  {
    key: 'edgeMode',
    label: 'Edge mode',
    options: [
      { value: 'bounded', label: 'Bounded + indicator' },
      { value: 'wrap', label: 'Wrap' },
    ],
  },
]

/** Keys that start a new block in DEFAULT_TUNING, so an export diffs cleanly against it. */
const EXPORT_BREAKS = new Set<keyof Tuning>(['shieldCharges', 'orbitCapture', 'controlMode'])

/** The tuning as a TypeScript object literal, formatted like DEFAULT_TUNING in physics.ts. */
function toTsLiteral(t: Tuning): string {
  const lines = Object.entries(t).map(([k, v]) => {
    const line = `  ${k}: ${typeof v === 'string' ? `'${v}'` : String(v)},`
    return EXPORT_BREAKS.has(k as keyof Tuning) ? `\n${line}` : line
  })
  return `{\n${lines.join('\n')}\n}`
}

interface TuningPanelProps {
  /** The scene's live tuning object, mutated in place. */
  tuning: Tuning
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The configs as loaded at startup, or null if they could not be loaded. */
  initialConfigs: OrbitalConfig[] | null
  /** The config the game started with (null when configs were unavailable). */
  initialSelectedId: number | null
  /** Replace every tuning value at once — a config was chosen or reverted. */
  onApply: (t: Tuning) => void
}

type Modal =
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => Promise<void> | void }
  | { kind: 'name'; title: string; initial: string; submitLabel: string; onSubmit: (name: string) => Promise<void> }

const NAME_MAX = 40

function errorMessage(err: unknown): string {
  if (err instanceof ConfigApiError) return err.message
  return "Couldn't reach the server. Try again."
}

export default function TuningPanel({
  tuning,
  open,
  onOpenChange,
  initialConfigs,
  initialSelectedId,
  onApply,
}: TuningPanelProps) {
  // Tuning is mutated in place (the scene holds the same object), so a render
  // counter is what tells React to re-read it.
  const [, bump] = useState(0)

  const [configs, setConfigs] = useState<OrbitalConfig[] | null>(initialConfigs)
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId)
  // The selected config's saved values, resolved over the shipped defaults.
  const [saved, setSaved] = useState<Tuning>(() => {
    const cfg = initialConfigs?.find((c) => c.id === initialSelectedId)
    return cfg ? resolveTuning(cfg.tuning) : cloneTuning(DEFAULT_TUNING)
  })
  const [modal, setModal] = useState<Modal | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Async handlers read the latest selection through refs, not stale closures.
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const savedRef = useRef(saved)
  savedRef.current = saved

  const selected = configs?.find((c) => c.id === selectedId) ?? null
  const dirty = !tuningEquals(tuning, saved)

  const set = <K extends keyof Tuning>(key: K, value: Tuning[K]) => {
    tuning[key] = value
    bump((n) => n + 1)
  }

  const apply = useCallback(
    (t: Tuning) => {
      onApply(cloneTuning(t))
      bump((n) => n + 1)
    },
    [onApply],
  )

  /** Make `cfg` the selection. Applies its values unless told to keep the ones in play. */
  const choose = useCallback(
    (cfg: OrbitalConfig, keepValues = false) => {
      const resolved = resolveTuning(cfg.tuning)
      setSelectedId(cfg.id)
      selectedRef.current = cfg.id
      setSaved(resolved)
      savedRef.current = resolved
      saveSelectedId(cfg.id)
      if (!keepValues) apply(resolved)
    },
    [apply],
  )

  /**
   * Take a fresh list from the server. If the selected config is still there,
   * just refresh its saved snapshot. If it is gone (deleted, possibly by another
   * player) or nothing was selected yet, fall back to the remembered/Default
   * config — keeping the values in play, as unsaved edits, when there are any.
   */
  const reconcile = useCallback(
    (list: OrbitalConfig[]) => {
      setConfigs(list)
      const current = selectedRef.current
      const still = current !== null ? list.find((c) => c.id === current) : undefined
      if (still) {
        const resolved = resolveTuning(still.tuning)
        setSaved(resolved)
        savedRef.current = resolved
        return
      }
      const { config, stale } = pickConfig(list, current ?? loadSelectedId())
      if (!config) return
      if (stale || current !== null) clearSelectedId()
      const hasEdits = !tuningEquals(tuning, savedRef.current)
      choose(config, hasEdits)
      if (current !== null) {
        setNotice(
          hasEdits
            ? `That config was deleted. Now on “${config.name}” — your changes are kept as unsaved.`
            : `That config was deleted. Now on “${config.name}”.`,
        )
      }
    },
    [choose, tuning],
  )

  const refresh = useCallback(async () => {
    try {
      reconcile(await listOdConfigs())
    } catch {
      if (configs === null) setNotice('Configs unavailable — using the built-in settings.')
    }
  }, [reconcile, configs])

  // Refetch whenever the panel opens, so other players' changes show up.
  useEffect(() => {
    if (open) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /** Run a server mutation with the busy flag set, then refresh the list. */
  const mutate = async (fn: () => Promise<void>) => {
    setBusy(true)
    setNotice(null)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  const onSelect = (id: number) => {
    const cfg = configs?.find((c) => c.id === id)
    if (!cfg || id === selectedId) return
    if (!dirty) {
      choose(cfg)
      return
    }
    setModal({
      kind: 'confirm',
      title: 'Discard unsaved changes?',
      message: `Your changes to “${selected?.name ?? 'the current settings'}” will be lost.`,
      confirmLabel: 'Discard',
      danger: true,
      onConfirm: () => choose(cfg),
    })
  }

  const doSave = async (cfg: OrbitalConfig) => {
    const updated = await updateOdConfig(cfg.id, { tuning: { ...tuning } })
    reconcile((configs ?? []).map((c) => (c.id === updated.id ? updated : c)))
    void refresh()
  }

  const onSave = () => {
    if (!selected) return
    if (selected.isDefault) {
      setModal({
        kind: 'confirm',
        title: 'Save over the Default?',
        message: 'This will replace the default config for all players',
        confirmLabel: 'Replace Default',
        danger: true,
        onConfirm: () => doSave(selected),
      })
      return
    }
    void mutate(async () => {
      try {
        await doSave(selected)
      } catch (err) {
        setNotice(errorMessage(err))
      }
    })
  }

  const onSaveAsNew = () => {
    setModal({
      kind: 'name',
      title: 'Save as new config',
      initial: '',
      submitLabel: 'Create',
      onSubmit: async (name) => {
        const created = await createOdConfig(name, { ...tuning })
        setConfigs((cs) => [...(cs ?? []), created])
        choose(created, true)
        void refresh()
      },
    })
  }

  const onRename = () => {
    if (!selected || selected.isDefault) return
    setModal({
      kind: 'name',
      title: 'Rename config',
      initial: selected.name,
      submitLabel: 'Rename',
      onSubmit: async (name) => {
        const updated = await updateOdConfig(selected.id, { name })
        setConfigs((cs) => (cs ?? []).map((c) => (c.id === updated.id ? updated : c)))
        void refresh()
      },
    })
  }

  const onDelete = () => {
    if (!selected || selected.isDefault) return
    setModal({
      kind: 'confirm',
      title: `Delete “${selected.name}”?`,
      message: 'This removes it for all players. Anyone playing it will be moved to the Default.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await deleteOdConfig(selected.id)
        const list = await listOdConfigs()
        setConfigs(list)
        const fallback = pickConfig(list, null).config
        clearSelectedId()
        if (fallback) choose(fallback)
      },
    })
  }

  const onRevert = () => apply(saved)

  // Export: the current values as a TS object literal, ready to paste over DEFAULT_TUNING in physics.ts.
  const [exportText, setExportText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const exportRef = useRef<HTMLTextAreaElement>(null)

  const openExport = () => {
    setExportText(toTsLiteral(tuning))
    setCopied(false)
  }

  const copyExport = async () => {
    if (exportText === null) return
    try {
      // navigator.clipboard needs a secure context, which a phone on the LAN over
      // plain HTTP is not — fall back to selecting the text and execCommand.
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(exportText)
      } else {
        exportRef.current?.select()
        if (!document.execCommand('copy')) throw new Error('copy refused')
      }
      setCopied(true)
    } catch {
      exportRef.current?.select()
    }
  }

  // Shipped defaults into play; nothing is saved until the player saves.
  const resetAll = () => apply(DEFAULT_TUNING)

  const smallBtn =
    'rounded-lg border border-gray-600 px-2.5 py-1.5 text-[12px] font-semibold text-gray-200 disabled:opacity-40'

  return (
    <>
      {/* Sits below the HUD row — at the HUD's own height it collided with the quit button. */}
      <button
        onClick={() => onOpenChange(!open)}
        className="absolute z-40 w-9 h-9 rounded-full bg-gray-800/80 text-gray-200 flex items-center justify-center"
        style={{ top: 'calc(var(--sat) + 4rem)', right: '1rem' }}
        aria-label="Tuning controls"
        aria-expanded={open}
      >
        ⚙
      </button>

      {open && (
        <div
          className="absolute top-0 right-0 bottom-0 z-30 overflow-y-auto bg-gray-900/95 px-4 pb-6 text-[13px]"
          // Clears the toggle button, which floats above the panel at z-40.
          style={{ width: `min(${PANEL_W}px, 84vw)`, paddingTop: 'calc(var(--sat) + 7rem)' }}
          data-testid="tuning-panel"
        >
          <div className="mb-4 rounded-lg border border-gray-700 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Config</h2>
              {dirty && configs && (
                <span className="text-[11px] font-semibold text-yellow-300" data-testid="unsaved">
                  Unsaved changes
                </span>
              )}
            </div>

            {configs === null ? (
              <p className="text-[11px] leading-relaxed text-gray-500">
                Configs unavailable — using the built-in settings. Sliders still work.
              </p>
            ) : (
              <>
                <select
                  aria-label="Config"
                  className="mb-3 w-full rounded bg-gray-800 px-2 py-1.5 text-gray-100"
                  value={selectedId ?? ''}
                  disabled={busy}
                  onChange={(e) => onSelect(Number(e.target.value))}
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <button className={smallBtn} disabled={busy || !selected || !dirty} onClick={onSave}>
                    Save
                  </button>
                  <button className={smallBtn} disabled={busy} onClick={onSaveAsNew}>
                    Save as new…
                  </button>
                  {selected && !selected.isDefault && (
                    <>
                      <button className={smallBtn} disabled={busy} onClick={onRename}>
                        Rename…
                      </button>
                      <button className={`${smallBtn} text-red-300`} disabled={busy} onClick={onDelete}>
                        Delete
                      </button>
                    </>
                  )}
                  {dirty && (
                    <button className={smallBtn} disabled={busy} onClick={onRevert}>
                      Revert
                    </button>
                  )}
                </div>
              </>
            )}
            {notice && <p className="mt-2 text-[11px] leading-relaxed text-orange-300">{notice}</p>}
          </div>

          <div className="mb-2">
            <h2 className="mb-2 text-sm font-semibold text-gray-200">Modes</h2>
            {CHOICES.map((c) => (
              <label key={c.key} className="mb-3 flex items-center justify-between gap-2 text-gray-300">
                <span>{c.label}</span>
                <select
                  className="rounded bg-gray-800 px-2 py-1 text-gray-100"
                  value={tuning[c.key]}
                  onChange={(e) => set(c.key, e.target.value as Tuning[typeof c.key])}
                >
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 mt-4 text-sm font-semibold text-gray-200 first:mt-0">{group.title}</h2>
              <p className="mb-4 text-[11px] leading-relaxed text-gray-500">{group.note}</p>
              {group.toggle && (
                <label className="mb-4 flex items-center justify-between gap-2 text-gray-300">
                  <span>{group.toggle.label}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={tuning[group.toggle.key]}
                    onChange={(e) => set(group.toggle!.key, e.target.checked)}
                  />
                </label>
              )}
              {group.sliders.map((s) => {
                const disabled = group.toggle ? !tuning[group.toggle.key] : false
                return (
                  <div key={s.key} className={`mb-4 ${disabled ? 'opacity-40' : ''}`}>
                    <label className="mb-1 flex justify-between text-gray-300">
                      <span>{s.label}</span>
                      <span className="tabular-nums text-yellow-300">
                        {s.fmt ? s.fmt(tuning[s.key]) : Math.round(tuning[s.key])}
                      </span>
                    </label>
                    <input
                      type="range"
                      className="w-full"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={tuning[s.key]}
                      disabled={disabled}
                      onChange={(e) => set(s.key, parseFloat(e.target.value))}
                    />
                  </div>
                )
              })}
            </div>
          ))}

          <button
            onClick={openExport}
            className="mb-3 w-full rounded-lg border border-gray-600 py-2.5 text-[13px] font-semibold text-gray-200"
          >
            Export settings
          </button>

          <button
            onClick={resetAll}
            className="w-full rounded-lg border border-gray-600 py-2.5 text-[13px] font-semibold text-gray-200"
          >
            Reset to built-in defaults
          </button>
        </div>
      )}

      {modal && <ConfigModal modal={modal} onClose={() => setModal(null)} />}

      {exportText !== null && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExportText(null)}
        >
          <div
            className="flex max-h-full w-full max-w-[360px] flex-col rounded-lg bg-gray-900 p-4 text-[13px] text-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold">Current settings</h2>
            <p className="mb-2 text-[11px] leading-relaxed text-gray-500">
              Paste over the <code>DEFAULT_TUNING</code> object in <code>physics.ts</code>.
            </p>
            <textarea
              ref={exportRef}
              readOnly
              value={exportText}
              onFocus={(e) => e.currentTarget.select()}
              className="mb-3 h-72 w-full resize-none rounded bg-gray-800 p-2 font-mono text-[11px] text-gray-100"
            />
            <div className="flex gap-2">
              <button
                onClick={copyExport}
                className="flex-1 rounded-lg bg-yellow-400 py-2.5 font-semibold text-gray-900"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                onClick={() => setExportText(null)}
                className="flex-1 rounded-lg border border-gray-600 py-2.5 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * One in-panel dialog for confirmations and name entry — styled, and unlike
 * window.confirm/prompt it behaves in the iOS standalone PWA. The full-screen
 * backdrop keeps taps off the canvas. Server errors show inline and keep the
 * dialog open; a cancel changes nothing.
 */
function ConfigModal({ modal, onClose }: { modal: Modal; onClose: () => void }) {
  const [name, setName] = useState(modal.kind === 'name' ? modal.initial : '')
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const trimmed = name.trim()
  const nameInvalid = modal.kind === 'name' && (trimmed.length === 0 || trimmed.length > NAME_MAX)

  const submit = async () => {
    if (working || nameInvalid) return
    setWorking(true)
    setError(null)
    try {
      if (modal.kind === 'name') await modal.onSubmit(trimmed)
      else await modal.onConfirm()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
        className="w-full max-w-[340px] rounded-lg bg-gray-900 p-4 text-[13px] text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-sm font-semibold">{modal.title}</h2>
        {modal.kind === 'confirm' ? (
          <p className="mb-4 leading-relaxed text-gray-300">{modal.message}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <input
              autoFocus
              aria-label="Config name"
              value={name}
              maxLength={NAME_MAX + 10}
              onChange={(e) => setName(e.target.value)}
              className="mb-1 w-full rounded bg-gray-800 px-2 py-2 text-gray-100"
            />
            <p className="mb-3 text-[11px] text-gray-500">
              {trimmed.length > NAME_MAX ? `At most ${NAME_MAX} characters.` : 'Names are shared with all players.'}
            </p>
          </form>
        )}
        {error && <p className="mb-3 text-[12px] text-red-300">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => void submit()}
            disabled={working || nameInvalid}
            className={`flex-1 rounded-lg py-2.5 font-semibold disabled:opacity-40 ${
              modal.kind === 'confirm' && modal.danger ? 'bg-red-500 text-white' : 'bg-yellow-400 text-gray-900'
            }`}
          >
            {modal.kind === 'name' ? modal.submitLabel : modal.confirmLabel}
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-600 py-2.5 font-semibold">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
