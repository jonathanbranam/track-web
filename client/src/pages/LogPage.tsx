import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { TimeEntry } from '../types'
import { api } from '../api'
import TagChip, { parseTags } from '../components/TagChip'

function formatDuration(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const totalMinutes = Math.floor(ms / 60_000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

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

// ── Swipeable entry row ─────────────────────────────────────────────────────

interface EntryRowProps {
  entry: TimeEntry
  deletingId: number | null
  onSwipeDelete: (id: number) => void
  onCancelDelete: () => void
  onConfirmDelete: (id: number) => void
}

function EntryRow({ entry, deletingId, onSwipeDelete, onCancelDelete, onConfirmDelete }: EntryRowProps) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const isScrollRef = useRef<boolean | null>(null)

  function handlePointerDown(e: React.PointerEvent) {
    if (deletingId !== null && deletingId !== entry.id) {
      onCancelDelete()
    }
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    isScrollRef.current = null
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return
    const dx = e.clientX - startXRef.current
    const dy = e.clientY - startYRef.current

    // Determine scroll vs swipe on first significant movement
    if (isScrollRef.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isScrollRef.current = Math.abs(dy) > Math.abs(dx)
    }

    if (isScrollRef.current) return

    const clamped = Math.max(-120, Math.min(0, dx))
    setDragX(clamped)
  }

  function handlePointerUp() {
    setIsDragging(false)
    if (!isScrollRef.current && dragX <= -80) {
      onSwipeDelete(entry.id)
    }
    setDragX(0)
  }

  if (deletingId === entry.id) {
    return (
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-white text-sm font-medium mb-3">Delete this entry?</p>
        <div className="flex gap-3">
          <button
            onClick={onCancelDelete}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmDelete(entry.id)}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Red delete background */}
      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-4 rounded-xl">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </div>

      {/* Entry card (slides over the red background) */}
      <div
        className="bg-gray-800 rounded-xl p-4 relative"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-white text-sm font-medium leading-snug flex-1">
            <DescriptionWithTags text={entry.description} />
          </p>
          <span className="text-gray-400 text-xs font-mono whitespace-nowrap shrink-0">
            {entry.endedAt ? formatDuration(entry.startedAt, entry.endedAt) : '—'}
          </span>
        </div>

        {parseTags(entry.tags).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {parseTags(entry.tags).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}

        <p className="text-gray-500 text-xs mt-2">
          {formatTime(entry.startedAt)}
          {entry.endedAt && ` – ${formatTime(entry.endedAt)}`}
        </p>
      </div>
    </div>
  )
}

// ── Log Page ────────────────────────────────────────────────────────────────

export default function LogPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const location = useLocation()

  // Task 10.2: Refetch on tab focus (location change to /log)
  useEffect(() => {
    setLoading(true)
    setDeletingId(null)
    api.entries
      .list()
      .then(({ entries }) => setEntries(entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [location.pathname])

  async function handleConfirmDelete(id: number) {
    const prev = entries
    setEntries(entries.filter(e => e.id !== id))
    setDeletingId(null)
    try {
      await api.entries.delete(id)
    } catch {
      setEntries(prev)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-4">Today</h1>

      {/* Task 10.3: empty state */}
      {entries.length === 0 && (
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-400 text-sm">No entries yet today.</p>
        </div>
      )}

      {/* Task 10.1: entry list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            deletingId={deletingId}
            onSwipeDelete={(id) => setDeletingId(id)}
            onCancelDelete={() => setDeletingId(null)}
            onConfirmDelete={handleConfirmDelete}
          />
        ))}
      </div>
    </div>
  )
}
