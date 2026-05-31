import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Trip } from '../types'
import MarkdownContent from '../components/MarkdownContent'

function formatTripDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export default function OverviewPage() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [noTrip, setNoTrip] = useState(false)

  useEffect(() => {
    api.trips.current()
      .then(({ trip }) => setTrip(trip))
      .catch((err: { status?: number }) => {
        if (err.status === 404) setNoTrip(true)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Loading…
      </div>
    )
  }

  if (noTrip || !trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 px-6 text-center">
        <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-lg font-medium text-gray-300">No active trip</p>
        <p className="text-sm mt-1 text-gray-500">Set a current trip via the admin CLI to get started.</p>
      </div>
    )
  }

  const hasLength = trip.nights !== null || trip.fullDays !== null
  const hasDates = trip.startDate !== null && trip.endDate !== null

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-white">{trip.name}</h1>
        {trip.destination && (
          <p className="text-indigo-400 mt-1">{trip.destination}</p>
        )}
      </div>

      {/* Date range */}
      {hasDates && (
        <p className="text-gray-300 text-sm">
          {formatTripDate(trip.startDate!)} – {formatTripDate(trip.endDate!)}
        </p>
      )}

      {/* Trip length */}
      {hasLength && (
        <div className="flex gap-4">
          {trip.nights !== null && (
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-center flex-1">
              <p className="text-2xl font-semibold text-white">{trip.nights}</p>
              <p className="text-xs text-gray-400 mt-0.5">{trip.nights === 1 ? 'night' : 'nights'}</p>
            </div>
          )}
          {trip.fullDays !== null && (
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-center flex-1">
              <p className="text-2xl font-semibold text-white">{trip.fullDays}</p>
              <p className="text-xs text-gray-400 mt-0.5">{trip.fullDays === 1 ? 'full day' : 'full days'}</p>
            </div>
          )}
        </div>
      )}

      {/* Departure */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Departure</h2>
        {trip.departureNotes ? (
          <MarkdownContent>{trip.departureNotes}</MarkdownContent>
        ) : (
          <p className="text-gray-600 italic">No departure info entered.</p>
        )}
      </section>

      {/* Return */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Return</h2>
        {trip.returnNotes ? (
          <MarkdownContent>{trip.returnNotes}</MarkdownContent>
        ) : (
          <p className="text-gray-600 italic">No return info entered.</p>
        )}
      </section>
    </div>
  )
}
