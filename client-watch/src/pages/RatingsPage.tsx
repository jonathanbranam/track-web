import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '@repo/ui'
import { api, type RatingItem, type WatchEvent, type WatchEventCandidate, type Movie, type TvSeries, type ExternalResult } from '../api'
import { MediaCard } from '../components/MediaCard'
import { CATALOG_RESULT_CAP, excludeDuplicates, excludeRated, filterByTitle, isSignificant } from '../utils/search'

type SubTab = 'ratings' | 'lists'

type CatalogResult = { id: number; mediaType: 'movie' | 'tv'; title: string; year: number | null; streaming: string | null }
type TmdbResult = ExternalResult & { mediaType: 'movie' | 'tv' }

export function RatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('ratings')

  // Filter state
  const [showMovies, setShowMovies] = useState(true)
  const [showTv, setShowTv] = useState(true)
  const [showSeen, setShowSeen] = useState(false)

  // Search state
  const [query, setQuery] = useState('')
  const [catalogResults, setCatalogResults] = useState<CatalogResult[]>([])
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const catalogDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tmdbDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add-to state
  const [targetType, setTargetType] = useState<'event' | 'list'>('event')
  const [events, setEvents] = useState<WatchEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [eventCandidates, setEventCandidates] = useState<WatchEventCandidate[]>([])

  // Rating expansion
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // Details expansion (only one card open at a time)
  const [detailsKey, setDetailsKey] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.ratings.list(),
      api.events.list({ filter: 'active' }),
    ]).then(([ratingItems, activeEvents]) => {
      setItems(ratingItems)
      setEvents(activeEvents)
      if (activeEvents.length > 0) setSelectedEventId(activeEvents[0].id)
    }).finally(() => setLoading(false))
  }, [])

  // Load candidates for the selected event
  useEffect(() => {
    if (!selectedEventId) { setEventCandidates([]); return }
    api.events.get(selectedEventId).then(d => setEventCandidates(d.candidates)).catch(() => {})
  }, [selectedEventId])

  const searchActive = query.trim().length > 0

  // Catalog tier — debounced 300 ms, parallel movie + tv search
  useEffect(() => {
    if (catalogDebounceRef.current) clearTimeout(catalogDebounceRef.current)
    if (!searchActive) { setCatalogResults([]); setCatalogTotal(0); setCatalogLoading(false); return }
    setCatalogLoading(true)
    catalogDebounceRef.current = setTimeout(async () => {
      const [movies, tvSeries] = await Promise.all([
        api.movies.list({ q: query }).catch(() => [] as Movie[]),
        api.tv.list({ q: query }).catch(() => [] as TvSeries[]),
      ])
      const merged: CatalogResult[] = [
        ...movies.map(m => ({ id: m.id, mediaType: 'movie' as const, title: m.title, year: m.releaseYear, streaming: m.streaming })),
        ...tvSeries.map(s => ({ id: s.id, mediaType: 'tv' as const, title: s.title, year: s.releaseYear, streaming: s.streaming })),
      ]
      const deduped = excludeRated(merged, items)
      setCatalogTotal(deduped.length)
      setCatalogResults(deduped.slice(0, CATALOG_RESULT_CAP))
      setCatalogLoading(false)
    }, 300)
    return () => { if (catalogDebounceRef.current) clearTimeout(catalogDebounceRef.current) }
  }, [query, items])

  // TMDB tier — debounced 500 ms, significance-gated, parallel movie + tv search
  useEffect(() => {
    if (tmdbDebounceRef.current) clearTimeout(tmdbDebounceRef.current)
    if (!searchActive || !isSignificant(query)) { setTmdbResults([]); setTmdbLoading(false); return }
    setTmdbLoading(true)
    tmdbDebounceRef.current = setTimeout(async () => {
      try {
        const [movies, tvItems] = await Promise.all([
          api.external.search('movie', query).catch(() => [] as ExternalResult[]),
          api.external.search('tv', query).catch(() => [] as ExternalResult[]),
        ])
        setTmdbResults([
          ...excludeDuplicates(movies).map(r => ({ ...r, mediaType: 'movie' as const })),
          ...excludeDuplicates(tvItems).map(r => ({ ...r, mediaType: 'tv' as const })),
        ])
      } catch {
        setTmdbResults([])
      } finally {
        setTmdbLoading(false)
      }
    }, 500)
    return () => { if (tmdbDebounceRef.current) clearTimeout(tmdbDebounceRef.current) }
  }, [query])

  function clearSearch() {
    setQuery('')
    setSearchError(null)
  }

  function ratingFromResult(r: CatalogResult): RatingItem {
    return { id: r.id, mediaType: r.mediaType, title: r.title, year: r.year, streaming: r.streaming, rating: null, seen: false, again: false, watching: false }
  }

  async function addToWatchlist(mediaType: 'movie' | 'tv', id: number) {
    if (mediaType === 'movie') await api.movies.watchlist.upsert(id, { state: 'unseen', rating: null })
    else await api.tv.watchlist.upsert(id, { state: 'unseen', rating: null })
  }

  async function handleAddCatalog(r: CatalogResult) {
    const key = `${r.mediaType}-${r.id}`
    setBusyKey(key)
    setSearchError(null)
    const newItem = ratingFromResult(r)
    setItems(prev => [...prev, newItem])
    try {
      await addToWatchlist(r.mediaType, r.id)
      clearSearch()
    } catch {
      setItems(prev => prev.filter(i => !(i.id === r.id && i.mediaType === r.mediaType)))
      setSearchError(`Could not add ${r.title} — try again`)
    } finally {
      setBusyKey(null)
    }
  }

  async function handleAddTmdb(r: TmdbResult) {
    const key = `tmdb-${r.mediaType}-${r.tmdbId}`
    setBusyKey(key)
    setSearchError(null)
    try {
      const imported = await api.external.import(r.mediaType, r)
      await addToWatchlist(r.mediaType, imported.id)
      setItems(prev => [...prev, {
        id: imported.id, mediaType: r.mediaType, title: imported.title, year: imported.releaseYear,
        streaming: imported.streaming, rating: null, seen: false, again: false, watching: false,
      }])
      clearSearch()
    } catch {
      setSearchError(`Could not add ${r.title} — try again`)
    } finally {
      setBusyKey(null)
    }
  }

  function isHiddenBySeen(item: RatingItem): boolean {
    return item.seen && !item.again && !item.watching
  }

  const hiddenSeenCount = items.filter(isHiddenBySeen).length

  const filtered = items.filter(item => {
    if (!showMovies && item.mediaType === 'movie') return false
    if (!showTv && item.mediaType === 'tv') return false
    if (!showSeen && isHiddenBySeen(item)) return false
    return true
  })

  const ratingsMatches = filterByTitle(items, query)

  function isMemberOfEvent(item: RatingItem): boolean {
    if (!selectedEventId) return false
    return eventCandidates.some(c =>
      (item.mediaType === 'movie' && c.movieId === item.id) ||
      (item.mediaType === 'tv' && c.seriesId === item.id)
    )
  }

  async function handleToggleEventMembership(item: RatingItem) {
    if (!selectedEventId) return
    const isMember = isMemberOfEvent(item)
    if (isMember) {
      const candidate = eventCandidates.find(c =>
        (item.mediaType === 'movie' && c.movieId === item.id) ||
        (item.mediaType === 'tv' && c.seriesId === item.id)
      )
      if (candidate) {
        await api.events.removeCandidate(selectedEventId, candidate.id).catch(() => {})
      }
    } else {
      await api.events.addCandidate(selectedEventId, {
        movieId: item.mediaType === 'movie' ? item.id : undefined,
        seriesId: item.mediaType === 'tv' ? item.id : undefined,
      }).catch(() => {})
    }
    const d = await api.events.get(selectedEventId)
    setEventCandidates(d.candidates)
  }

  async function handleRatingChange(item: RatingItem, rating: number) {
    setItems(prev => prev.map(i => i.id === item.id && i.mediaType === item.mediaType ? { ...i, rating } : i))
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const pillBase = 'px-3 py-1 rounded-full text-xs font-medium transition-colors border'
  const pillActive = 'bg-violet-600 border-violet-600 text-white'
  const pillInactive = 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400'

  const resultBadge = (mediaType: 'movie' | 'tv') =>
    `text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${mediaType === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-blue-900 text-blue-300'}`

  if (loading) return <LoadingSpinner className="h-64" />

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Ratings</h1>
        <Link to="/movies/catalog" className="text-sm text-violet-400 hover:text-violet-300">Browse →</Link>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-700 pb-0">
        {(['ratings', 'lists'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              subTab === tab
                ? 'text-violet-400 border-violet-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab === 'ratings' ? 'Ratings' : 'My Lists'}
          </button>
        ))}
      </div>

      {subTab === 'lists' && (
        <p className="text-sm text-gray-500 py-8 text-center">My Lists — coming soon</p>
      )}

      {subTab === 'ratings' && (
        <>
          {/* Search input */}
          <div className="relative mb-4">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your ratings, the catalog, and TMDB…"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 pr-10 py-2.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchActive && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {!searchActive && (
            <>
              {/* Add-to row */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="text-gray-400 shrink-0">Add to</span>
                <select
                  value={targetType}
                  onChange={e => setTargetType(e.target.value as 'event' | 'list')}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="event">Event</option>
                  <option value="list">List</option>
                </select>
                {targetType === 'event' && (
                  events.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">No upcoming events</span>
                  ) : (
                    <select
                      value={selectedEventId ?? ''}
                      onChange={e => setSelectedEventId(parseInt(e.target.value, 10))}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 flex-1 min-w-0 truncate"
                    >
                      {events.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.title} ({eventCandidates.length > 0 && selectedEventId === e.id ? eventCandidates.length : 0} shows)
                        </option>
                      ))}
                    </select>
                  )
                )}
                {targetType === 'list' && (
                  <span className="text-xs text-gray-500 italic">Lists coming soon</span>
                )}
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setShowMovies(v => !v)} className={`${pillBase} ${showMovies ? pillActive : pillInactive}`}>
                  Movies
                </button>
                <button onClick={() => setShowTv(v => !v)} className={`${pillBase} ${showTv ? pillActive : pillInactive}`}>
                  TV
                </button>
                <div className="flex-1" />
                <button onClick={() => setShowSeen(v => !v)} className={`${pillBase} ${showSeen ? pillActive : pillInactive}`}>
                  Seen{!showSeen && hiddenSeenCount > 0 ? ` (${hiddenSeenCount})` : ''}
                </button>
              </div>

              {filtered.length === 0 && (
                <p className="text-sm text-gray-500">No items match the current filters.</p>
              )}

              <ul className="space-y-3 pb-6">
                {filtered.map(item => {
                  const key = `${item.mediaType}-${item.id}`
                  const showToggle = targetType === 'event' && selectedEventId !== null && events.length > 0 && selectedEvent
                  return (
                    <li key={key}>
                      <MediaCard
                        item={item}
                        expandedId={expandedId}
                        onExpandRating={id => setExpandedId(id)}
                        onRatingChange={handleRatingChange}
                        detailsKey={detailsKey}
                        onExpandDetails={setDetailsKey}
                        toggleTarget={showToggle ? {
                          name: selectedEvent.title,
                          isMember: isMemberOfEvent(item),
                          onToggle: () => handleToggleEventMembership(item),
                        } : undefined}
                      />
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {searchActive && (
            <div className="pb-6">
              {searchError && (
                <p className="mb-3 text-xs text-red-400">{searchError}</p>
              )}

              {/* In Your Ratings */}
              <h2 className="text-sm font-semibold text-gray-300 mb-2">In Your Ratings</h2>
              {ratingsMatches.length === 0 ? (
                <p className="text-sm text-gray-500 mb-2">No matching ratings.</p>
              ) : (
                <ul className="space-y-3 mb-2">
                  {ratingsMatches.map(item => (
                    <li key={`r-${item.mediaType}-${item.id}`}>
                      <MediaCard
                        item={item}
                        expandedId={expandedId}
                        onExpandRating={id => setExpandedId(id)}
                        onRatingChange={handleRatingChange}
                        detailsKey={detailsKey}
                        onExpandDetails={setDetailsKey}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <hr className="border-gray-700 my-4" />

              {/* In Catalog */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-gray-300">In Catalog</h2>
                {catalogLoading && <LoadingSpinner className="h-3 w-3" />}
              </div>
              {!catalogLoading && catalogResults.length === 0 ? (
                <p className="text-sm text-gray-500 mb-2">No catalog matches.</p>
              ) : (
                <ul className="space-y-1 mb-2">
                  {catalogResults.map(r => {
                    const key = `${r.mediaType}-${r.id}`
                    return (
                      <li key={`cat-${key}`} className="flex items-center gap-2 py-1">
                        <span className={resultBadge(r.mediaType)}>{r.mediaType === 'movie' ? 'Movie' : 'TV'}</span>
                        <span className="flex-1 text-sm truncate">{r.title}{r.year ? ` (${r.year})` : ''}</span>
                        <button
                          type="button"
                          onClick={() => handleAddCatalog(r)}
                          disabled={busyKey !== null}
                          className="text-xs px-2 py-1 rounded-lg bg-violet-700 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {busyKey === key ? '…' : 'Add'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {catalogTotal > catalogResults.length && (
                <p className="text-xs text-gray-500 mb-2">Showing top {catalogResults.length} of {catalogTotal}</p>
              )}

              <hr className="border-gray-700 my-4" />

              {/* On TMDB */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-gray-300">On TMDB</h2>
                {tmdbLoading && <LoadingSpinner className="h-3 w-3" />}
              </div>
              {!tmdbLoading && tmdbResults.length === 0 ? (
                <p className="text-sm text-gray-500">{isSignificant(query) ? 'No TMDB matches.' : 'Keep typing to search TMDB…'}</p>
              ) : (
                <ul className="space-y-1">
                  {tmdbResults.map(r => {
                    const key = `tmdb-${r.mediaType}-${r.tmdbId}`
                    return (
                      <li key={key} className="flex items-center gap-2 py-1">
                        <span className={resultBadge(r.mediaType)}>{r.mediaType === 'movie' ? 'Movie' : 'TV'}</span>
                        <span className="flex-1 text-sm truncate">{r.title}{r.releaseYear ? ` (${r.releaseYear})` : ''}</span>
                        <button
                          type="button"
                          onClick={() => handleAddTmdb(r)}
                          disabled={busyKey !== null}
                          className="text-xs px-2 py-1 rounded-lg bg-violet-700 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {busyKey === key ? '…' : 'Add'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
