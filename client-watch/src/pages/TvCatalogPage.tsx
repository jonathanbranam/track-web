import { useEffect, useState } from 'react'
import { Badge, Button, LoadingSpinner, TextInput } from '@repo/ui'
import { api, type TvSeries, type Tag, type CastPreview } from '../api'
import { BackLink } from '@repo/ui'
import { TmdbImportPanel } from '../components/TmdbImportPanel'
import { TvSeriesCard } from '../components/TvSeriesCard'

export function TvCatalogPage() {

  const [series, setSeries] = useState<TvSeries[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newStreaming, setNewStreaming] = useState('')
  const [newRuntime, setNewRuntime] = useState('')
  const [newSeasonCount, setNewSeasonCount] = useState('')
  const [newReleaseYear, setNewReleaseYear] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTagIds, setNewTagIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingSeriesId, setEditingSeriesId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStreaming, setEditStreaming] = useState('')
  const [editRuntime, setEditRuntime] = useState('')
  const [editSeasonCount, setEditSeasonCount] = useState('')
  const [editReleaseYear, setEditReleaseYear] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTagIds, setEditTagIds] = useState<number[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [castCache, setCastCache] = useState<Record<number, CastPreview>>({})

  useEffect(() => {
    if (expandedId != null && !castCache[expandedId]) {
      api.tv.get(expandedId).then(detail => {
        setCastCache(prev => ({ ...prev, [expandedId]: { director: detail.director, cast: detail.cast } }))
      }).catch(() => {})
    }
  }, [expandedId])

  async function load() {
    const [s, t] = await Promise.all([api.tv.list({ q: q || undefined, tag: tagFilter || undefined }), api.tags.list()])
    setSeries(s)
    setTags(t)
    setLoading(false)
  }

  useEffect(() => { load() }, [q, tagFilter])

  async function handleAddSeries(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSubmitting(true)
    try {
      await api.tv.create({
        title: newTitle.trim(),
        streaming: newStreaming || null,
        episodeRuntimeMinutes: parseInt(newRuntime) || null,
        seasonCount: parseInt(newSeasonCount) || null,
        releaseYear: parseInt(newReleaseYear) || null,
        description: newDescription || null,
        tagIds: newTagIds,
      })
      handleCancelAdd()
      load()
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancelAdd() {
    setNewTitle('')
    setNewStreaming('')
    setNewRuntime('')
    setNewSeasonCount('')
    setNewReleaseYear('')
    setNewDescription('')
    setNewTagIds([])
    setShowAdd(false)
  }

  function toggleNewTag(id: number) {
    setNewTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function startEdit(s: TvSeries) {
    setEditingSeriesId(s.id)
    setEditTitle(s.title)
    setEditStreaming(s.streaming ?? '')
    setEditRuntime(s.episodeRuntimeMinutes != null ? String(s.episodeRuntimeMinutes) : '')
    setEditSeasonCount(s.seasonCount != null ? String(s.seasonCount) : '')
    setEditReleaseYear(s.releaseYear != null ? String(s.releaseYear) : '')
    setEditDescription(s.description ?? '')
    setEditTagIds(s.tags.map(t => t.id))
  }

  function toggleEditTag(id: number) {
    setEditTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleEditSeries(e: React.FormEvent) {
    e.preventDefault()
    if (editingSeriesId == null) return
    setSubmitting(true)
    try {
      await api.tv.update(editingSeriesId, {
        title: editTitle.trim(),
        streaming: editStreaming || null,
        episodeRuntimeMinutes: parseInt(editRuntime) || null,
        seasonCount: parseInt(editSeasonCount) || null,
        releaseYear: parseInt(editReleaseYear) || null,
        description: editDescription || null,
        tagIds: editTagIds,
      })
      setEditingSeriesId(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddToWatchlist(seriesId: number) {
    await api.tv.watchlist.upsert(seriesId, { state: 'unseen' })
  }

  if (loading) return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <BackLink to="/tv" label="TV Catalog" />
      </div>
      <LoadingSpinner className="h-64" />
    </>
  )

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <BackLink to="/tv" label="TV Catalog" />
        <div className="flex gap-2">
          <Button color="violet" className="py-1.5 text-xs" onClick={() => setShowSearch(!showSearch)}>
            + Search
          </Button>
          <Button color="violet" className="py-1.5 text-xs" onClick={() => setShowAdd(!showAdd)}>
            + Add
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {showSearch && (
          <TmdbImportPanel type="tv" onImported={() => { setShowSearch(false); load() }} />
        )}

        {showAdd && (
          <form onSubmit={handleAddSeries} className="bg-gray-800 rounded-2xl p-4 space-y-3">
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
              placeholder="Episode runtime (min, optional)"
              color="violet"
            />
            <TextInput
              inputMode="numeric"
              value={newSeasonCount}
              onChange={e => setNewSeasonCount(e.target.value)}
              placeholder="Number of seasons (optional)"
              color="violet"
            />
            <TextInput
              inputMode="numeric"
              value={newReleaseYear}
              onChange={e => setNewReleaseYear(e.target.value)}
              placeholder="Release year (optional)"
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
              <Button type="submit" color="violet" className="flex-1 py-2" loading={submitting}>Add Series</Button>
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
            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-2.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All genres</option>
            {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        {series.length === 0 && <p className="text-sm text-gray-500">No TV series found.</p>}

        <ul className="space-y-3 pb-6">
          {series.map(s => (
            <li key={s.id}>
              {editingSeriesId === s.id ? (
                <form onSubmit={handleEditSeries} className="bg-gray-800 rounded-2xl p-4 space-y-3">
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
                    placeholder="Episode runtime (min, optional)"
                    color="violet"
                  />
                  <TextInput
                    inputMode="numeric"
                    value={editSeasonCount}
                    onChange={e => setEditSeasonCount(e.target.value)}
                    placeholder="Number of seasons (optional)"
                    color="violet"
                  />
                  <TextInput
                    inputMode="numeric"
                    value={editReleaseYear}
                    onChange={e => setEditReleaseYear(e.target.value)}
                    placeholder="Release year (optional)"
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
                    <Button type="button" variant="secondary" className="flex-1 py-2" onClick={() => setEditingSeriesId(null)}>Cancel</Button>
                    <Button type="submit" color="violet" className="flex-1 py-2" loading={submitting}>Save</Button>
                  </div>
                </form>
              ) : (
                <TvSeriesCard
                  series={s}
                  isExpanded={expandedId === s.id}
                  onToggle={() => setExpandedId(prev => prev === s.id ? null : s.id)}
                  castPreview={castCache[s.id]}
                  actions={
                    <>
                      <button
                        onClick={() => startEdit(s)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleAddToWatchlist(s.id)}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        + Watchlist
                      </button>
                    </>
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
