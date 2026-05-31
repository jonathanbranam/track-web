import { useEffect, useState } from 'react'
import { api } from '../api'
import type { PackingItem } from '../types'

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
  const [items, setItems] = useState<PackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [noTrip, setNoTrip] = useState(false)

  useEffect(() => {
    api.trips.current()
      .then(({ trip }) => api.trips.packingItems(trip.id))
      .then(({ items: fetched }) => setItems(fetched))
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
      {items.length === 0 ? (
        <p className="text-gray-600 italic">No packing list yet.</p>
      ) : (
        sections.map(({ section, items: sectionItems }) => (
          <div key={section} className="mb-6">
            {section && (
              <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-3">{section}</h2>
            )}
            <ul className="space-y-2">
              {sectionItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-white text-sm">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
