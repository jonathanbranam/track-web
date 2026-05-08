import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '@repo/ui'
import { api, type WatchEvent } from '../api'

export function EventsPage() {
  const [events, setEvents] = useState<WatchEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.events.list()
      .then(setEvents)
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner className="h-64" />
  if (error) return <div className="px-4 py-6 text-red-400">{error}</div>

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Watch Events</h1>

      {events.length === 0 && (
        <p className="text-gray-400 text-sm">No events yet. Tap + to create one.</p>
      )}

      <ul className="space-y-3 pb-20">
        {events.map(event => (
          <li key={event.id}>
            <Link
              to={`/events/${event.id}`}
              className="block bg-gray-800 rounded-2xl p-4 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(event.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs bg-violet-900/60 text-violet-300 ring-1 ring-violet-700/50 px-2 py-0.5 rounded-full capitalize">
                    {event.type}
                  </span>
                  {event.completedAt && (
                    <span className="text-xs text-green-400">Completed</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* FAB */}
      <Link
        to="/events/new"
        className="fixed bottom-[calc(3.5rem+var(--sab)+1rem)] right-4 w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg transition-colors"
        aria-label="New event"
      >
        +
      </Link>
    </div>
  )
}
