import { useState } from 'react'
import type { TimeEntry } from '../types'
import { api } from '../api'
import { Button, TextInput } from '@repo/ui'
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
        <TextInput
          label="Description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          color="indigo"
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
          <Button type="button" color="indigo" className="w-full" onClick={handleSaveKeepRunning} loading={saving} disabled={!canSave}>
            Save & Keep Running
          </Button>
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
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="submit" color="indigo" className="flex-1" loading={saving} disabled={!canSave}>Save</Button>
        </div>
      )}

      {context === 'stopping' && (
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="danger" className="flex-1" onClick={handleStopTask} loading={saving} disabled={!canStop}>Stop Task</Button>
        </div>
      )}

      {context === 'completed' && (
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="submit" color="indigo" className="flex-1" loading={saving} disabled={!canStop}>Save</Button>
        </div>
      )}
    </form>
  )
}
