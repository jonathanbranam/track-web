import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '@repo/ui'
import { api, type WatchEvent } from '../api'

function EventList({ events }: { events: WatchEvent[] }) {
  if (events.length === 0) return null
  return (
    <ul className="space-y-3">
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
                {event.completedAt && (
                  <span className="text-xs text-green-400">Completed</span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function EventsPage() {
  const [active, setActive] = useState<WatchEvent[]>([])
  const [recent, setRecent] = useState<WatchEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.events.list({ filter: 'active' }),
      api.events.list({ filter: 'completed-recent' }),
    ])
      .then(([a, r]) => { setActive(a); setRecent(r) })
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner className="h-64" />
  if (error) return <div className="px-4 py-6 text-red-400">{error}</div>

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Watch Events</h1>

      {active.length === 0 && recent.length === 0 && (
        <p className="text-gray-400 text-sm">No events yet. Tap + to create one.</p>
      )}

      <div className="space-y-6 pb-20">
        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Active</h2>
            <EventList events={active} />
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Recently Completed</h2>
            <EventList events={recent} />
          </section>
        )}
      </div>

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
