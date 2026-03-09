import { useEffect, useState } from 'react'
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

export default function LogPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  // Task 10.2: Refetch on tab focus (location change to /log)
  useEffect(() => {
    setLoading(true)
    api.entries
      .list()
      .then(({ entries }) => setEntries(entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [location.pathname])

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
          <div key={entry.id} className="bg-gray-800 rounded-xl p-4">
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
        ))}
      </div>
    </div>
  )
}
