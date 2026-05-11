import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaType = 'movie' | 'tv'
type Rating = -2 | -1 | 0 | 1 | 2 | null
type FilterTab = 'movies' | 'tv'

interface RatedItem {
  id: number
  type: MediaType
  title: string
  year: number
  rating: Rating
  seen: boolean
  again: boolean
}

interface CatalogItem {
  id: number
  type: MediaType
  title: string
  year: number
}

interface TmdbItem {
  tmdbId: number
  type: MediaType
  title: string
  year: number
}

// ── Hard-coded mock data ───────────────────────────────────────────────────────

const INITIAL_RATED: RatedItem[] = [
  { id: 1,  type: 'movie', title: 'Interstellar',   year: 2014, rating:  2 as Rating, seen: true,  again: true  },
  { id: 2,  type: 'movie', title: 'The Shining',    year: 1980, rating:  2 as Rating, seen: false, again: false },
  { id: 3,  type: 'tv',    title: 'Severance',      year: 2022, rating:  2 as Rating, seen: false, again: false },
  { id: 4,  type: 'tv',    title: 'The Last of Us', year: 2023, rating:  1 as Rating, seen: false, again: false },
  { id: 5,  type: 'tv',    title: 'The Bear',       year: 2022, rating:  1 as Rating, seen: true,  again: true  },
  { id: 6,  type: 'movie', title: 'Parasite',       year: 2019, rating:  1 as Rating, seen: true,  again: false },
  { id: 7,  type: 'movie', title: 'Dune: Part Two', year: 2024, rating:  0 as Rating, seen: false, again: false },
  { id: 8,  type: 'movie', title: 'Alien: Romulus', year: 2024, rating: null,         seen: false, again: false },
]

const CATALOG_ITEMS: CatalogItem[] = [
  { id: 20, type: 'movie', title: 'Dune',                              year: 2021 },
  { id: 21, type: 'tv',    title: 'House of the Dragon',               year: 2022 },
  { id: 22, type: 'movie', title: 'Everything Everywhere All at Once', year: 2022 },
  { id: 23, type: 'movie', title: 'The Northman',                      year: 2022 },
  { id: 24, type: 'tv',    title: 'The White Lotus',                   year: 2021 },
  { id: 25, type: 'movie', title: 'Past Lives',                        year: 2023 },
]

const TMDB_ITEMS: TmdbItem[] = [
  { tmdbId: 101, type: 'movie', title: 'Dune: Prophecy',   year: 2024 },
  { tmdbId: 102, type: 'movie', title: 'Dune (1984)',       year: 1984 },
  { tmdbId: 103, type: 'tv',    title: 'Children of Dune', year: 2003 },
  { tmdbId: 104, type: 'movie', title: 'Conclave',         year: 2024 },
  { tmdbId: 105, type: 'tv',    title: 'Shogun',           year: 2024 },
  { tmdbId: 106, type: 'movie', title: 'Nickel Boys',      year: 2024 },
  { tmdbId: 107, type: 'tv',    title: 'Disclaimer',       year: 2024 },
]

// ── Display helpers ────────────────────────────────────────────────────────────

const RLABEL: Record<number, string> = { '-2': '--', '-1': '-', 0: '0', 1: '+', 2: '++' }

const RBADGE: Record<number, string> = {
  '-2': 'bg-red-900/50 text-red-300 border-red-800',
  '-1': 'bg-orange-900/50 text-orange-300 border-orange-800',
  0:    'bg-gray-700 text-gray-400 border-gray-600',
  1:    'bg-lime-900/50 text-lime-300 border-lime-800',
  2:    'bg-green-900/50 text-green-300 border-green-800',
}

const VSEL: Record<number, string> = {
  '-2': 'bg-red-600 text-white',
  '-1': 'bg-orange-500 text-white',
  0:    'bg-gray-500 text-white',
  1:    'bg-lime-600 text-white',
  2:    'bg-green-700 text-white',
}

const VUNSEL = 'bg-gray-700 text-gray-300 hover:bg-gray-600'

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddSearchDPrototype() {
  const navigate = useNavigate()

  // Ratings list state
  const [ratedItems, setRatedItems] = useState<RatedItem[]>(INITIAL_RATED)
  const [showMovies, setShowMovies] = useState(true)
  const [showTv, setShowTv]         = useState(true)
  const [showSeen, setShowSeen]     = useState(false)
  const [editId, setEditId]         = useState<number | null>(null)

  // Bottom sheet state
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [query, setQuery]             = useState('')
  const [tmdbMode, setTmdbMode]       = useState(false)
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [justAdded, setJustAdded]     = useState<Set<string>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function applyRating(id: number, r: Rating) {
    setRatedItems(prev => prev.map(x => x.id === id ? { ...x, rating: r } : x))
    setEditId(null)
  }

  function openSheet() {
    setSheetOpen(true)
    setQuery('')
    setTmdbMode(false)
    setTmdbLoading(false)
  }

  function closeSheet() {
    setSheetOpen(false)
    setQuery('')
    setTmdbMode(false)
    setTmdbLoading(false)
  }

  function searchTmdb() {
    setTmdbLoading(true)
    setTmdbMode(true)
    setTimeout(() => setTmdbLoading(false), 600)
  }

  function backFromTmdb() {
    setTmdbMode(false)
    setTmdbLoading(false)
  }

  function markAdded(key: string) {
    setJustAdded(prev => new Set([...prev, key]))
    setTimeout(() => setJustAdded(prev => { const s = new Set(prev); s.delete(key); return s }), 2000)
  }

  function addCatalogItem(item: CatalogItem) {
    const key = `catalog-${item.id}`
    if (justAdded.has(key)) return
    const newItem: RatedItem = {
      id: item.id,
      type: item.type,
      title: item.title,
      year: item.year,
      rating: null,
      seen: false,
      again: false,
    }
    setRatedItems(prev => [...prev, newItem])
    markAdded(key)
  }

  function addTmdbItem(item: TmdbItem) {
    const key = `tmdb-${item.tmdbId}`
    if (justAdded.has(key)) return
    const newItem: RatedItem = {
      id: item.tmdbId + 1000,
      type: item.type,
      title: item.title,
      year: item.year,
      rating: null,
      seen: false,
      again: false,
    }
    setRatedItems(prev => [...prev, newItem])
    markAdded(key)
  }

  // Focus input when sheet opens
  useEffect(() => {
    if (sheetOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [sheetOpen])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const ratedIds = new Set(ratedItems.map(x => x.id))

  const hiddenCount = ratedItems.filter(x => x.seen && !x.again).length

  const filteredRated = [...ratedItems]
    .filter(x => {
      if (!showMovies && x.type === 'movie') return false
      if (!showTv    && x.type === 'tv')    return false
      if (x.seen && !x.again && !showSeen)  return false
      return true
    })
    .sort((a, b) => {
      const ra = a.rating ?? -99
      const rb = b.rating ?? -99
      return rb - ra
    })

  const q = query.trim().toLowerCase()

  // Items in rated list matching query (for "already in ratings" display)
  const ratedMatches = q.length > 0
    ? ratedItems.filter(x => x.title.toLowerCase().includes(q))
    : []

  // Catalog items not already in ratings, matching query
  const catalogMatches = q.length > 0
    ? CATALOG_ITEMS.filter(x => !ratedIds.has(x.id) && x.title.toLowerCase().includes(q))
    : CATALOG_ITEMS.filter(x => !ratedIds.has(x.id))

  // TMDB items, filtered by query
  const catalogIdSet = new Set(CATALOG_ITEMS.map(x => x.id))
  const tmdbMatches = q.length > 0
    ? TMDB_ITEMS.filter(x => x.title.toLowerCase().includes(q))
    : TMDB_ITEMS

  // ── Bottom nav ────────────────────────────────────────────────────────────────

  const bottomNav = (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">Events</button>
      <button className="flex-1 py-3 text-xs font-medium text-violet-400">Ratings</button>
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">People</button>
      <button
        onClick={() => navigate('/')}
        className="flex-1 py-3 text-xs font-medium text-gray-600"
      >
        ← Protos
      </button>
    </nav>
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-gray-900 min-h-screen text-white"
      style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Page header */}
      <div className="px-4 pt-6 pb-3" style={{ paddingTop: 'max(1.5rem, var(--sat, 1.5rem))' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Ratings</h1>
          <button
            onClick={openSheet}
            className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-lg flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {([
              { label: 'Movies', active: showMovies, toggle: () => setShowMovies(v => !v) },
              { label: 'TV',     active: showTv,     toggle: () => setShowTv(v => !v)     },
            ] as const).map(chip => (
              <button
                key={chip.label}
                onClick={chip.toggle}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  chip.active
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowSeen(v => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showSeen
                ? 'bg-gray-600 border-gray-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}
          >
            Seen{!showSeen && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
          </button>
        </div>
      </div>

      {/* Ratings list */}
      <div className="px-4">
        {filteredRated.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            Nothing to show. Try adjusting the filters.
          </p>
        )}
        <ul className="space-y-2 pb-4">
          {filteredRated.map(item => (
            <li key={item.id} className="bg-gray-800 rounded-2xl p-3">
              <div className="flex items-start gap-2">
                {/* Type badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                  item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                }`}>
                  {item.type === 'movie' ? 'Movie' : 'TV'}
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.title} ({item.year})
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {item.seen && (
                      <span className="text-xs text-gray-600">seen</span>
                    )}
                    {item.again && (
                      <span className="text-xs text-emerald-700">again</span>
                    )}
                  </div>
                </div>

                {/* Rating badge → expands to picker on tap */}
                {editId === item.id ? (
                  <div className="flex gap-0.5 shrink-0">
                    {([-2, -1, 0, 1, 2] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => applyRating(item.id, r)}
                        className={`w-9 h-8 text-xs rounded-lg font-medium transition-colors ${
                          item.rating === r ? VSEL[r] : VUNSEL
                        }`}
                      >
                        {RLABEL[r]}
                      </button>
                    ))}
                    <button
                      onClick={() => setEditId(null)}
                      className="w-7 h-8 text-xs text-gray-600 hover:text-gray-400 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditId(item.id)}
                    title="Tap to rate"
                    className={`shrink-0 w-10 h-7 text-xs font-bold rounded-lg border transition-colors ${
                      item.rating != null ? RBADGE[item.rating] : 'bg-gray-700 text-gray-500 border-gray-600'
                    }`}
                  >
                    {item.rating != null ? RLABEL[item.rating] : '?'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Bottom Sheet ──────────────────────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/60"
          onClick={closeSheet}
        >
          <div
            className="bg-gray-800 rounded-t-3xl w-full p-5 max-h-[85vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

            {/* Sheet header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add to Ratings</h2>
              <button
                onClick={closeSheet}
                className="text-gray-400 hover:text-gray-200 text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search input */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                🔍
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setTmdbMode(false); setTmdbLoading(false) }}
                placeholder="Search titles…"
                className="w-full bg-gray-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setTmdbMode(false); setTmdbLoading(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Results area */}
            <div className="overflow-y-auto flex-1 -mx-5 px-5">

              {/* ── Local / Catalog mode ─────────────────────────────────── */}
              {!tmdbMode && (
                <>
                  {/* Already in ratings section */}
                  {ratedMatches.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                        Already in your ratings
                      </p>
                      <ul className="space-y-1">
                        {ratedMatches.map(item => (
                          <li key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-700/50">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                            }`}>
                              {item.type === 'movie' ? 'Movie' : 'TV'}
                            </span>
                            <span className="flex-1 text-sm truncate min-w-0">
                              {item.title} ({item.year})
                            </span>
                            <span className="text-xs text-gray-600 shrink-0">In ratings</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Catalog section */}
                  {catalogMatches.length > 0 ? (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                        In your catalog
                      </p>
                      <ul className="space-y-1">
                        {catalogMatches.map(item => {
                          const key = `catalog-${item.id}`
                          const added = justAdded.has(key)
                          return (
                            <li key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-700/50">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                              }`}>
                                {item.type === 'movie' ? 'Movie' : 'TV'}
                              </span>
                              <span className="flex-1 text-sm truncate min-w-0">
                                {item.title} ({item.year})
                              </span>
                              <button
                                onClick={() => addCatalogItem(item)}
                                disabled={added}
                                className={`text-xs px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                                  added
                                    ? 'bg-green-900/30 text-green-400 cursor-default'
                                    : 'bg-gray-700 text-violet-400 hover:bg-gray-600'
                                }`}
                              >
                                {added ? '✓ Added' : '+ Add'}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : (
                    q.length > 0 && ratedMatches.length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4">
                        No local results for "{query}"
                      </p>
                    )
                  )}

                  {/* TMDB search button */}
                  {q.length > 0 && (
                    <div className="py-3">
                      <div className="border-t border-gray-700 mb-3" />
                      <button
                        onClick={searchTmdb}
                        className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🌐</span>
                        <span>Search TMDB for "{query}"</span>
                      </button>
                      <div className="border-t border-gray-700 mt-3" />
                    </div>
                  )}

                  {/* Empty state when no query */}
                  {q.length === 0 && catalogMatches.length === 0 && (
                    <p className="text-sm text-gray-600 text-center py-8">
                      Type to search your catalog or TMDB
                    </p>
                  )}
                </>
              )}

              {/* ── TMDB mode ────────────────────────────────────────────── */}
              {tmdbMode && (
                <>
                  {/* Back button */}
                  <div className="mb-3">
                    <button
                      onClick={backFromTmdb}
                      className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      ← Back
                    </button>
                  </div>

                  {tmdbLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Searching TMDB…</p>
                    </div>
                  ) : (
                    <>
                      {tmdbMatches.length === 0 ? (
                        <p className="text-sm text-gray-600 text-center py-8">
                          No TMDB results for "{query}"
                        </p>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                            TMDB results for "{query}"
                          </p>
                          <ul className="space-y-1">
                            {tmdbMatches.map(item => {
                              const key = `tmdb-${item.tmdbId}`
                              const added = justAdded.has(key)
                              const inCatalog = CATALOG_ITEMS.some(c => c.title === item.title)
                              const inRatings = ratedItems.some(r => r.title === item.title)
                              return (
                                <li key={item.tmdbId} className="flex items-center gap-2 py-2 border-b border-gray-700/50">
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                    item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                                  }`}>
                                    {item.type === 'movie' ? 'Movie' : 'TV'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">
                                      {item.title} ({item.year})
                                    </p>
                                    {inCatalog && !inRatings && (
                                      <p className="text-xs text-gray-500">In catalog</p>
                                    )}
                                    {inRatings && (
                                      <p className="text-xs text-gray-600">In ratings</p>
                                    )}
                                  </div>
                                  {inRatings ? (
                                    <span className="text-xs text-gray-600 shrink-0">In ratings</span>
                                  ) : (
                                    <button
                                      onClick={() => addTmdbItem(item)}
                                      disabled={added}
                                      className={`text-xs px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                                        added
                                          ? 'bg-green-900/30 text-green-400 cursor-default'
                                          : inCatalog
                                            ? 'bg-gray-700 text-violet-400 hover:bg-gray-600'
                                            : 'bg-violet-900/40 text-violet-300 hover:bg-violet-900/60'
                                      }`}
                                    >
                                      {added
                                        ? '✓ Added'
                                        : inCatalog
                                          ? '+ Add'
                                          : 'Import & Add'}
                                    </button>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {bottomNav}
    </div>
  )
}
