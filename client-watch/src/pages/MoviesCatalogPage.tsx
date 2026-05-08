import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Movie, type Tag } from '../api'

export function MoviesCatalogPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newStreaming, setNewStreaming] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const [m, t] = await Promise.all([api.movies.list({ q: q || undefined, tag: tagFilter || undefined }), api.tags.list()])
    setMovies(m)
    setTags(t)
    setLoading(false)
  }

  useEffect(() => { load() }, [q, tagFilter])

  async function handleAddMovie(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSubmitting(true)
    try {
      await api.movies.create({ title: newTitle.trim(), streaming: newStreaming || null })
      setNewTitle('')
      setNewStreaming('')
      setShowAdd(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddToWatchlist(movieId: number) {
    await api.movies.watchlist.upsert(movieId, { state: 'unseen' })
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/movies" className="text-gray-400 hover:text-white text-sm">← My List</Link>
          <h1 className="text-xl font-bold">Movie Catalog</h1>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded"
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddMovie} className="bg-gray-800 rounded p-3 mb-4 space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="text"
            value={newStreaming}
            onChange={e => setNewStreaming(e.target.value)}
            placeholder="Streaming platform (optional)"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 text-sm text-gray-400 py-1.5 rounded bg-gray-700 hover:text-white">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 text-sm bg-blue-600 text-white py-1.5 rounded hover:bg-blue-500 disabled:opacity-50">
              {submitting ? 'Adding…' : 'Add Movie'}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search titles…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All genres</option>
          {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {movies.length === 0 && <p className="text-sm text-gray-500">No movies found.</p>}

      <ul className="space-y-2">
        {movies.map(m => (
          <li key={m.id} className="bg-gray-800 rounded p-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{m.title}</p>
              {m.streaming && <p className="text-xs text-gray-500">{m.streaming}</p>}
              {m.runtimeMinutes && <p className="text-xs text-gray-500">{m.runtimeMinutes} min</p>}
              {m.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {m.tags.map(t => (
                    <span key={t.id} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{t.name}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleAddToWatchlist(m.id)}
              className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
            >
              + Watchlist
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
