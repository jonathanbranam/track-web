import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type UserMovie } from '../api'

type StateTab = 'unseen' | 'watched' | 'would_watch_again'

const STATE_LABELS: Record<StateTab, string> = {
  unseen: 'Want to Watch',
  watched: 'Watched',
  would_watch_again: 'Would Watch Again',
}

export function MoviesWatchlistPage() {
  const [entries, setEntries] = useState<UserMovie[]>([])
  const [tab, setTab] = useState<StateTab>('unseen')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.movies.watchlist.list()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  async function handleStateChange(movieId: number, state: UserMovie['state']) {
    await api.movies.watchlist.upsert(movieId, { state })
    const updated = await api.movies.watchlist.list()
    setEntries(updated)
  }

  async function handleRemove(movieId: number) {
    await api.movies.watchlist.remove(movieId)
    setEntries(prev => prev.filter(e => e.movieId !== movieId))
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  const filtered = entries.filter(e => e.state === tab)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Movies</h1>
        <Link to="/movies/catalog" className="text-sm text-blue-400 hover:text-blue-300">
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
        <p className="text-sm text-gray-500">No movies in this list.</p>
      )}

      <ul className="space-y-2">
        {filtered.map(entry => (
          <li key={entry.movieId} className="bg-gray-800 rounded p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{entry.movie.title}</p>
                {entry.movie.streaming && (
                  <p className="text-xs text-gray-500">{entry.movie.streaming}</p>
                )}
                {entry.movie.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {entry.movie.tags.map(t => (
                      <span key={t.id} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <select
                  value={entry.state}
                  onChange={e => handleStateChange(entry.movieId, e.target.value as UserMovie['state'])}
                  className="text-xs bg-gray-700 border border-gray-600 rounded px-1.5 py-1 text-white"
                >
                  <option value="unseen">Want to Watch</option>
                  <option value="watched">Watched</option>
                  <option value="would_watch_again">Would Watch Again</option>
                </select>
                <button
                  onClick={() => handleRemove(entry.movieId)}
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
