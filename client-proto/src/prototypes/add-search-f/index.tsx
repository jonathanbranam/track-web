import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaType = 'movie' | 'tv'
type Rating = -2 | -1 | 0 | 1 | 2 | null

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

// ── Hard-coded data ───────────────────────────────────────────────────────────

const INITIAL_RATED_ITEMS: RatedItem[] = [
  { id: 1,  type: 'movie', title: 'Interstellar',   year: 2014, rating:  2, seen: true,  again: true  },
  { id: 2,  type: 'movie', title: 'The Shining',    year: 1980, rating:  2, seen: false, again: false },
  { id: 3,  type: 'tv',    title: 'Severance',      year: 2022, rating:  2, seen: false, again: false },
  { id: 4,  type: 'tv',    title: 'The Last of Us', year: 2023, rating:  1, seen: false, again: false },
  { id: 5,  type: 'tv',    title: 'The Bear',       year: 2022, rating:  1, seen: true,  again: true  },
  { id: 6,  type: 'movie', title: 'Parasite',       year: 2019, rating:  1, seen: true,  again: false },
  { id: 7,  type: 'movie', title: 'Dune: Part Two', year: 2024, rating:  0, seen: false, again: false },
  { id: 8,  type: 'movie', title: 'Alien: Romulus', year: 2024, rating: null, seen: false, again: false },
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

// ── Display helpers ───────────────────────────────────────────────────────────

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

export default function AddSearchFPrototype() {
  const navigate = useNavigate()

  // Ratings list state
  const [ratedItems, setRatedItems] = useState<RatedItem[]>(INITIAL_RATED_ITEMS)
  const [showMovies, setShowMovies] = useState(true)
  const [showTv, setShowTv]         = useState(true)
  const [showSeen, setShowSeen]     = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Search panel state
  const [showPanel, setShowPanel]             = useState(false)
  const [query, setQuery]                     = useState('')
  const [tmdbResultsLoaded, setTmdbResultsLoaded] = useState(false)
  const [tmdbLoading, setTmdbLoading]         = useState(false)
  const [importingId, setImportingId]         = useState<number | null>(null)

  const nextIdRef = useRef(Math.max(...INITIAL_RATED_ITEMS.map(x => x.id)) + 100)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function applyRating(id: number, r: Rating) {
    setRatedItems(prev => prev.map(x => x.id === id ? { ...x, rating: r } : x))
    setExpandedId(null)
  }

  function triggerTmdbSearch() {
    if (query.trim().length === 0) return
    setTmdbLoading(true)
    setTmdbResultsLoaded(false)
    setTimeout(() => {
      setTmdbLoading(false)
      setTmdbResultsLoaded(true)
    }, 700)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (value.trim().length === 0) {
      setTmdbResultsLoaded(false)
      setTmdbLoading(false)
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      triggerTmdbSearch()
    }
  }

  function closePanel() {
    setShowPanel(false)
    setQuery('')
    setTmdbResultsLoaded(false)
    setTmdbLoading(false)
  }

  // Add catalog item to ratings immediately (no import delay)
  function addFromCatalog(item: CatalogItem) {
    const newItem: RatedItem = {
      id: nextIdRef.current++,
      type: item.type,
      title: item.title,
      year: item.year,
      rating: null,
      seen: false,
      again: false,
    }
    setRatedItems(prev => [...prev, newItem])
  }

  // Add TMDB item — simulate background import with 800ms delay
  function addFromTmdb(item: TmdbItem) {
    setImportingId(item.tmdbId)
    setTimeout(() => {
      const newItem: RatedItem = {
        id: nextIdRef.current++,
        type: item.type,
        title: item.title,
        year: item.year,
        rating: null,
        seen: false,
        again: false,
      }
      setRatedItems(prev => [...prev, newItem])
      setImportingId(null)
    }, 800)
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const hiddenCount = ratedItems.filter(x => x.seen && !x.again).length

  const filteredItems = [...ratedItems]
    .filter(x => {
      if (!showMovies && x.type === 'movie') return false
      if (!showTv    && x.type === 'tv')    return false
      if (x.seen && !x.again && !showSeen)  return false
      return true
    })
    .sort((a, b) => (b.rating ?? -99) - (a.rating ?? -99))

  const q = query.trim().toLowerCase()

  const ratedTitles = new Set(ratedItems.map(x => x.title.toLowerCase()))
  const catalogTitles = new Set(CATALOG_ITEMS.map(x => x.title.toLowerCase()))

  // Result sections — only built when query has text
  const matchedCatalog: CatalogItem[] = q
    ? CATALOG_ITEMS.filter(x => x.title.toLowerCase().includes(q) && !ratedTitles.has(x.title.toLowerCase()))
    : []

  const matchedRated: RatedItem[] = q
    ? ratedItems.filter(x => x.title.toLowerCase().includes(q))
    : []

  // TMDB hits: deduplicate titles already in catalog (rated already filtered by matchedRated display)
  const matchedTmdb: TmdbItem[] = (q && tmdbResultsLoaded)
    ? TMDB_ITEMS.filter(x =>
        x.title.toLowerCase().includes(q) &&
        !catalogTitles.has(x.title.toLowerCase()) &&
        !ratedTitles.has(x.title.toLowerCase())
      )
    : []

  const hasLocalResults = matchedCatalog.length > 0 || matchedRated.length > 0

  // ── Bottom nav ────────────────────────────────────────────────────────────────

  const bottomNav = (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button className="flex-1 py-3 text-xs font-medium text-violet-400">Ratings</button>
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">Events</button>
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">People</button>
      <button
        onClick={() => navigate('/')}
        className="flex-1 py-3 text-xs font-medium text-gray-600"
      >
        ← Protos
      </button>
    </nav>
  )

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-gray-900 min-h-screen text-white"
      style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div style={{ paddingTop: 'var(--sat, 0px)' }}>

        {/* Page header */}
        <div className="flex items-center justify-between px-4 pt-6 mb-1">
          <h1 className="text-xl font-bold">Ratings</h1>
          <button
            onClick={() => { if (showPanel) { closePanel() } else { setShowPanel(true) } }}
            className={`text-sm px-3 py-1.5 rounded-xl font-medium transition-colors ${
              showPanel
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            }`}
          >
            {showPanel ? '✕ Cancel' : '+ Add'}
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 mb-3 mt-3">
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

        {/* Search panel */}
        {showPanel && (
          <div className="mx-4 mb-3 bg-gray-800 rounded-2xl overflow-hidden">
            {/* Search input row */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700/50">
              <span className="text-gray-500 text-base shrink-0">🔍</span>
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search titles…"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none min-w-0"
                autoFocus
              />
              {query.length > 0 && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="text-gray-500 hover:text-gray-300 text-sm leading-none shrink-0"
                >
                  ✕
                </button>
              )}
              <button
                onClick={triggerTmdbSearch}
                disabled={query.trim().length === 0 || tmdbLoading}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  query.trim().length === 0 || tmdbLoading
                    ? 'bg-gray-700 text-gray-600 cursor-not-allowed'
                    : 'bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900/90 border border-indigo-800'
                }`}
              >
                {tmdbLoading ? '…' : 'Search TMDB'}
              </button>
            </div>

            {/* Panel body */}
            <div className="px-3 py-2.5">
              {q.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-3">
                  Type to search, then press Enter or "Search TMDB"
                </p>
              ) : (
                <div>
                  {/* TMDB loading indicator */}
                  {tmdbLoading && (
                    <p className="text-xs text-gray-500 text-center py-2 mb-2">
                      Searching TMDB…
                    </p>
                  )}

                  {/* Unified result list */}
                  {(hasLocalResults || matchedTmdb.length > 0) ? (
                    <ul className="space-y-1.5">

                      {/* Catalog (unrated local) hits — first */}
                      {matchedCatalog.map(item => {
                        const isNowRated = ratedTitles.has(item.title.toLowerCase())
                        return (
                          <li
                            key={`catalog-${item.id}`}
                            className="flex items-center gap-2 bg-gray-700/40 rounded-xl px-3 py-2"
                          >
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                            }`}>
                              {item.type === 'movie' ? 'Movie' : 'TV'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.title} ({item.year})
                              </p>
                            </div>
                            {isNowRated ? (
                              <span className="text-xs text-gray-600 shrink-0">Added</span>
                            ) : (
                              <button
                                onClick={() => addFromCatalog(item)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-gray-600 text-violet-300 hover:bg-gray-500 shrink-0 transition-colors"
                              >
                                Rate
                              </button>
                            )}
                          </li>
                        )
                      })}

                      {/* Already-rated hits — muted, not actionable */}
                      {matchedRated.map(item => (
                        <li
                          key={`rated-${item.id}`}
                          className="flex items-center gap-2 bg-gray-700/20 rounded-xl px-3 py-2 opacity-50"
                        >
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                          }`}>
                            {item.type === 'movie' ? 'Movie' : 'TV'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.title} ({item.year})
                            </p>
                          </div>
                          <span className={`shrink-0 w-10 h-7 text-xs font-bold rounded-lg border flex items-center justify-center ${
                            item.rating != null ? RBADGE[item.rating] : 'bg-gray-700 text-gray-500 border-gray-600'
                          }`}>
                            {item.rating != null ? RLABEL[item.rating] : '?'}
                          </span>
                        </li>
                      ))}

                      {/* Subtle divider before TMDB results */}
                      {tmdbResultsLoaded && matchedTmdb.length > 0 && hasLocalResults && (
                        <li className="flex items-center gap-2 py-1 select-none" aria-hidden="true">
                          <div className="h-px flex-1 bg-gray-700" />
                          <span className="text-xs text-gray-600 shrink-0">More results</span>
                          <div className="h-px flex-1 bg-gray-700" />
                        </li>
                      )}

                      {/* TMDB hits — visually identical to catalog items */}
                      {matchedTmdb.map(item => {
                        const isImporting = importingId === item.tmdbId
                        const isNowRated = ratedTitles.has(item.title.toLowerCase())
                        return (
                          <li
                            key={`tmdb-${item.tmdbId}`}
                            className="flex items-center gap-2 bg-gray-700/40 rounded-xl px-3 py-2"
                          >
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                            }`}>
                              {item.type === 'movie' ? 'Movie' : 'TV'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.title} ({item.year})
                              </p>
                            </div>
                            {isNowRated ? (
                              <span className="text-xs text-gray-600 shrink-0">Added</span>
                            ) : (
                              <button
                                onClick={() => { if (!isImporting) addFromTmdb(item) }}
                                disabled={isImporting}
                                className={`text-xs px-2.5 py-1 rounded-lg shrink-0 transition-colors min-w-[44px] text-center ${
                                  isImporting
                                    ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-600 text-violet-300 hover:bg-gray-500'
                                }`}
                              >
                                {isImporting ? (
                                  <span className="inline-block animate-spin leading-none">⏳</span>
                                ) : (
                                  'Rate'
                                )}
                              </button>
                            )}
                          </li>
                        )
                      })}

                    </ul>
                  ) : tmdbResultsLoaded && matchedTmdb.length === 0 && !tmdbLoading ? (
                    <p className="text-xs text-gray-600 text-center py-3">No results for "{query}"</p>
                  ) : !tmdbLoading ? (
                    <p className="text-xs text-gray-600 text-center py-3">No local results for "{query}"</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Divider when panel is open */}
        {showPanel && <div className="h-px bg-gray-800 mb-3 mx-4" />}

        {/* Ratings list */}
        <div className="px-4">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              Nothing to show. Try adjusting the filters.
            </p>
          ) : (
            <ul className="space-y-2 pb-4">
              {filteredItems.map(item => (
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
                        {item.title}{item.year ? ` (${item.year})` : ''}
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

                    {/* Rating badge → expands to inline picker on tap */}
                    {expandedId === item.id ? (
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
                          onClick={() => setExpandedId(null)}
                          className="w-7 h-8 text-xs text-gray-600 hover:text-gray-400 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedId(item.id)}
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
          )}
        </div>
      </div>

      {bottomNav}
    </div>
  )
}
