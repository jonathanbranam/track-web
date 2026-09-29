import { useEffect, useRef, useState } from 'react'
import { DEFAULT_TUNING, type NumericTuningKey, type Tuning } from './physics'
import { PANEL_W } from './layout'
import { clearTuning, saveTuning } from './storage'

/**
 * Live tuning, in every build. Trimmed from Orbital Dodger's panel: no server
 * configs — values are remembered in this browser only. Edits mutate the
 * scene's live tuning object; the scene notices and rebuilds the course, so the
 * forecast changes straight away and the next shot flies with the new values.
 */

interface Slider {
  key: NumericTuningKey
  label: string
  min: number
  max: number
  step: number
  fmt?: (v: number) => string
}

interface Group {
  title: string
  note: string
  sliders: Slider[]
}

const f2 = (v: number) => v.toFixed(2)

const GROUPS: Group[] = [
  {
    title: 'Gravity',
    note: 'F = G · (r² × mass scale) / d². Reach: a planet’s pull fades to nothing this far from its surface (0 = unlimited).',
    sliders: [
      { key: 'G', label: 'Gravity strength (G)', min: 0, max: 3000, step: 25 },
      { key: 'massScale', label: 'Planet mass scale', min: 0.2, max: 3, step: 0.05, fmt: f2 },
      { key: 'gravityReach', label: 'Gravity reach', min: 0, max: 500, step: 10, fmt: (v) => (v > 0 ? `${v}` : '∞') },
      { key: 'influenceInner', label: 'Inner influence zone', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
      { key: 'wormholePull', label: 'Wormhole pull', min: 0, max: 4000, step: 50 },
      { key: 'orbitHeight', label: 'Ring height (largest planet)', min: 10, max: 80, step: 2 },
    ],
  },
  {
    title: 'Shots',
    note: 'Launch speed = ring orbit speed + power × boost, capped at max speed.',
    sliders: [
      { key: 'launchBoost', label: 'Launch boost', min: 50, max: 800, step: 10 },
      { key: 'maxSpeed', label: 'Max speed', min: 200, max: 900, step: 10 },
      { key: 'powerFullDrag', label: 'Full-power drag', min: 40, max: 300, step: 5 },
      { key: 'powerDeadzone', label: 'Drag deadzone', min: 0, max: 60, step: 1 },
      { key: 'captureSpeedRatio', label: 'Capture speed (× orbit speed)', min: 0.5, max: 3, step: 0.05, fmt: f2 },
      { key: 'captureBand', label: 'Capture band (±)', min: 1, max: 30, step: 1 },
    ],
  },
  {
    title: 'Damage',
    note: 'Collisions cost hull for speed into the surface above the threshold. Out of bounds costs a stroke and the penalty.',
    sliders: [
      { key: 'restitution', label: 'Bounce restitution', min: 0, max: 1, step: 0.05, fmt: f2 },
      { key: 'damageThreshold', label: 'Damage threshold', min: 0, max: 200, step: 5 },
      { key: 'planetDamageRate', label: 'Planet damage rate', min: 0, max: 0.5, step: 0.01, fmt: f2 },
      { key: 'wallDamageRate', label: 'Wall damage rate', min: 0, max: 0.5, step: 0.01, fmt: f2 },
      { key: 'obHullPenalty', label: 'Out-of-bounds hull penalty', min: 0, max: 30, step: 1 },
      { key: 'asteroidDamagePerUnit', label: 'Asteroid damage / unit', min: 0, max: 0.5, step: 0.01, fmt: f2 },
      { key: 'asteroidDrag', label: 'Asteroid drag', min: 0, max: 3, step: 0.05, fmt: f2 },
      { key: 'radiationDps', label: 'Radiation damage / s', min: 0, max: 60, step: 1 },
    ],
  },
  {
    title: 'Nudges',
    note: 'Drag during a flight to thrust that way. Throttle ramps from the deadzone to full at the full-drag distance. Keep it weak: a nudge, not an engine. The part of a nudge against the ship\'s motion uses the braking strength instead.',
    sliders: [
      { key: 'nudgeThrust', label: 'Nudge strength (accel)', min: 0, max: 600, step: 10 },
      { key: 'nudgeBrakeThrust', label: 'Braking strength (accel)', min: 0, max: 600, step: 10 },
      { key: 'nudgeDeadzone', label: 'Nudge deadzone', min: 0, max: 60, step: 1 },
      { key: 'nudgeFullDrag', label: 'Full-nudge drag', min: 20, max: 300, step: 5 },
    ],
  },
  {
    title: 'Forecast & flight',
    note: 'A level may set its own forecast length, which wins over this one.',
    sliders: [
      { key: 'forecastLength', label: 'Forecast length', min: 100, max: 4000, step: 50 },
      { key: 'maxFlightSec', label: 'Adrift after (s)', min: 3, max: 40, step: 1 },
      { key: 'flightSpeed', label: 'Flight speed', min: 0.25, max: 4, step: 0.25, fmt: (v) => `${v}×` },
    ],
  },
  {
    title: 'Scoring',
    note: 'Score = stars × points + all-stars bonus + hull × points − strokes × cost − power × cost − fuel seconds × cost.',
    sliders: [
      { key: 'starPoints', label: 'Points per star', min: 0, max: 300, step: 5 },
      { key: 'allStarsBonus', label: 'All-stars bonus', min: 0, max: 1000, step: 25 },
      { key: 'hullPoints', label: 'Points per hull', min: 0, max: 5, step: 0.25, fmt: f2 },
      { key: 'strokeCost', label: 'Cost per stroke', min: 0, max: 200, step: 5 },
      { key: 'powerCost', label: 'Cost per unit of power', min: 0, max: 100, step: 1 },
      { key: 'fuelCost', label: 'Cost per second of nudging', min: 0, max: 200, step: 5 },
    ],
  },
]

interface TuningPanelProps {
  /** The scene's live tuning object, mutated in place. */
  tuning: Tuning
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TuningPanel({ tuning, open, onOpenChange }: TuningPanelProps) {
  // Tuning is mutated in place, so a counter is what tells React to re-read it.
  const [, bump] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const set = <K extends keyof Tuning>(key: K, value: Tuning[K]) => {
    tuning[key] = value
    bump((n) => n + 1)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveTuning(tuning), 300)
  }

  const resetAll = () => {
    Object.assign(tuning, DEFAULT_TUNING)
    clearTuning()
    bump((n) => n + 1)
  }

  const changed = (Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]).filter((k) => tuning[k] !== DEFAULT_TUNING[k])

  return (
    <>
      <button
        onClick={() => onOpenChange(!open)}
        className="absolute z-40 flex h-9 w-9 items-center justify-center rounded-full bg-gray-800/80 text-gray-200"
        style={{ top: 'calc(var(--sat) + 4.5rem)', right: '0.75rem' }}
        aria-label="Tuning controls"
        aria-expanded={open}
      >
        ⚙
      </button>

      {open && (
        <div
          className="absolute bottom-0 right-0 top-0 z-30 overflow-y-auto bg-gray-900/95 px-4 pb-6 text-[13px]"
          style={{ width: `min(${PANEL_W}px, 84vw)`, paddingTop: 'calc(var(--sat) + 7rem)' }}
          data-testid="tuning-panel"
        >
          <p className="mb-4 text-[11px] leading-relaxed text-gray-500">
            Saved in this browser only. {changed.length > 0 ? `${changed.length} changed from the defaults.` : 'All defaults.'}
          </p>
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 mt-4 text-sm font-semibold text-gray-200 first:mt-0">{group.title}</h2>
              <p className="mb-4 text-[11px] leading-relaxed text-gray-500">{group.note}</p>
              {group.title === 'Gravity' && (
                <label className="mb-4 flex items-center justify-between gap-2 text-gray-300">
                  <span>Influence zones</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={tuning.influenceZones}
                    onChange={(e) => set('influenceZones', e.target.checked)}
                  />
                </label>
              )}
              {group.sliders.map((s) => (
                <div key={s.key} className="mb-4">
                  <label className="mb-1 flex justify-between text-gray-300">
                    <span>{s.label}</span>
                    <span className={`tabular-nums ${tuning[s.key] !== DEFAULT_TUNING[s.key] ? 'text-yellow-300' : 'text-gray-400'}`}>
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
            Reset to built-in defaults
          </button>
        </div>
      )}
    </>
  )
}
