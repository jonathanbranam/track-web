import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, LoadingSpinner, TextInput } from '@repo/ui'
import { api, type Movie, type Tag } from '../api'

export function MoviesCatalogPage() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<Movie[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newStreaming, setNewStreaming] = useState('')
  const [newRuntime, setNewRuntime] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTagIds, setNewTagIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingMovieId, setEditingMovieId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStreaming, setEditStreaming] = useState('')
  const [editRuntime, setEditRuntime] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTagIds, setEditTagIds] = useState<number[]>([])

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
      await api.movies.create({
        title: newTitle.trim(),
        streaming: newStreaming || null,
        runtimeMinutes: parseInt(newRuntime) || null,
        description: newDescription || null,
        tagIds: newTagIds,
      })
      setNewTitle('')
      setNewStreaming('')
      setNewRuntime('')
      setNewDescription('')
      setNewTagIds([])
      setShowAdd(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancelAdd() {
    setNewTitle('')
    setNewStreaming('')
    setNewRuntime('')
    setNewDescription('')
    setNewTagIds([])
    setShowAdd(false)
  }

  function startEdit(m: Movie) {
    setEditingMovieId(m.id)
    setEditTitle(m.title)
    setEditStreaming(m.streaming ?? '')
    setEditRuntime(m.runtimeMinutes != null ? String(m.runtimeMinutes) : '')
    setEditDescription(m.description ?? '')
    setEditTagIds(m.tags.map(t => t.id))
  }

  async function handleEditMovie(e: React.FormEvent) {
    e.preventDefault()
    if (editingMovieId == null) return
    setSubmitting(true)
    try {
      await api.movies.update(editingMovieId, {
        title: editTitle.trim(),
        streaming: editStreaming || null,
        runtimeMinutes: parseInt(editRuntime) || null,
        description: editDescription || null,
        tagIds: editTagIds,
      })
      setEditingMovieId(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddToWatchlist(movieId: number) {
    await api.movies.watchlist.upsert(movieId, { state: 'unseen' })
  }

  function toggleNewTag(id: number) {
    setNewTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleEditTag(id: number) {
    setEditTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  if (loading) return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button onClick={() => navigate('/movies')} className="text-gray-400 hover:text-white transition-colors p-1 -ml-1" aria-label="Back">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold">Movie Catalog</h1>
      </div>
      <LoadingSpinner className="h-64" />
    </>
  )

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/movies')} className="text-gray-400 hover:text-white transition-colors p-1 -ml-1" aria-label="Back">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold">Movie Catalog</h1>
        </div>
        <Button color="violet" className="py-1.5 text-xs" onClick={() => setShowAdd(!showAdd)}>
          + Add
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {showAdd && (
          <form onSubmit={handleAddMovie} className="bg-gray-800 rounded-2xl p-4 space-y-3">
            <TextInput
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Title"
              required
              color="violet"
            />
            <TextInput
              type="text"
              value={newStreaming}
              onChange={e => setNewStreaming(e.target.value)}
              placeholder="Streaming platform (optional)"
              color="violet"
            />
            <TextInput
              inputMode="numeric"
              value={newRuntime}
              onChange={e => setNewRuntime(e.target.value)}
              placeholder="Runtime (min, optional)"
              color="violet"
            />
            <TextInput
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              color="violet"
            />
            {tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {tags.map(t => (
                  <button key={t.id} type="button" onClick={() => toggleNewTag(t.id)}>
                    <Badge color={newTagIds.includes(t.id) ? 'violet' : 'gray'}>{t.name}</Badge>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1 py-2" onClick={handleCancelAdd}>Cancel</Button>
              <Button type="submit" color="violet" className="flex-1 py-2" loading={submitting}>Add Movie</Button>
            </div>
          </form>
        )}

        <div className="flex gap-2">
          <TextInput
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search titles…"
            color="violet"
            className="flex-1"
          />
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All genres</option>
            {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        {movies.length === 0 && <p className="text-sm text-gray-500">No movies found.</p>}

        <ul className="space-y-3 pb-6">
          {movies.map(m => (
            <li key={m.id}>
              {editingMovieId === m.id ? (
                <form onSubmit={handleEditMovie} className="bg-gray-800 rounded-2xl p-4 space-y-3">
                  <TextInput
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Title"
                    required
                    color="violet"
                  />
                  <TextInput
                    type="text"
                    value={editStreaming}
                    onChange={e => setEditStreaming(e.target.value)}
                    placeholder="Streaming platform (optional)"
                    color="violet"
                  />
                  <TextInput
                    inputMode="numeric"
                    value={editRuntime}
                    onChange={e => setEditRuntime(e.target.value)}
                    placeholder="Runtime (min, optional)"
                    color="violet"
                  />
                  <TextInput
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    color="violet"
                  />
                  {tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {tags.map(t => (
                        <button key={t.id} type="button" onClick={() => toggleEditTag(t.id)}>
                          <Badge color={editTagIds.includes(t.id) ? 'violet' : 'gray'}>{t.name}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1 py-2" onClick={() => setEditingMovieId(null)}>Cancel</Button>
                    <Button type="submit" color="violet" className="flex-1 py-2" loading={submitting}>Save</Button>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-800 rounded-2xl p-4 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.title}</p>
                    {m.streaming && <p className="text-xs text-gray-500 mt-0.5">{m.streaming}</p>}
                    {m.runtimeMinutes && <p className="text-xs text-gray-500">{m.runtimeMinutes} min</p>}
                    {m.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {m.tags.map(t => (
                          <Badge key={t.id} color="violet">{t.name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(m)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleAddToWatchlist(m.id)}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      + Watchlist
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
