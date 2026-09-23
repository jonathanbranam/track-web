import { useRef, useState } from 'react'
import { DEFAULT_TUNING, type NumericTuningKey, type Tuning } from './physics'

/**
 * Development-only live tuning. Reached through a dynamic import guarded by
 * `import.meta.env.DEV`, so Vite drops this module — and its markup — from the
 * production bundle rather than shipping unreachable code.
 *
 * Edits mutate the scene's live tuning object in place, so they apply mid-run.
 * Planet count is the exception: the scene reads it only at layout generation,
 * so it takes effect on the next layout.
 */

interface Slider {
  key: NumericTuningKey
  label: string
  min: number
  max: number
  step: number
  fmt?: (v: number) => string
}

const GROUPS: { title: string; note: string; sliders: Slider[] }[] = [
  {
    title: 'Physics',
    note: 'Gravity is inverse-square: F = G · (r² × mass scale) / d². Bigger planets already pull harder via r² — mass scale multiplies that further. Influence zones (toggle under Modes): inside the inner part of a planet\'s zone, other planets don\'t pull, so orbits hold. Reach: pull fades to nothing this far from a surface (0 = unlimited).',
    sliders: [
      { key: 'G', label: 'Gravity strength (G)', min: 0, max: 6000, step: 50 },
      { key: 'massScale', label: 'Planet mass scale', min: 0.2, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) },
      { key: 'thrust', label: 'Thrust', min: 0, max: 400, step: 5 },
      { key: 'maxSpeed', label: 'Max speed', min: 50, max: 600, step: 10 },
      { key: 'minDist', label: 'Gravity softening (min dist)', min: 5, max: 60, step: 1 },
      { key: 'shipRadius', label: 'Ship radius', min: 3, max: 16, step: 1 },
      { key: 'influenceInner', label: 'Influence inner zone', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
      { key: 'gravityReach', label: 'Gravity reach (0 = unlimited)', min: 0, max: 400, step: 10, fmt: (v) => (v > 0 ? `${v.toFixed(0)}` : '∞') },
      { key: 'planetCount', label: 'Planet count (next layout)', min: 2, max: 7, step: 1 },
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
    note: 'Rings sit lower on smaller planets and turn at the true circular orbit speed, so letting go keeps orbiting. Coast onto a ring roughly along it at roughly the right speed and the ship locks into a perfect orbit — no fuel, no gravity. Press to break out. Scoring fades to nothing over the scoring arc while locked. Set the tolerances to 0 to disable capture.',
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

/** Tuning keys whose value is a boolean — the ones a checkbox can drive. */
type BooleanTuningKey = {
  [K in keyof Tuning]: Tuning[K] extends boolean ? K : never
}[keyof Tuning]

const TOGGLES: { key: BooleanTuningKey; label: string }[] = [
  { key: 'influenceZones', label: 'Influence zones' },
]

interface TuningPanelProps {
  /** The scene's live tuning object, mutated in place. */
  tuning: Tuning
  onChange?: () => void
}

export default function TuningPanel({ tuning, onChange }: TuningPanelProps) {
  const [open, setOpen] = useState(false)
  // Tuning is mutated in place (the scene holds the same object), so a render
  // counter is what tells React to re-read it.
  const [, bump] = useState(0)

  const set = <K extends keyof Tuning>(key: K, value: Tuning[K]) => {
    tuning[key] = value
    bump((n) => n + 1)
    onChange?.()
  }

  // Export: the current values as JSON, ready to paste over DEFAULT_TUNING in physics.ts.
  const [exportText, setExportText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const exportRef = useRef<HTMLTextAreaElement>(null)

  const openExport = () => {
    setExportText(JSON.stringify(tuning, null, 2))
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

  const resetAll = () => {
    Object.assign(tuning, DEFAULT_TUNING)
    bump((n) => n + 1)
    onChange?.()
  }

  return (
    <>
      {/* Sits below the HUD row — at the HUD's own height it collided with the quit button. */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute z-40 w-9 h-9 rounded-full bg-gray-800/80 text-gray-200 flex items-center justify-center"
        style={{ top: 'calc(var(--sat) + 4rem)', right: '1rem' }}
        aria-label="Tuning controls"
      >
        ⚙
      </button>

      {open && (
        <div
          className="absolute top-0 right-0 bottom-0 z-30 w-[min(300px,84vw)] overflow-y-auto bg-gray-900/95 px-4 pb-6 text-[13px]"
          // Clears the toggle button, which floats above the panel at z-40.
          style={{ paddingTop: 'calc(var(--sat) + 7rem)' }}
        >
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
            {TOGGLES.map((c) => (
              <label key={c.key} className="mb-3 flex items-center justify-between gap-2 text-gray-300">
                <span>{c.label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={tuning[c.key]}
                  onChange={(e) => set(c.key, e.target.checked)}
                />
              </label>
            ))}
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 mt-4 text-sm font-semibold text-gray-200 first:mt-0">{group.title}</h2>
              <p className="mb-4 text-[11px] leading-relaxed text-gray-500">{group.note}</p>
              {group.sliders.map((s) => (
                <div key={s.key} className="mb-4">
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
                    onChange={(e) => set(s.key, parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </div>
          ))}

          <button
            onClick={openExport}
            className="mb-3 w-full rounded-lg border border-gray-600 py-2.5 text-[13px] font-semibold text-gray-200"
          >
            Export settings as JSON
          </button>

          <button
            onClick={resetAll}
            className="w-full rounded-lg border border-gray-600 py-2.5 text-[13px] font-semibold text-gray-200"
          >
            Reset to defaults
          </button>
        </div>
      )}

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
