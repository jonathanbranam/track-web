import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>
  if (error) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Watch Events</h1>
        <Link
          to="/events/new"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded"
        >
          + New Event
        </Link>
      </div>

      {events.length === 0 && (
        <p className="text-gray-400 text-sm">No events yet. Create one to get started.</p>
      )}

      <ul className="space-y-2">
        {events.map(event => (
          <li key={event.id}>
            <Link
              to={`/events/${event.id}`}
              className="block bg-gray-800 rounded p-4 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(event.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded capitalize">{event.type}</span>
                  {event.completedAt && (
                    <span className="text-xs text-green-400">Completed</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
