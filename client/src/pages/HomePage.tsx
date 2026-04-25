import { useEffect, useState, useCallback } from 'react'
import type { TimeEntry } from '../types'
import { api } from '../api'
import TagChip, { parseTags } from '../components/TagChip'
import TimePicker from '../components/TimePicker'
import EditEntryForm from '../components/EditEntryForm'

// ── Elapsed time display ────────────────────────────────────────────────────

function useElapsed(startedAt: string) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calc = () => setElapsed(Date.now() - new Date(startedAt).getTime())
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const h = Math.floor(elapsed / 3_600_000)
  const m = Math.floor((elapsed % 3_600_000) / 60_000)
  const s = Math.floor((elapsed % 60_000) / 1000)
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDurationMs(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

// ── Inline tag highlighting in description ──────────────────────────────────

function DescriptionWithTags({ text }: { text: string }) {
  const parts = text.split(/(#[a-zA-Z][a-zA-Z0-9-]*)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('#') ? (
          <span key={i} className="text-indigo-400 font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

// ── Running Task card ───────────────────────────────────────────────────────

interface RunningTaskProps {
  entry: TimeEntry
  onStopped: (endedAt: Date) => void
  onDeleted: () => void
  onEdited: (updated: TimeEntry) => void
}

function RunningTask({ entry, onStopped, onDeleted, onEdited }: RunningTaskProps) {
  const elapsed = useElapsed(entry.startedAt)
  const [showStop, setShowStop] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editedFromStop, setEditedFromStop] = useState(false)
  const [lowerBound, setLowerBound] = useState<Date | null>(null)
  const [stopTime, setStopTime] = useState(new Date())
  const [stopping, setStopping] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const minTime = new Date(entry.startedAt)
  const isInvalid = stopTime < minTime

  async function fetchLowerBound(): Promise<Date | null> {
    try {
      const { entries } = await api.entries.list()
      const prev = entries.at(-1)
      return prev?.endedAt ? new Date(prev.endedAt) : null
    } catch {
      return null
    }
  }

  async function openEditFromCard() {
    const lb = await fetchLowerBound()
    setLowerBound(lb)
    setEditedFromStop(false)
    setShowDelete(false)
    setShowStop(false)
    setShowEdit(true)
    setError(null)
  }

  async function openEditFromStop() {
    const lb = await fetchLowerBound()
    setLowerBound(lb)
    setEditedFromStop(true)
    setShowStop(false)
    setShowEdit(true)
    setError(null)
  }

  function handleEditCancel() {
    setShowEdit(false)
    setShowStop(false)
  }

  async function confirmStop() {
    setStopping(true)
    setError(null)
    try {
      await api.entries.update(entry.id, { endedAt: stopTime.toISOString() })
      onStopped(stopTime)
    } catch {
      setError('Failed to stop task. Please try again.')
      setStopping(false)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    setError(null)
    try {
      await api.entries.delete(entry.id)
      onDeleted()
    } catch {
      setError('Failed to delete task. Please try again.')
      setDeleting(false)
    }
  }

  if (showDelete) {
    return (
      <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Delete Task?</h2>
        <p className="text-white font-medium">
          <DescriptionWithTags text={entry.description} />
        </p>
        <p className="text-gray-400 text-sm">This will permanently remove the running task.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => { setShowDelete(false); setError(null) }}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    )
  }

  if (showEdit) {
    return (
      <EditEntryForm
        entry={entry}
        context={editedFromStop ? 'stopping' : 'running'}
        lowerBound={lowerBound}
        upperBound={null}
        initialEndedAt={editedFromStop ? stopTime : undefined}
        onSave={(updated) => { setShowEdit(false); onEdited(updated) }}
        onStop={(updated) => onStopped(new Date(updated.endedAt!))}
        onCancel={handleEditCancel}
      />
    )
  }

  if (showStop) {
    const stopElapsed = formatDurationMs(stopTime.getTime() - new Date(entry.startedAt).getTime())
    return (
      <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex-1">Stop Task</h2>
          <button
            onClick={openEditFromStop}
            aria-label="Edit task"
            className="text-gray-500 hover:text-indigo-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
        <p className="text-white font-medium">
          <DescriptionWithTags text={entry.description} />
        </p>
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Started {new Date(entry.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          <span className="font-mono text-white">{stopElapsed}</span>
        </div>
        <TimePicker
          value={stopTime}
          onChange={(d) => { setStopTime(d); setError(null) }}
          min={minTime}
          label="Ended at"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setShowStop(false)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmStop}
            disabled={stopping || isInvalid}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {stopping ? 'Stopping…' : 'Stop Task'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Running</span>
        <span className="ml-auto text-2xl font-mono font-bold text-white">{elapsed}</span>
        <button
          onClick={openEditFromCard}
          aria-label="Edit task"
          className="text-gray-500 hover:text-indigo-400 transition-colors ml-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => { setShowDelete(true); setError(null) }}
          aria-label="Delete task"
          className="text-gray-500 hover:text-red-400 transition-colors ml-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>
      <p className="text-white font-medium text-lg leading-snug mb-2">
        <DescriptionWithTags text={entry.description} />
      </p>
      {parseTags(entry.tags).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {parseTags(entry.tags).map((tag) => <TagChip key={tag} tag={tag} />)}
        </div>
      )}
      <p className="text-gray-400 text-xs mb-4">
        Started {new Date(entry.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </p>
      <button
        onClick={() => { setStopTime(new Date()); setShowStop(true) }}
        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-semibold transition-colors"
      >
        Stop Task
      </button>
    </div>
  )
}

// ── Start Task form ─────────────────────────────────────────────────────────

interface StartTaskProps {
  defaultStartTime: Date
  minTime?: Date
  onStarted: () => void
}

function StartTask({ defaultStartTime, minTime, onStarted }: StartTaskProps) {
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isInvalid = minTime !== undefined && startTime < minTime
  const canSubmit = description.trim().length > 0 && !isInvalid

  const tagMatches = (description.match(/(#|:)[a-zA-Z][a-zA-Z0-9-]*/g) ?? [])
    .map(t => t.replace(/^[#:]/, ''))

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setStarting(true)
    setError(null)

    try {
      await api.entries.create(description.trim(), startTime.toISOString())
      onStarted()
    } catch (err: unknown) {
      const e = err as { error?: string }
      setError(e.error ?? 'Failed to start task.')
      setStarting(false)
    }
  }

  return (
    <form onSubmit={handleStart} className="bg-gray-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">New Task</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          What are you working on?
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Installing screens :home"
          autoFocus
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

      <TimePicker
        value={startTime}
        onChange={(d) => { setStartTime(d); setError(null) }}
        min={minTime}
        label="Started at"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={starting || !canSubmit}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
      >
        {starting ? 'Starting…' : 'Start Task'}
      </button>
    </form>
  )
}

// ── Home Page ───────────────────────────────────────────────────────────────

type UIMode = 'running' | 'start' | 'empty'

export default function HomePage() {
  const [running, setRunning] = useState<TimeEntry | null>(null)
  const [mode, setMode] = useState<UIMode>('empty')
  const [prevEndedAt, setPrevEndedAt] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { entry } = await api.entries.running()
      if (entry) {
        setRunning(entry)
        setMode('running')
      } else {
        setRunning(null)
        const { entries } = await api.entries.list()
        const last = entries.at(-1)
        setPrevEndedAt(last?.endedAt ? new Date(last.endedAt) : undefined)
        setMode('empty')
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function handleStopped(endedAt: Date) {
    setPrevEndedAt(endedAt)
    setRunning(null)
    setMode('start')
  }

  function handleStarted() {
    setPrevEndedAt(undefined)
    refresh()
  }

  function handleDeleted() {
    refresh()
  }

  function handleEdited(updated: TimeEntry) {
    setRunning(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Track</h1>

      {mode === 'running' && running && (
        <RunningTask
          entry={running}
          onStopped={handleStopped}
          onDeleted={handleDeleted}
          onEdited={handleEdited}
        />
      )}

      {mode === 'start' && (
        <StartTask
          defaultStartTime={prevEndedAt ?? new Date()}
          minTime={prevEndedAt}
          onStarted={handleStarted}
        />
      )}

      {mode === 'empty' && (
        <div className="bg-gray-800 rounded-2xl p-8 text-center space-y-4">
          <div className="text-4xl">⏱</div>
          <p className="text-gray-400 text-sm">No task running. Ready to start tracking?</p>
          <button
            onClick={() => setMode('start')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
          >
            Start Task
          </button>
        </div>
      )}
    </div>
  )
}
