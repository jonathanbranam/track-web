import { useState } from 'react'
import { DEFAULT_TUNING, type Tuning } from './physics'

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
  key: keyof Tuning
  label: string
  min: number
  max: number
  step: number
  fmt?: (v: number) => string
}

const GROUPS: { title: string; note: string; sliders: Slider[] }[] = [
  {
    title: 'Physics',
    note: 'Gravity is inverse-square: F = G · (r² × mass scale) / d². Bigger planets already pull harder via r² — mass scale multiplies that further.',
    sliders: [
      { key: 'G', label: 'Gravity strength (G)', min: 0, max: 6000, step: 50 },
      { key: 'massScale', label: 'Planet mass scale', min: 0.2, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) },
      { key: 'thrust', label: 'Thrust', min: 0, max: 400, step: 5 },
      { key: 'maxSpeed', label: 'Max speed', min: 50, max: 600, step: 10 },
      { key: 'minDist', label: 'Gravity softening (min dist)', min: 5, max: 60, step: 1 },
      { key: 'shipRadius', label: 'Ship radius', min: 3, max: 16, step: 1 },
      { key: 'planetCount', label: 'Planet count (next layout)', min: 2, max: 7, step: 1 },
    ],
  },
  {
    title: 'Fuel',
    note: 'Holding to thrust drains fuel. Reaching zero ends the round even mid-orbit — the run is spent, not just crashed.',
    sliders: [{ key: 'maxFuel', label: 'Max fuel (seconds of thrust)', min: 2, max: 20, step: 1, fmt: (v) => `${v.toFixed(0)}s` }],
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

  const set = (key: keyof Tuning, value: number) => {
    tuning[key] = value
    bump((n) => n + 1)
    onChange?.()
  }

  const resetAll = () => {
    for (const k of Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]) {
      tuning[k] = DEFAULT_TUNING[k]
    }
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
            onClick={resetAll}
            className="w-full rounded-lg border border-gray-600 py-2.5 text-[13px] font-semibold text-gray-200"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </>
  )
}
