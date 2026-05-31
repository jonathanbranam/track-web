import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@repo/auth'
import { api } from '../api'
import type { PackingItem } from '../types'

type MemberSummary = { userId: number; checked: number; total: number }

function groupBySection(items: PackingItem[]): Array<{ section: string; items: PackingItem[] }> {
  const map = new Map<string, PackingItem[]>()
  for (const item of items) {
    const key = item.section
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()].map(([section, items]) => ({ section, items }))
}

export default function PackingPage() {
  const { userId } = useAuth()
  const [tripId, setTripId] = useState<number | null>(null)
  const [items, setItems] = useState<PackingItem[]>([])
  const [checkedState, setCheckedState] = useState<Record<number, boolean>>({})
  const [summary, setSummary] = useState<MemberSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [noTrip, setNoTrip] = useState(false)

  useEffect(() => {
    api.trips.current()
      .then(({ trip }) => {
        setTripId(trip.id)
        const summaryFetch = userId === 1 ? api.trips.packingSummary(trip.id) : Promise.resolve(null)
        return Promise.all([
          api.trips.packingItems(trip.id),
          api.trips.packingState(trip.id),
          summaryFetch,
        ]).then(([itemsRes, stateRes, summaryRes]) => {
          setItems(itemsRes.items)
          setCheckedState(stateRes.state)
          if (summaryRes) setSummary(summaryRes.members)
        })
      })
      .catch((err: { status?: number }) => {
        if (err.status === 404) setNoTrip(true)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = useCallback((itemId: number) => {
    if (!tripId) return
    const prev = !!checkedState[itemId]
    const next = !prev

    setCheckedState(s => ({ ...s, [itemId]: next }))

    api.trips.setPackingState(tripId, itemId, next).catch(() => {
      setCheckedState(s => ({ ...s, [itemId]: prev }))
    })
  }, [tripId, checkedState])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Loading…
      </div>
    )
  }

  if (noTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 px-6 text-center">
        <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg font-medium text-gray-300">No active trip</p>
        <p className="text-sm mt-1 text-gray-500">Set a current trip via the admin CLI to get started.</p>
      </div>
    )
  }

  const sections = groupBySection(items)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Packing</h1>

      {summary && summary.length > 0 && (
        <div className="mb-6 bg-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Completion</p>
          <ul className="space-y-1">
            {summary.map(m => (
              <li key={m.userId} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">User {m.userId}</span>
                <span className="text-indigo-400 font-medium">{m.checked}/{m.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-600 italic">No packing list yet.</p>
      ) : (
        sections.map(({ section, items: sectionItems }) => (
          <div key={section} className="mb-6">
            {section && (
              <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-3">{section}</h2>
            )}
            <ul className="space-y-2">
              {sectionItems.map((item) => {
                const checked = !!checkedState[item.id]
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 cursor-pointer active:opacity-70"
                    onClick={() => toggle(item.id)}
                  >
                    {checked ? (
                      <svg className="w-5 h-5 flex-shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span className={`text-sm ${checked ? 'text-gray-500 line-through' : 'text-white'}`}>
                      {item.text}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
