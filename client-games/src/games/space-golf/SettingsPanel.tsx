import type { AimSettings, ReleaseMode } from './aim'

interface SettingsPanelProps {
  settings: AimSettings
  onChange: (s: AimSettings) => void
  onClose: () => void
}

const RELEASE: { value: ReleaseMode; label: string; note: string }[] = [
  {
    value: 'timed',
    label: 'Timed',
    note: 'Hold and pull back for power. Let go to fire from wherever the ship is on its orbit. Watch the arc swing round and pick your moment.',
  },
  {
    value: 'planned',
    label: 'Planned',
    note: 'Drag along the orbit to place the release point. Pull back anywhere else for power, then tap Fire.',
  },
]

/** The player's aim settings. Remembered in this browser. */
export default function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aim settings"
        className="w-full max-w-[340px] rounded-xl bg-gray-900 p-4 text-sm text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">Aim settings</h2>

        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Release</div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {RELEASE.map((r) => (
            <button
              key={r.value}
              onClick={() => onChange({ ...settings, release: r.value })}
              className={`rounded-lg border px-3 py-2 font-semibold ${
                settings.release === r.value ? 'border-indigo-400 bg-indigo-950/60 text-white' : 'border-gray-700 text-gray-300'
              }`}
              aria-pressed={settings.release === r.value}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs leading-relaxed text-gray-400">
          {RELEASE.find((r) => r.value === settings.release)?.note}
        </p>

        <label className="mb-1 flex items-center justify-between gap-3">
          <span className="font-semibold">Pause while aiming</span>
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={settings.pause}
            onChange={(e) => onChange({ ...settings, pause: e.target.checked })}
          />
        </label>
        <p className="mb-4 text-xs leading-relaxed text-gray-400">
          On: the orbit stops while your finger is down. Off: it keeps turning while you aim.
        </p>

        <button onClick={onClose} className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white">
          Done
        </button>
      </div>
    </div>
  )
}
