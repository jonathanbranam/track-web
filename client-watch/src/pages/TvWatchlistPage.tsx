import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type UserTvSeries } from '../api'

type StateTab = 'unseen' | 'watching' | 'watched' | 'would_watch_again'

const STATE_LABELS: Record<StateTab, string> = {
  unseen: 'Want',
  watching: 'Watching',
  watched: 'Watched',
  would_watch_again: 'Would Watch Again',
}

export function TvWatchlistPage() {
  const [entries, setEntries] = useState<UserTvSeries[]>([])
  const [tab, setTab] = useState<StateTab>('unseen')
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  const filtered = entries.filter(e => e.state === tab)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My TV Shows</h1>
        <Link to="/tv/catalog" className="text-sm text-blue-400 hover:text-blue-300">
          Browse Catalog →
        </Link>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-800 rounded p-1">
        {(Object.keys(STATE_LABELS) as StateTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs rounded transition-colors ${
              tab === t ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {STATE_LABELS[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500">No shows in this list.</p>
      )}

      <ul className="space-y-2">
        {filtered.map(entry => (
          <li key={entry.seriesId} className="bg-gray-800 rounded p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{entry.series.title}</p>
                {entry.series.streaming && (
                  <p className="text-xs text-gray-500">{entry.series.streaming}</p>
                )}
                {(entry.currentSeason || entry.currentEpisode) && (
                  <p className="text-xs text-blue-400 mt-0.5">
                    S{entry.currentSeason ?? '?'}E{entry.currentEpisode ?? '?'}
                  </p>
                )}
                {entry.series.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {entry.series.tags.map(t => (
                      <span key={t.id} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <select
                  value={entry.state}
                  onChange={e => handleStateChange(entry.seriesId, e.target.value as UserTvSeries['state'])}
                  className="text-xs bg-gray-700 border border-gray-600 rounded px-1.5 py-1 text-white"
                >
                  <option value="unseen">Want</option>
                  <option value="watching">Watching</option>
                  <option value="watched">Watched</option>
                  <option value="would_watch_again">Would Watch Again</option>
                </select>
                <button
                  onClick={() => handleRemove(entry.seriesId)}
                  className="text-xs text-red-400 hover:text-red-300 text-right"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
