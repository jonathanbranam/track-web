import { useState } from 'react'
import type { TimeEntry } from '../types'
import { api } from '../api'
import TagChip from './TagChip'
import TimePicker from './TimePicker'

interface EditEntryFormProps {
  entry: TimeEntry
  context: 'running' | 'stopping' | 'completed'
  lowerBound: Date | null
  upperBound: Date | null
  initialEndedAt?: Date
  onSave: (updated: TimeEntry) => void
  onStop: (updated: TimeEntry) => void
  onCancel: () => void
}

export default function EditEntryForm({
  entry,
  context,
  lowerBound,
  upperBound,
  initialEndedAt,
  onSave,
  onStop,
  onCancel,
}: EditEntryFormProps) {
  const [description, setDescription] = useState(entry.description)
  const [startedAt, setStartedAt] = useState(new Date(entry.startedAt))
  const [endedAt, setEndedAt] = useState<Date>(
    initialEndedAt ?? (entry.endedAt ? new Date(entry.endedAt) : new Date())
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tagMatches = (description.match(/(#|:)[a-zA-Z][a-zA-Z0-9-]*/g) ?? [])
    .map((t) => t.replace(/^[#:]/, ''))

  const startInvalid = lowerBound !== null && startedAt < lowerBound
  const endBeforeStart = context !== 'running' && endedAt <= startedAt
  const endAfterUpper = context !== 'running' && upperBound !== null && endedAt > upperBound
  const endInvalid = endBeforeStart || endAfterUpper

  const canSave = description.trim().length > 0 && !startInvalid
  const canStop = canSave && !endInvalid

  async function handleSaveKeepRunning() {
    setSaving(true)
    setError(null)
    try {
      const { entry: updated } = await api.entries.update(entry.id, {
        description: description.trim(),
        startedAt: startedAt.toISOString(),
      })
      onSave(updated)
    } catch (err: unknown) {
      const e = err as { error?: string }
      setError(e.error ?? 'Failed to save.')
      setSaving(false)
    }
  }

  async function handleStopTask() {
    setSaving(true)
    setError(null)
    try {
      const { entry: updated } = await api.entries.update(entry.id, {
        description: description.trim(),
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })
      onStop(updated)
    } catch (err: unknown) {
      const e = err as { error?: string }
      setError(e.error ?? 'Failed to stop task.')
      setSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { entry: updated } = await api.entries.update(entry.id, {
        description: description.trim(),
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })
      onSave(updated)
    } catch (err: unknown) {
      const e = err as { error?: string }
      setError(e.error ?? 'Failed to save.')
      setSaving(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (context === 'running') handleSaveKeepRunning()
    else if (context === 'completed') handleSave()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Edit Task</h2>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        {tagMatches.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tagMatches.map((t, i) => (
              <TagChip key={i} tag={t} />
            ))}
          </div>
        )}
      </div>

      {/* Started at */}
      <TimePicker
        value={startedAt}
        onChange={(d) => { setStartedAt(d); setError(null) }}
        min={lowerBound ?? undefined}
        label="Started at"
        showOffsets={context !== 'stopping'}
      />

      {/* Save & Keep Running mid-section button (stopping context only) */}
      {context === 'stopping' && (
        <>
          <button
            type="button"
            onClick={handleSaveKeepRunning}
            disabled={saving || !canSave}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save & Keep Running'}
          </button>
          <hr className="border-gray-700" />
        </>
      )}

      {/* Ended at (not shown for running context) */}
      {context !== 'running' && (
        <div className="space-y-1">
          <TimePicker
            value={endedAt}
            onChange={(d) => { setEndedAt(d); setError(null) }}
            min={startedAt}
            label="Ended at"
          />
          {endAfterUpper && upperBound && (
            <p className="text-red-400 text-xs text-center">
              Time cannot be after {upperBound.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Action buttons */}
      {context === 'running' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !canSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {context === 'stopping' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStopTask}
            disabled={saving || !canStop}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Stopping…' : 'Stop Task'}
          </button>
        </div>
      )}

      {context === 'completed' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !canStop}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </form>
  )
}
