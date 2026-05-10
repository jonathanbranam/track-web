import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner, SegmentedControl } from '@repo/ui'
import { api, type UserTvSeries, type CastPreview } from '../api'
import { TvSeriesCard } from '../components/TvSeriesCard'

type StateTab = 'unseen' | 'watching' | 'watched' | 'would_watch_again'

const STATE_OPTIONS: { value: StateTab; label: string }[] = [
  { value: 'watching', label: 'Watching' },
  { value: 'unseen', label: 'Want' },
  { value: 'watched', label: 'Watched' },
  { value: 'would_watch_again', label: 'Again' },
]

export function TvWatchlistPage() {
  const [entries, setEntries] = useState<UserTvSeries[]>([])
  const [tab, setTab] = useState<StateTab>('watching')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [castCache, setCastCache] = useState<Record<number, CastPreview>>({})

  useEffect(() => {
    if (expandedId != null && !castCache[expandedId]) {
      api.tv.get(expandedId).then(detail => {
        setCastCache(prev => ({ ...prev, [expandedId]: { director: detail.director, cast: detail.cast } }))
      }).catch(() => {})
    }
  }, [expandedId])

  useEffect(() => {
    api.tv.watchlist.list()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  async function handleStateChange(seriesId: number, state: UserTvSeries['state']) {
    await api.tv.watchlist.upsert(seriesId, { state })
    const updated = await api.tv.watchlist.list()
    setEntries(updated)
  }

  async function handleRemove(seriesId: number) {
    await api.tv.watchlist.remove(seriesId)
    setEntries(prev => prev.filter(e => e.seriesId !== seriesId))
  }

  if (loading) return <LoadingSpinner className="h-64" />

  const filtered = entries.filter(e => e.state === tab)

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My TV Shows</h1>
        <Link to="/tv/catalog" className="text-sm text-violet-400 hover:text-violet-300">
          Browse →
        </Link>
      </div>

      <div className="mb-4">
        <SegmentedControl
          options={STATE_OPTIONS}
          value={tab}
          onChange={setTab}
          activeClass="bg-violet-600 text-white"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500">No shows in this list.</p>
      )}

      <ul className="space-y-3 pb-6">
        {filtered.map(entry => (
          <li key={entry.seriesId}>
            <TvSeriesCard
              series={entry.series}
              isExpanded={expandedId === entry.seriesId}
              onToggle={() => setExpandedId(prev => prev === entry.seriesId ? null : entry.seriesId)}
              castPreview={castCache[entry.seriesId]}
              actions={
                <>
                  <select
                    value={entry.state}
                    onChange={e => handleStateChange(entry.seriesId, e.target.value as UserTvSeries['state'])}
                    className="text-xs bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="watching">Watching</option>
                    <option value="unseen">Want</option>
                    <option value="watched">Watched</option>
                    <option value="would_watch_again">Again</option>
                  </select>
                  {(entry.currentSeason || entry.currentEpisode) && (
                    <p className="text-xs text-violet-400">
                      S{entry.currentSeason ?? '?'}E{entry.currentEpisode ?? '?'}
                    </p>
                  )}
                  <button
                    onClick={() => handleRemove(entry.seriesId)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
