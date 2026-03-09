import { useState } from 'react'

interface TimePickerProps {
  value: Date
  onChange: (d: Date) => void
  min?: Date       // lower bound — cannot go before this
  label?: string
}

/**
 * Snap to the largest multiple of intervalMinutes strictly less than the
 * total minutes represented by `date`. Respects the `min` lower bound.
 */
function snapToPreviousBoundary(date: Date, intervalMinutes: number, min?: Date): Date {
  const totalMinutes = date.getHours() * 60 + date.getMinutes()
  // Math.floor((n-1)/k)*k gives the largest multiple of k strictly less than n
  let snappedMinutes = Math.floor((totalMinutes - 1) / intervalMinutes) * intervalMinutes

  // Handle crossing midnight (snappedMinutes could be negative)
  snappedMinutes = ((snappedMinutes % 1440) + 1440) % 1440

  const result = new Date(date)
  result.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0)

  // Clamp to lower bound
  if (min && result < min) {
    const clamped = new Date(min)
    clamped.setSeconds(0, 0)
    return clamped
  }
  return result
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatTime(d: Date) {
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad2(m)} ${ampm}`
}

export default function TimePicker({ value, onChange, min, label }: TimePickerProps) {
  // Local string state for manual input (24h format for <input type="time">)
  const [inputVal, setInputVal] = useState(
    `${pad2(value.getHours())}:${pad2(value.getMinutes())}`
  )

  // Keep input in sync when value changes externally
  const syncInput = (d: Date) => {
    setInputVal(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`)
  }

  function handleSnap(interval: number) {
    const snapped = snapToPreviousBoundary(value, interval, min)
    onChange(snapped)
    syncInput(snapped)
  }

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputVal(e.target.value)
    const [hStr, mStr] = e.target.value.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (isNaN(h) || isNaN(m)) return

    const next = new Date(value)
    next.setHours(h, m, 0, 0)

    // Clamp to lower bound silently — the parent validates for submit
    if (min && next < min) return
    onChange(next)
  }

  const isAtMin = min !== undefined && value <= min
  const isInvalid = min !== undefined && value < min

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-gray-300">{label}</p>
      )}

      {/* Current time display */}
      <div className="text-3xl font-mono font-semibold text-white text-center py-2">
        {formatTime(value)}
      </div>

      {/* Manual input */}
      <div className="flex justify-center">
        <input
          type="time"
          value={inputVal}
          onChange={handleManualChange}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Quick offset buttons */}
      <div className="flex gap-2 justify-center">
        {[5, 10, 30].map((interval) => (
          <button
            key={interval}
            type="button"
            onClick={() => handleSnap(interval)}
            disabled={isAtMin}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            -{interval}m
          </button>
        ))}
      </div>

      {isInvalid && (
        <p className="text-red-400 text-xs text-center">
          Time cannot be before {min ? formatTime(min) : 'previous entry end'}
        </p>
      )}
    </div>
  )
}
