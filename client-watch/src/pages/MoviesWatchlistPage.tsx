import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, LoadingSpinner, SegmentedControl } from '@repo/ui'
import { api, type UserMovie } from '../api'

type StateTab = 'unseen' | 'watched' | 'would_watch_again'

const STATE_OPTIONS: { value: StateTab; label: string }[] = [
  { value: 'unseen', label: 'Want' },
  { value: 'watched', label: 'Watched' },
  { value: 'would_watch_again', label: 'Again' },
]

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

  if (loading) return <LoadingSpinner className="h-64" />

  const filtered = entries.filter(e => e.state === tab)

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Movies</h1>
        <Link to="/movies/catalog" className="text-sm text-violet-400 hover:text-violet-300">
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
        <p className="text-sm text-gray-500">No movies in this list.</p>
      )}

      <ul className="space-y-3 pb-6">
        {filtered.map(entry => (
          <li key={entry.movieId} className="bg-gray-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{entry.movie.title}</p>
                {entry.movie.streaming && (
                  <p className="text-xs text-gray-500 mt-0.5">{entry.movie.streaming}</p>
                )}
                {entry.movie.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {entry.movie.tags.map(t => (
                      <Badge key={t.id} color="violet">{t.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0 items-end">
                <select
                  value={entry.state}
                  onChange={e => handleStateChange(entry.movieId, e.target.value as UserMovie['state'])}
                  className="text-xs bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="unseen">Want</option>
                  <option value="watched">Watched</option>
                  <option value="would_watch_again">Again</option>
                </select>
                <button
                  onClick={() => handleRemove(entry.movieId)}
                  className="text-xs text-red-400 hover:text-red-300"
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
