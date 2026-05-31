import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Trip, TripDay } from '../types'
import MarkdownContent from '../components/MarkdownContent'

const fmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function formatDate(dateStr: string): string {
  return fmt.format(new Date(dateStr + 'T00:00:00Z'))
}

function isActive(trip: Trip): boolean {
  if (!trip.startDate || !trip.endDate) return false
  const today = new Date().toISOString().slice(0, 10)
  return today >= trip.startDate && today <= trip.endDate
}

interface DayCardProps {
  day: TripDay
  cardRef?: (el: HTMLDivElement | null) => void
}

function DayCard({ day, cardRef }: DayCardProps) {
  const dateLabel = formatDate(day.date)
  const title = day.title || dateLabel

  return (
    <div ref={cardRef} className="bg-gray-800 rounded-lg p-4 mb-3">
      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">{dateLabel}</p>
      <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
      {day.weather && (
        <p className="text-sm text-gray-400 mb-2">{day.weather}</p>
      )}
      {day.body && (
        <MarkdownContent>{day.body}</MarkdownContent>
      )}
    </div>
  )
}

export default function DaysPage() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [days, setDays] = useState<TripDay[]>([])
  const [loading, setLoading] = useState(true)
  const [noTrip, setNoTrip] = useState(false)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    api.trips.current()
      .then(({ trip: t }) => {
        setTrip(t)
        return api.trips.days(t.id)
      })
      .then(({ days: d }) => setDays(d))
      .catch((err: { status?: number }) => {
        if (err.status === 404) setNoTrip(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!trip || days.length === 0 || !isActive(trip)) return
    const today = new Date().toISOString().slice(0, 10)
    cardRefs.current[today]?.scrollIntoView({ behavior: 'instant' })
  }, [days, trip])

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

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Days</h1>
      {days.length === 0 ? (
        <p className="text-gray-600 italic">Set trip dates to generate the day plan.</p>
      ) : (
        days.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            cardRef={(el) => { cardRefs.current[day.date] = el }}
          />
        ))
      )}
    </div>
  )
}
